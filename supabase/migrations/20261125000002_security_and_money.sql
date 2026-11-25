-- Dreamer: row level security, public views, money functions, storage

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.needs enable row level security;
alter table public.need_documents enable row level security;
alter table public.verification_checks enable row level security;
alter table public.contributions enable row level security;
alter table public.payouts enable row level security;
alter table public.updates enable row level security;
alter table public.saved_needs enable row level security;
alter table public.swipes enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "profiles: update own or admin" on public.profiles
  for update to authenticated using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- institutions (bank details: never public)
create policy "institutions: read own or admin" on public.institutions
  for select to authenticated using (created_by = auth.uid() or public.is_admin());
create policy "institutions: create" on public.institutions
  for insert to authenticated with check (true);
create policy "institutions: update own unverified or admin" on public.institutions
  for update to authenticated
  using ((created_by = auth.uid() and verified_at is null) or public.is_admin())
  with check ((created_by = auth.uid() and verified_at is null) or public.is_admin());

-- needs (public reads go through the public_needs view)
create policy "needs: read own or admin" on public.needs
  for select to authenticated
  using (beneficiary_id = auth.uid() or created_by = auth.uid() or public.is_admin());
create policy "needs: create draft" on public.needs
  for insert to authenticated with check (status = 'draft');
create policy "needs: update own or admin" on public.needs
  for update to authenticated
  using (beneficiary_id = auth.uid() or created_by = auth.uid() or public.is_admin())
  with check (beneficiary_id = auth.uid() or created_by = auth.uid() or public.is_admin());
create policy "needs: delete own draft" on public.needs
  for delete to authenticated
  using ((created_by = auth.uid() and status = 'draft') or public.is_admin());

-- need_documents
create policy "documents: read own or admin" on public.need_documents
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.needs n where n.id = need_id
        and (n.beneficiary_id = auth.uid() or n.created_by = auth.uid())
    )
  );
create policy "documents: add to own editable need" on public.need_documents
  for insert to authenticated with check (
    public.is_admin() or exists (
      select 1 from public.needs n where n.id = need_id
        and (n.beneficiary_id = auth.uid() or n.created_by = auth.uid())
        and n.status in ('draft', 'needs_info')
    )
  );
create policy "documents: remove from own editable need" on public.need_documents
  for delete to authenticated using (
    public.is_admin() or exists (
      select 1 from public.needs n where n.id = need_id
        and (n.beneficiary_id = auth.uid() or n.created_by = auth.uid())
        and n.status in ('draft', 'needs_info')
    )
  );

-- verification checks, payouts, audit log: admins only
create policy "checks: admin" on public.verification_checks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "payouts: admin read" on public.payouts
  for select to authenticated using (public.is_admin());
create policy "audit: admin read" on public.audit_log
  for select to authenticated using (public.is_admin());

-- contributions: written only by the server (service role) and the webhook
create policy "contributions: read own or admin" on public.contributions
  for select to authenticated using (giver_id = auth.uid() or public.is_admin());

-- updates
create policy "updates: read approved, own, or admin" on public.updates
  for select to anon, authenticated
  using (status = 'approved' or author_id = auth.uid() or public.is_admin());
create policy "updates: post on own funded need" on public.updates
  for insert to authenticated with check (true);

-- saved needs
create policy "saved: own" on public.saved_needs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- swipes
create policy "swipes: own" on public.swipes
  for select to authenticated using (user_id = auth.uid());
create policy "swipes: add own" on public.swipes
  for insert to authenticated with check (user_id = auth.uid());

-- reports: anyone may report; only admins read
create policy "reports: anyone can report" on public.reports
  for insert to anon, authenticated with check (status = 'open');
create policy "reports: admin read" on public.reports
  for select to authenticated using (public.is_admin());
create policy "reports: admin update" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Public views: what anyone on the internet can see.
-- No documents, phone numbers, bank details or full names. For minors the
-- school or hospital name is hidden too.
-- ---------------------------------------------------------------------------

