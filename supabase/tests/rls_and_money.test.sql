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
  assert (select count(*) from public.public_needs where is_minor and institution_label not in ('Their school', 'The hospital')) = 0, 'minor institution name leaked';
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

\echo 'ALL DATABASE TESTS PASSED'
