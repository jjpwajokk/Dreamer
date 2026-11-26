-- Behaviour tests for the security rules and money functions.
-- Run with scripts/test-db.sh. Every block raises if an expectation fails.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'amina.mum@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'stranger@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'admin@example.com');
update public.profiles set role = 'admin' where email = 'admin@example.com';

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
  execute 'set role authenticated';
end $$;

-- 1. Profiles were created by the signup trigger
do $$ begin
  assert (select count(*) from public.profiles) = 3, 'profiles not created';
end $$;

-- 2. A beneficiary creates a draft need and cannot fake money or status
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.institutions (id, name, type, state, account_number, bank_code)
  values ('10000000-0000-0000-0000-000000000001', 'Test School', 'school', 'Plateau', '0123456789', '058');
insert into public.needs (id, slug, category, title, story, my_words, display_name, state, amount_kobo, raised_kobo, institution_id, status)
  values ('20000000-0000-0000-0000-000000000001', 'test-need', 'education', 'School fees test', 'short', 'words', 'Amina', 'Plateau', 18500000, 999999, '10000000-0000-0000-0000-000000000001', 'draft');
do $$ begin
  assert (select raised_kobo from public.needs where slug = 'test-need') = 0, 'raised_kobo was writable on insert';
  assert (select created_by from public.needs where slug = 'test-need') = '00000000-0000-0000-0000-00000000000a', 'created_by not forced';
end $$;

do $$ begin
  begin
    update public.needs set status = 'live' where slug = 'test-need';
    raise exception 'FAIL: beneficiary published own need';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    update public.needs set raised_kobo = 18500000 where slug = 'test-need';
    raise exception 'FAIL: beneficiary changed raised_kobo';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    update public.needs set status = 'submitted' where slug = 'test-need';
    raise exception 'FAIL: submitted without consent';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    update public.institutions set verified_at = now() where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: beneficiary verified own institution';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    update public.profiles set role = 'admin' where user_id = auth.uid();
    raise exception 'FAIL: user made themselves admin';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

update public.needs set consent_at = now(), story = 'Amina is in SS2 and her mother fell behind on fees after a hard season.' where slug = 'test-need';
update public.needs set status = 'submitted' where slug = 'test-need';
do $$ begin
  assert (select status from public.needs where slug = 'test-need') = 'submitted', 'submit failed';
  assert (select submitted_at from public.needs where slug = 'test-need') is not null, 'submitted_at not set';
end $$;
do $$ begin
  begin
    update public.needs set title = 'Edited after submit' where slug = 'test-need';
    raise exception 'FAIL: edited a submitted need';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
reset role;

-- 3. Strangers and the public cannot see private rows
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select count(*) from public.needs where slug = 'test-need') = 0, 'stranger can read a private need';
  assert (select count(*) from public.institutions) = 0, 'stranger can read institutions (bank details)';
  assert (select count(*) from public.contributions) = 0, 'stranger can read contributions';
end $$;
reset role;

set role anon;
do $$ begin
  assert (select count(*) from public.public_needs where slug = 'test-need') = 0, 'submitted need is public';
  assert (select count(*) from public.public_needs) = 13, 'expected 13 public seed needs';
  assert (select count(*) from public.public_needs where status = 'submitted') = 0, 'submitted needs leaked';
  assert (select count(*) from public.public_needs where is_minor and institution_label not in ('their school', 'the hospital')) = 0, 'minor institution name leaked';
end $$;
do $$ begin
  begin
    perform public.record_paystack_charge('x', 1);
    raise exception 'FAIL: anon can call record_paystack_charge';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- 4. Admin can read everything and publish
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert (select count(*) from public.needs) = 16, 'admin cannot see all needs';
end $$;
update public.needs set status = 'live', published_at = now(), verified_at = now(), expires_at = now() + interval '30 days' where slug = 'test-need';
reset role;

-- 5. Webhook: idempotent, flips to funded at goal
set role service_role;
insert into public.contributions (need_id, giver_email, amount_kobo, tip_kobo, paystack_reference)
  values ('20000000-0000-0000-0000-000000000001', 'tunde@example.com', 10000000, 50000, 'ref-1'),
         ('20000000-0000-0000-0000-000000000001', 'tunde@example.com', 8500000, 0, 'ref-2'),
         ('20000000-0000-0000-0000-000000000001', 'cheat@example.com', 1000000, 0, 'ref-3');