create or replace view public.public_needs as
select
  n.id,
  n.slug,
  n.category,
  n.title,
  n.story,
  n.my_words,
  n.display_name,
  n.state,
  n.city,
  n.is_minor,
  n.cover_photo_path,
  n.amount_kobo,
  n.raised_kobo,
  greatest(n.amount_kobo - n.raised_kobo, 0) as remaining_kobo,
  n.status,
  n.verified_at,
  n.verification_note,
  n.published_at,
  n.funded_at,
  n.paid_out_at,
  n.completed_at,
  n.expires_at,
  i.type as institution_type,
  case
    when n.is_minor then case i.type when 'hospital' then 'the hospital' else 'their school' end
    else i.name
  end as institution_label,
  (select count(*) from public.contributions c where c.need_id = n.id and c.status = 'success')::int as giver_count,
  (select max(p.completed_at) from public.payouts p where p.need_id = n.id and p.status = 'success') as payout_completed_at,
  (select coalesce(sum(p.amount_kobo), 0) from public.payouts p where p.need_id = n.id and p.status = 'success')::bigint as paid_out_kobo
from public.needs n
left join public.institutions i on i.id = n.institution_id
where n.status in ('live', 'funded', 'paid_out', 'completed');

create or replace view public.public_need_checks as
select vc.need_id, vc."check", vc.updated_at as checked_at
from public.verification_checks vc
join public.needs n on n.id = vc.need_id
where vc.passed and n.status in ('live', 'funded', 'paid_out', 'completed');

create or replace view public.public_updates as
select u.id, u.need_id, u.body, u.milestone, u.photo_paths, coalesce(u.approved_at, u.created_at) as published_at
from public.updates u
join public.needs n on n.id = u.need_id
where u.status = 'approved' and n.status in ('live', 'funded', 'paid_out', 'completed');

grant select on public.public_needs, public.public_need_checks, public.public_updates to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Money functions. Only callable by the server (service role).
-- ---------------------------------------------------------------------------