do $$
declare r jsonb;
begin
  r := public.record_paystack_charge('ref-1', 10050000, 'card');
  assert r->>'result' = 'ok', 'first charge not ok: ' || r::text;
  r := public.record_paystack_charge('ref-1', 10050000, 'card');
  assert r->>'result' = 'duplicate', 'duplicate not detected';
  assert (select raised_kobo from public.needs where slug = 'test-need') = 10000000, 'tip or duplicate counted toward raised';
  r := public.record_paystack_charge('ref-3', 500000, 'card');
  assert r->>'result' = 'amount_mismatch', 'underpayment accepted';
  r := public.record_paystack_charge('ref-2', 8500000, 'bank_transfer');
  assert (r->>'funded')::boolean, 'need did not flip to funded';
  assert (select status from public.needs where slug = 'test-need') = 'funded', 'status not funded';
  r := public.record_paystack_charge('nope', 1);
  assert r->>'result' = 'unknown_reference', 'unknown reference not reported';
end $$;

-- 6a. Escrow: no payout while the need is unverified
do $$ begin
  begin
    insert into public.payouts (need_id, institution_id, amount_kobo, reference)
      values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 18500000, 'payout-escrow');
    raise exception 'FAIL: payout allowed before verification';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
update public.needs set verified_at = now() where id = '20000000-0000-0000-0000-000000000001';
update public.institutions set verified_at = now() where id = '10000000-0000-0000-0000-000000000001';

-- 6. Payout: transfer success marks paid_out; duplicate ignored
insert into public.payouts (need_id, institution_id, amount_kobo, reference)
  values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 18500000, 'payout-1');
do $$
declare r jsonb;
begin
  r := public.record_transfer_result('payout-1', 'success', 'TRF_1');
  assert r->>'result' = 'ok', 'transfer not ok';
  assert (select status from public.needs where slug = 'test-need') = 'paid_out', 'need not paid_out';
  r := public.record_transfer_result('payout-1', 'success', 'TRF_1');
  assert r->>'result' = 'duplicate', 'transfer duplicate not detected';
  assert (select count(*) from public.audit_log where action like 'contribution.%' or action like 'payout.%') = 4, 'audit log incomplete';
end $$;
reset role;

-- 7. Updates: only the beneficiary of a funded need may post, and they start pending
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  begin
    insert into public.updates (need_id, body) values ('20000000-0000-0000-0000-000000000001', 'I am not Amina but here is an update');
    raise exception 'FAIL: stranger posted an update';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.updates (need_id, body, milestone, status) values ('20000000-0000-0000-0000-000000000001', 'Amina is back in class this week!', 'back_in_class', 'approved');
do $$ begin
  assert (select status from public.updates where need_id = '20000000-0000-0000-0000-000000000001') = 'pending', 'update skipped review';
end $$;
reset role;
set role anon;
do $$ begin
  assert (select count(*) from public.public_updates where need_id = '20000000-0000-0000-0000-000000000001') = 0, 'pending update is public';
end $$;
reset role;

-- 8. Expiry
update public.needs set expires_at = now() - interval '1 day' where slug like 'damilola-%';
set role service_role;
do $$ begin
  assert public.expire_needs() = 1, 'expiry did not run';
end $$;
reset role;

-- 9. Ledger: every naira in is matched by a payout, or still held for a live/funded need
do $$ begin
  assert (select sum(amount_kobo) from public.contributions where status = 'success')
       = (select sum(raised_kobo) from public.needs), 'ledger mismatch: contributions vs raised';
end $$;

-- 10. Fees: the charge must cover amount + fee; only amount counts toward the need
set role service_role;
insert into public.contributions (need_id, giver_email, amount_kobo, fee_kobo, fee_mode, paystack_reference)
  select id, 'fee@example.com', 950000, 50000, 'deducted', 'ref-fee' from public.needs where status = 'live' order by published_at limit 1;
do $$
declare r jsonb; before bigint; nid uuid;
begin
  select need_id into nid from public.contributions where paystack_reference = 'ref-fee';
  select raised_kobo into before from public.needs where id = nid;
  r := public.record_paystack_charge('ref-fee', 999999);
  assert r->>'result' = 'amount_mismatch', 'underpaid fee not caught';
  update public.contributions set status = 'pending' where paystack_reference = 'ref-fee';
  r := public.record_paystack_charge('ref-fee', 1000000);
  assert r->>'result' = 'ok', 'fee gift not recorded';
  assert (select raised_kobo from public.needs where id = nid) = before + 950000, 'fee counted toward the need';
end $$;

-- 11. New sectors are accepted, with their caps
do $$ begin
  begin
    insert into public.needs (slug, category, title, display_name, state, amount_kobo)
      values ('cap-test', 'emergency', 'Too big', 'Ada', 'Lagos', 30000000);
    raise exception 'FAIL: emergency cap not enforced';
  exception when check_violation then null;
  end;
  insert into public.institutions (name, type) values ('Mama Put Supplies', 'supplier');