-- Called from the Paystack webhook (charge.success) after the signature is
-- verified. Runs in one transaction and is idempotent on the reference:
-- a contribution already marked success is never counted twice.
create or replace function public.record_paystack_charge(
  p_reference text,
  p_amount_paid_kobo bigint,
  p_channel text default null,
  p_paid_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.contributions%rowtype;
  n public.needs%rowtype;
  v_now_funded boolean := false;
begin
  select * into c from public.contributions where paystack_reference = p_reference for update;
  if not found then
    return jsonb_build_object('result', 'unknown_reference');
  end if;
  if c.status = 'success' then
    return jsonb_build_object('result', 'duplicate', 'need_id', c.need_id);
  end if;
  if p_amount_paid_kobo < c.amount_kobo + c.tip_kobo then
    update public.contributions set status = 'failed' where id = c.id;
    insert into public.audit_log (action, entity, entity_id, after)
      values ('contribution.amount_mismatch', 'contribution', c.id,
              jsonb_build_object('expected', c.amount_kobo + c.tip_kobo, 'paid', p_amount_paid_kobo));
    return jsonb_build_object('result', 'amount_mismatch', 'need_id', c.need_id);
  end if;

  update public.contributions
    set status = 'success', paid_at = coalesce(p_paid_at, now()), channel = p_channel
    where id = c.id;

  select * into n from public.needs where id = c.need_id for update;

  v_now_funded := n.status = 'live' and n.raised_kobo + c.amount_kobo >= n.amount_kobo;

  update public.needs
    set raised_kobo = raised_kobo + c.amount_kobo,
        status = case when v_now_funded then 'funded' else status end,
        funded_at = case when v_now_funded then now() else funded_at end
    where id = n.id;

  insert into public.audit_log (action, entity, entity_id, before, after)
    values ('contribution.success', 'contribution', c.id,
            jsonb_build_object('status', c.status, 'need_raised_kobo', n.raised_kobo),
            jsonb_build_object('status', 'success', 'amount_kobo', c.amount_kobo, 'tip_kobo', c.tip_kobo,
                               'need_raised_kobo', n.raised_kobo + c.amount_kobo, 'need_funded', v_now_funded));

  return jsonb_build_object('result', 'ok', 'need_id', n.id, 'funded', v_now_funded);
end;
$$;

-- Called from the Paystack webhook (transfer.success / failed / reversed).
create or replace function public.record_transfer_result(
  p_reference text,
  p_status text,
  p_transfer_code text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.payouts%rowtype;
begin
  if p_status not in ('success', 'failed', 'reversed') then
    raise exception 'Unknown transfer status %', p_status;
  end if;
  select * into p from public.payouts where reference = p_reference for update;
  if not found then
    return jsonb_build_object('result', 'unknown_reference');
  end if;
  if p.status = p_status then
    return jsonb_build_object('result', 'duplicate', 'need_id', p.need_id);
  end if;

  update public.payouts
    set status = p_status,
        paystack_transfer_code = coalesce(p_transfer_code, paystack_transfer_code),
        failure_reason = case when p_status = 'success' then null else p_reason end,
        completed_at = case when p_status = 'success' then now() else null end
    where id = p.id;

  if p_status = 'success' then
    update public.needs
      set status = 'paid_out', paid_out_at = now()
      where id = p.need_id and status in ('funded', 'live', 'expired');
  elsif p.status = 'success' then
    -- A reversal of a transfer we had counted as paid.
    update public.needs set status = 'funded', paid_out_at = null
      where id = p.need_id and status = 'paid_out';
  end if;

  insert into public.audit_log (action, entity, entity_id, before, after)
    values ('payout.' || p_status, 'payout', p.id,
            jsonb_build_object('status', p.status),
            jsonb_build_object('status', p_status, 'amount_kobo', p.amount_kobo, 'reason', p_reason));

  return jsonb_build_object('result', 'ok', 'need_id', p.need_id);
end;
$$;

-- Live needs that reached their expiry date without being funded.
create or replace function public.expire_needs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.needs set status = 'expired'
    where status = 'live' and expires_at is not null and expires_at < now()
    returning id, raised_kobo
  ), logged as (
    insert into public.audit_log (action, entity, entity_id, after)
    select 'need.expired', 'need', id, jsonb_build_object('raised_kobo', raised_kobo) from expired
    returning 1
  )
  select count(*) into v_count from logged;
  return v_count;
end;
$$;

revoke all on function public.record_paystack_charge(text, bigint, text, timestamptz) from public, anon, authenticated;
revoke all on function public.record_transfer_result(text, text, text, text) from public, anon, authenticated;
revoke all on function public.expire_needs() from public, anon, authenticated;
grant execute on function public.record_paystack_charge(text, bigint, text, timestamptz) to service_role;
grant execute on function public.record_transfer_result(text, text, text, text) to service_role;
grant execute on function public.expire_needs() to service_role;

-- ---------------------------------------------------------------------------
-- Storage: private documents, public media (cover photos, update photos).
-- Files live under a folder named after the uploader's user id.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('need-documents', 'need-documents', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']),
  ('public-media', 'public-media', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "need-documents: upload own" on storage.objects;
create policy "need-documents: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'need-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "need-documents: read own or admin" on storage.objects;
create policy "need-documents: read own or admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'need-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "need-documents: delete own" on storage.objects;
create policy "need-documents: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'need-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "public-media: upload own" on storage.objects;
create policy "public-media: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'public-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "public-media: delete own" on storage.objects;
create policy "public-media: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Explicit grants (Supabase adds similar defaults; being explicit keeps this
-- correct even without them). Row level security still decides which rows.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
grant select on public.public_needs, public.public_need_checks, public.public_updates to anon;
grant select on public.updates to anon;
grant insert on public.reports to anon;