end $$;

-- 12. Expired need: redirect needs consent, then moves the gift; refunds are recorded
insert into public.contributions (need_id, giver_email, amount_kobo, paystack_reference)
  select id, 'exp@example.com', 300000, 'ref-exp' from public.needs where status = 'expired' limit 1;
insert into public.contributions (need_id, giver_email, amount_kobo, paystack_reference)
  select id, 'exp2@example.com', 200000, 'ref-exp2' from public.needs where status = 'expired' limit 1;
select public.record_paystack_charge('ref-exp', 300000), public.record_paystack_charge('ref-exp2', 200000);
do $$
declare r jsonb; c uuid;
begin
  select id into c from public.contributions where paystack_reference = 'ref-exp2';
  r := public.record_refund(c);
  assert r->>'result' = 'ok', 'refund not recorded';
  assert (select status from public.contributions where id = c) = 'refunded', 'refund status';
  r := public.record_refund(c);
  assert r->>'result' = 'not_refundable', 'double refund allowed';
end $$;
do $$
declare r jsonb; c uuid; target uuid; target_before bigint;
begin
  select c2.id into c from public.contributions c2 join public.needs n on n.id = c2.need_id
    where n.status = 'expired' and c2.status = 'success' and c2.paystack_reference = 'ref-exp';
  if c is null then
    raise notice 'no expired gift in seed; skipping redirect test';
    return;
  end if;
  select id, raised_kobo into target, target_before from public.needs
    where status = 'live' and amount_kobo - raised_kobo >= (select amount_kobo from public.contributions where id = c)
    order by published_at limit 1;
  r := public.redirect_contribution(c, target);
  assert r->>'result' = 'no_consent', 'redirect without consent';
  update public.contributions set expiry_choice = 'redirect' where id = c;
  r := public.redirect_contribution(c, target);
  assert r->>'result' = 'ok', 'redirect failed: ' || r::text;
  assert (select status from public.contributions where id = c) = 'redirected', 'original not marked';
  assert (select raised_kobo from public.needs where id = target) = target_before + (select amount_kobo from public.contributions where id = c), 'target not credited';
end $$;

-- 13. Rate limit
do $$ begin
  assert public.hit_rate_limit('t', 2, 60), 'first hit blocked';
  assert public.hit_rate_limit('t', 2, 60), 'second hit blocked';
  assert not public.hit_rate_limit('t', 2, 60), 'third hit allowed';
end $$;
reset role;

-- 14. Ledger again, counting only gifts that are still held
do $$ begin
  assert (select sum(amount_kobo) from public.contributions where status = 'success')
       = (select sum(raised_kobo) from public.needs), 'ledger mismatch after fees/redirects';
end $$;


-- 15. Escrow: an unverified need past its deadline is closed and every gift marked for refund
reset role;
insert into public.needs (id, slug, category, title, story, my_words, display_name, state, amount_kobo, institution_id, status, published_at, escrow_deadline, created_by, beneficiary_id)
  values ('20000000-0000-0000-0000-0000000000e1', 'escrow-need', 'education', 'Escrow test need', repeat('x', 50), 'words', 'Bola', 'Lagos', 5000000,
          '10000000-0000-0000-0000-000000000001', 'live', now() - interval '31 days', now() - interval '1 day',
          '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a');
insert into public.contributions (need_id, giver_email, amount_kobo, fee_kobo, paystack_reference)
  values ('20000000-0000-0000-0000-0000000000e1', 'g@example.com', 200000, 10000, 'ref-esc');
do $$
declare r jsonb; n integer;
begin
  r := public.record_paystack_charge('ref-esc', 210000, 'card');
  assert r->>'result' = 'ok', 'escrow charge not ok';
  n := public.close_unverified_needs();
  assert n >= 1, 'unverified need not closed';
  assert (select status || '/' || expiry_reason from public.needs where slug = 'escrow-need') = 'expired/unverified', 'escrow need not marked';
  assert (select expiry_choice from public.contributions where paystack_reference = 'ref-esc') = 'refund', 'gift not marked for refund';
  begin
    update public.contributions set status = 'redirected' where paystack_reference = 'ref-esc';
    raise exception 'FAIL: unverified gift redirected';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  r := public.record_refund((select id from public.contributions where paystack_reference = 'ref-esc'));
  assert r->>'result' = 'ok', 'escrow refund failed';
end $$;

-- 16. Profiles: members can't verify themselves or lift a ban
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  update public.profiles set occupation = 'Teacher', workplace = 'Jos' where user_id = auth.uid();
  begin
    update public.profiles set kyc_status = 'verified' where user_id = auth.uid();
    raise exception 'FAIL: self-verified KYC';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- 17. Organisations: owners can't verify themselves; org needs only pay the org account
insert into public.organisations (id, slug, owner_id, name, org_type, status, verified_at)
  values ('30000000-0000-0000-0000-000000000001', 'hope-home', '00000000-0000-0000-0000-00000000000b', 'Hope Children''s Home', 'orphanage', 'verified', now());
do $$ begin
  assert (select status from public.organisations where slug = 'hope-home') = 'draft', 'org status not forced to draft';
  assert (select verified_at from public.organisations where slug = 'hope-home') is null, 'org self-verified';
  begin
    update public.organisations set status = 'verified' where slug = 'hope-home';
    raise exception 'FAIL: org self-verified on update';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
reset role;
update public.organisations set status = 'verified', verified_at = now() where slug = 'hope-home';
insert into public.institutions (id, name, type, org_id, account_number, bank_code, verified_at)
  values ('10000000-0000-0000-0000-0000000000a1', 'Hope Children''s Home', 'organisation', '30000000-0000-0000-0000-000000000001', '0123456780', '058', now());
insert into public.needs (id, slug, category, title, story, my_words, display_name, state, amount_kobo, institution_id, status, org_id, verified_at, created_by, beneficiary_id)
  values ('20000000-0000-0000-0000-0000000000a1', 'hope-need', 'education', 'Term fees for 12 children', repeat('x', 50), 'words', 'Hope', 'Plateau', 5000000,
          '10000000-0000-0000-0000-000000000001', 'funded', '30000000-0000-0000-0000-000000000001', now(),
          '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b');
do $$ begin
  begin
    insert into public.payouts (need_id, institution_id, amount_kobo, reference)
      values ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', 100000, 'po-org-wrong');
    raise exception 'FAIL: org need paid to a non-org account';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    update public.needs set payout_to = 'personal' where slug = 'hope-need';
    raise exception 'FAIL: org need switched to personal payout';
  exception when check_violation then null;
  end;
end $$;

-- 18. Photos: at most 5 per need, 10 per organisation
do $$
declare i integer;
begin
  for i in 1..5 loop
    insert into public.media (owner_id, need_id, purpose, storage_path) values ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'need', 'p' || i);
  end loop;
  begin
    insert into public.media (owner_id, need_id, purpose, storage_path) values ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'need', 'p6');
    raise exception 'FAIL: sixth need photo allowed';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  for i in 1..10 loop
    insert into public.media (owner_id, org_id, purpose, storage_path) values ('00000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000001', 'org', 'o' || i);
  end loop;
  begin
    insert into public.media (owner_id, org_id, purpose, storage_path) values ('00000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000001', 'org', 'o11');
    raise exception 'FAIL: eleventh org photo allowed';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- 19. Socials: an object only, valid visibility; uncapped 5% fee; profile-level requests; urgency
do $$ begin
  update public.profiles set socials = '{"instagram":"https://instagram.com/ada"}', socials_visibility = 'on_request'
    where user_id = '00000000-0000-0000-0000-00000000000a';
  begin
    update public.profiles set socials = '["x"]' where user_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: socials accepted a non-object';
  exception when check_violation then null;
  end;
  begin
    update public.profiles set socials_visibility = 'everyone' where user_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: unknown socials visibility accepted';
  exception when check_violation then null;
  end;
  -- A ₦1,000,000 gift carries a ₦50,000 fee now that there's no cap.
  insert into public.contributions (need_id, giver_email, amount_kobo, fee_kobo, paystack_reference)
    values ('20000000-0000-0000-0000-000000000001', 'big@example.com', 100000000, 5000000, 'ref-nocap');
  begin
    insert into public.contributions (need_id, giver_email, amount_kobo, fee_kobo, paystack_reference)
      values ('20000000-0000-0000-0000-000000000001', 'odd@example.com', 100000, 200000, 'ref-badfee');
    raise exception 'FAIL: fee larger than the gift accepted';
  exception when check_violation then null;
  end;
  insert into public.media_requests (requester_id, owner_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');
  begin
    insert into public.media_requests (requester_id, owner_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');
    raise exception 'FAIL: duplicate profile request';
  exception when unique_violation then null;
  end;
  update public.needs set is_urgent = true, deadline = current_date + 5 where id = '20000000-0000-0000-0000-000000000001';
  assert exists (select 1 from public.public_needs where is_urgent and deadline is not null) or
         not exists (select 1 from public.public_needs where id = '20000000-0000-0000-0000-000000000001'),
         'urgency visible on public needs';
end $$;

\echo 'ALL DATABASE TESTS PASSED'
