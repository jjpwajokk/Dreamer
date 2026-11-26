-- Dreamer: escrow until verified, light KYC, permanent bans, organisations
-- (orphanages, charity homes, NGOs...), photos with privacy, photo access
-- requests, progress updates with receipts, optional personal payout account.
--
-- Escrow model: givers pay through Paystack (a CBN-licensed payment
-- provider). Funds stay in the Paystack balance and are only released by a
-- transfer once a need is verified. A need that is still unverified 30 days
-- after it went live is closed and every gift is refunded.

-- ---------------------------------------------------------------------------
-- Profiles: light KYC, public profile, bans
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists legal_name text check (legal_name is null or char_length(legal_name) <= 120);
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists address text check (address is null or char_length(address) <= 240);
alter table public.profiles add column if not exists occupation text check (occupation is null or char_length(occupation) <= 80);
alter table public.profiles add column if not exists workplace text check (workplace is null or char_length(workplace) <= 120);
alter table public.profiles add column if not exists id_type text check (id_type is null or id_type in ('nin', 'voters_card', 'drivers_licence', 'passport', 'bvn'));
alter table public.profiles add column if not exists id_last4 text check (id_last4 is null or id_last4 ~ '^[0-9A-Za-z]{2,4}$');
alter table public.profiles add column if not exists id_hash text;
alter table public.profiles add column if not exists kyc_status text not null default 'none'
  check (kyc_status in ('none', 'submitted', 'verified', 'rejected'));
alter table public.profiles add column if not exists kyc_note text;
alter table public.profiles add column if not exists kyc_submitted_at timestamptz;
alter table public.profiles add column if not exists kyc_reviewed_at timestamptz;
alter table public.profiles add column if not exists kyc_reviewed_by uuid references auth.users (id);
alter table public.profiles add column if not exists kyc_provider_ref text;
alter table public.profiles add column if not exists bio text check (bio is null or char_length(bio) <= 280);
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists profile_public boolean not null default true;
alter table public.profiles add column if not exists banned_at timestamptz;
-- Optional social links (Facebook, Instagram, LinkedIn, X, TikTok, YouTube, website).
-- 'members': any signed-in member sees them; 'on_request': only people the owner approves; 'hidden': nobody.
alter table public.profiles add column if not exists socials jsonb not null default '{}'::jsonb
  check (jsonb_typeof(socials) = 'object' and pg_column_size(socials) < 4000);
alter table public.profiles add column if not exists socials_visibility text not null default 'members'
  check (socials_visibility in ('members', 'on_request', 'hidden'));
alter table public.profiles add column if not exists ban_reason text;

create unique index if not exists profiles_id_hash_idx on public.profiles (id_hash) where id_hash is not null;

create or replace function public.profiles_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_trusted_backend() or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role then
    if not (old.role in ('giver', 'beneficiary') and new.role in ('giver', 'beneficiary')) then
      raise exception 'Only an admin can change this role';
    end if;
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot change';
  end if;
  if new.kyc_status is distinct from old.kyc_status
     or new.kyc_reviewed_at is distinct from old.kyc_reviewed_at
     or new.kyc_reviewed_by is distinct from old.kyc_reviewed_by
     or new.kyc_provider_ref is distinct from old.kyc_provider_ref
     or new.id_hash is distinct from old.id_hash
     or new.banned_at is distinct from old.banned_at
     or new.ban_reason is distinct from old.ban_reason then
    raise exception 'Only Dreamer can change verification or account status';
  end if;
  return new;
end;
$$;

-- Platform fee: a flat 5% with no cap (larger gifts need more checks).
alter table public.contributions drop constraint if exists contributions_fee_kobo_check;
alter table public.contributions add constraint contributions_fee_kobo_check check (fee_kobo >= 0 and fee_kobo <= amount_kobo);

-- Fingerprints (SHA-256, never raw values) of banned emails, phones, ID
-- numbers and bank accounts, so a banned person can't simply sign up again.
create table if not exists public.banned_identities (
  hash text primary key,
  kind text not null check (kind in ('email', 'phone', 'id', 'account')),
  user_id uuid references auth.users (id) on delete set null,
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.banned_identities enable row level security;
create policy "banned: admin read" on public.banned_identities for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Organisations: orphanages, charity homes, NGOs, foundations...
-- They pay out only to their own official (organisation-named) bank account.
-- ---------------------------------------------------------------------------

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  org_type text not null check (org_type in ('orphanage', 'charity_home', 'ngo', 'foundation', 'school', 'faith_based', 'community', 'social_enterprise')),
  tagline text check (tagline is null or char_length(tagline) <= 140),
  about text not null default '' check (char_length(about) <= 3000),
  impact text not null default '' check (char_length(impact) <= 2000),
  people_supported integer check (people_supported is null or people_supported >= 0),
  year_founded integer check (year_founded is null or year_founded between 1900 and 2100),
  cac_number text check (cac_number is null or char_length(cac_number) <= 40),
  state text,
  city text,
  address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  website text,
  logo_path text,
  socials jsonb not null default '{}'::jsonb check (jsonb_typeof(socials) = 'object' and pg_column_size(socials) < 4000),
  socials_visibility text not null default 'members' check (socials_visibility in ('members', 'on_request', 'hidden')),
  bank_code text,
  bank_name text,
  account_number text check (account_number is null or account_number ~ '^[0-9]{10}$'),
  account_name text,
  account_resolved_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'needs_info', 'verified', 'rejected', 'suspended')),
  review_note text,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists organisations_owner_idx on public.organisations (owner_id);
create index if not exists organisations_status_idx on public.organisations (status);
drop trigger if exists organisations_updated_at on public.organisations;
create trigger organisations_updated_at before update on public.organisations
  for each row execute function public.set_updated_at();

create or replace function public.organisations_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_trusted_backend() or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.owner_id = auth.uid();
    new.status = 'draft';
    new.verified_at = null;
    new.verified_by = null;
    new.account_resolved_at = null;
    new.submitted_at = null;
    return new;
  end if;
  if new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by
     or new.account_resolved_at is distinct from old.account_resolved_at
     or new.owner_id is distinct from old.owner_id
     or new.slug <> old.slug
     or new.review_note is distinct from old.review_note then
    raise exception 'Only Dreamer can change verification fields';
  end if;
  if new.status is distinct from old.status and not (old.status in ('draft', 'needs_info') and new.status = 'submitted') then
    raise exception 'Only Dreamer can change an organisation''s status';
  end if;
  -- Bank details of a verified organisation are locked; changing them needs a new review.
  if old.status = 'verified' and (new.bank_code is distinct from old.bank_code or new.account_number is distinct from old.account_number) then
    raise exception 'Contact Dreamer to change a verified organisation''s bank account';
  end if;
  return new;
end;
$$;
drop trigger if exists organisations_guard on public.organisations;
create trigger organisations_guard before insert or update on public.organisations
  for each row execute function public.organisations_guard();

alter table public.organisations enable row level security;
create policy "orgs: read own or admin" on public.organisations for select to authenticated using (owner_id = auth.uid() or public.is_admin());
create policy "orgs: create own" on public.organisations for insert to authenticated with check (owner_id = auth.uid());
create policy "orgs: update own or admin" on public.organisations for update to authenticated
  using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

-- KYB documents (CAC certificate, SCUML, board letter...) and KYC ID scans.
create table if not exists public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid references public.organisations (id) on delete cascade,
  kind text not null check (kind in ('id_front', 'id_back', 'selfie', 'proof_of_address', 'cac_certificate', 'scuml', 'board_letter', 'tax_id', 'other')),
  storage_path text not null,
  file_name text,
  created_at timestamptz not null default now()
);
create index if not exists verification_documents_owner_idx on public.verification_documents (owner_id);
alter table public.verification_documents enable row level security;
create policy "vdocs: read own or admin" on public.verification_documents for select to authenticated using (owner_id = auth.uid() or public.is_admin());
create policy "vdocs: add own" on public.verification_documents for insert to authenticated with check (owner_id = auth.uid());
create policy "vdocs: remove own" on public.verification_documents for delete to authenticated using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Payees: personal accounts (individuals only) and organisation accounts.
-- ---------------------------------------------------------------------------

alter table public.institutions add column if not exists org_id uuid references public.organisations (id) on delete set null;
alter table public.institutions drop constraint if exists institutions_type_check;
alter table public.institutions add constraint institutions_type_check
  check (type in ('school', 'hospital', 'pharmacy', 'landlord', 'supplier', 'training_centre', 'relief_partner', 'personal_account', 'organisation'));

-- ---------------------------------------------------------------------------
-- Needs: organisation needs, escrow deadline, payout choice
-- ---------------------------------------------------------------------------

alter table public.needs add column if not exists org_id uuid references public.organisations (id) on delete set null;
alter table public.needs add column if not exists personal_payee_id uuid references public.institutions (id);
alter table public.needs add column if not exists payout_to text not null default 'institution' check (payout_to in ('institution', 'personal'));
alter table public.needs add column if not exists escrow_deadline timestamptz;
alter table public.needs add column if not exists expiry_reason text check (expiry_reason is null or expiry_reason in ('time', 'unverified', 'removed'));
-- Time-sensitive needs (a hospital bill due now, a school fee deadline): lets
-- givers sort by deadline and our team review urgent needs first. This is about
-- time, never about how hard someone's story is.
alter table public.needs add column if not exists is_urgent boolean not null default false;
alter table public.needs add column if not exists deadline date;
create index if not exists needs_urgent_idx on public.needs (is_urgent, deadline) where status in ('submitted', 'needs_info', 'live');
alter table public.needs drop constraint if exists needs_relationship_check;
alter table public.needs add constraint needs_relationship_check
  check (relationship in ('self', 'parent', 'guardian', 'teacher', 'religious_leader', 'organisation', 'other'));
-- Organisation needs can never be paid to a personal account.
alter table public.needs drop constraint if exists needs_org_no_personal;
alter table public.needs add constraint needs_org_no_personal check (org_id is null or (payout_to = 'institution' and personal_payee_id is null));

create or replace function public.needs_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_trusted_backend() or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'New needs start as drafts';
    end if;
    if new.org_id is not null and not exists (
      select 1 from public.organisations o where o.id = new.org_id and o.owner_id = auth.uid()
    ) then
      raise exception 'You can only post for your own organisation';
    end if;
    new.raised_kobo = 0;
    new.created_by = auth.uid();
    new.beneficiary_id = auth.uid();
    new.verified_at = null;
    new.verified_by = null;
    new.verification_note = null;
    new.published_at = null;
    new.funded_at = null;
    new.paid_out_at = null;
    new.completed_at = null;
    new.expires_at = null;
    new.submitted_at = null;
    new.escrow_deadline = null;
    new.payout_to = 'institution';
    return new;
  end if;

  if old.status not in ('draft', 'needs_info') then
    raise exception 'This need can no longer be edited';
  end if;
  if new.status not in ('draft', 'submitted', 'needs_info') then
    raise exception 'Only Dreamer can publish a need';
  end if;
  if new.status = 'needs_info' and old.status <> 'needs_info' then
    raise exception 'Only Dreamer can request more information';
  end if;
  if new.raised_kobo <> old.raised_kobo
     or new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by
     or new.verification_note is distinct from old.verification_note
     or new.published_at is distinct from old.published_at
     or new.funded_at is distinct from old.funded_at
     or new.paid_out_at is distinct from old.paid_out_at
     or new.completed_at is distinct from old.completed_at
     or new.expires_at is distinct from old.expires_at
     or new.escrow_deadline is distinct from old.escrow_deadline
     or new.payout_to is distinct from old.payout_to
     or new.org_id is distinct from old.org_id
     or new.rejection_reason is distinct from old.rejection_reason
     or new.info_request is distinct from old.info_request
     or new.beneficiary_id is distinct from old.beneficiary_id
     or new.created_by is distinct from old.created_by
     or new.slug <> old.slug then
    raise exception 'That field can only be changed by Dreamer';
  end if;

  if new.status = 'submitted' and old.status <> 'submitted' then
    if new.consent_at is null then
      raise exception 'Consent is required before submitting';
    end if;
    if new.institution_id is null then
      raise exception 'Every need must name who gets paid';
    end if;
    if char_length(new.story) < 40 then
      raise exception 'Please tell your story in at least 40 characters';
    end if;
    if exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.banned_at is not null) then
      raise exception 'This account can''t post needs';
    end if;
    if (
      select count(*) from public.needs n
      where n.id <> new.id
        and n.beneficiary_id = new.beneficiary_id
        and n.status in ('submitted', 'needs_info', 'live', 'funded')
    ) >= (case when new.relationship = 'self' then 1 when new.org_id is not null then 10 else 5 end) then
      raise exception 'You already have the maximum number of needs under review or live';
    end if;
    new.submitted_at = now();
  end if;

  return new;
end;
$$;

-- Escrow guard: no money leaves until the need is verified, and an
-- organisation need only ever pays the organisation's own account.
create or replace function public.payouts_guard()
returns trigger
language plpgsql
as $$
declare
  n public.needs%rowtype;
  i public.institutions%rowtype;
begin
  select * into n from public.needs where id = new.need_id;
  select * into i from public.institutions where id = new.institution_id;
  if n.verified_at is null then
    raise exception 'Funds stay in escrow until the need is verified';
  end if;
  if i.verified_at is null then
    raise exception 'The payee account must be verified first';
  end if;
  if n.org_id is not null and (i.type <> 'organisation' or i.org_id is distinct from n.org_id) then
    raise exception 'Organisation needs pay only the organisation''s own account';
  end if;
  if i.id is distinct from n.institution_id and i.id is distinct from n.personal_payee_id then
    raise exception 'Payout must go to the payee named on the need';
  end if;
  return new;
end;
$$;
drop trigger if exists payouts_guard on public.payouts;
create trigger payouts_guard before insert on public.payouts
  for each row execute function public.payouts_guard();

-- Close needs that are still unverified after their escrow deadline. Every
-- successful gift is marked for refund (no redirect: we couldn't verify).
create or replace function public.close_unverified_needs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with closed as (
    update public.needs
      set status = 'expired', expiry_reason = 'unverified'
    where status in ('live', 'funded')
      and verified_at is null
      and escrow_deadline is not null
      and escrow_deadline < now()
    returning id, raised_kobo
  ), gifts as (
    update public.contributions c
      set expiry_choice = 'refund', expiry_choice_at = now()
    from closed
    where c.need_id = closed.id and c.status = 'success'
    returning 1
  ), logged as (
    insert into public.audit_log (action, entity, entity_id, after)
    select 'need.closed_unverified', 'need', id, jsonb_build_object('raised_kobo', raised_kobo) from closed
    returning 1
  )
  select count(*) into v_count from logged;
  return v_count;
end;
$$;

-- Redirects are only for needs that expired on time, never for unverified ones.
create or replace function public.redirect_guard()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'redirected' and old.status = 'success' and exists (
    select 1 from public.needs n where n.id = old.need_id and n.expiry_reason = 'unverified'
  ) then
    raise exception 'Gifts to unverified needs are refunded, not redirected';
  end if;
  return new;
end;
$$;
drop trigger if exists contributions_redirect_guard on public.contributions;
create trigger contributions_redirect_guard before update on public.contributions
  for each row execute function public.redirect_guard();

revoke all on function public.close_unverified_needs() from public, anon, authenticated;
grant execute on function public.close_unverified_needs() to service_role;

-- ---------------------------------------------------------------------------
-- Photos: owner decides public (to signed-in members) or on request;
-- sensitive photos are blurred until a viewer chooses to see them; every
-- photo is reviewed (by a person now, an AI moderation service later).
-- ---------------------------------------------------------------------------

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  need_id uuid references public.needs (id) on delete cascade,
  org_id uuid references public.organisations (id) on delete cascade,
  update_id uuid references public.updates (id) on delete cascade,
  purpose text not null check (purpose in ('need', 'org', 'progress', 'profile')),
  storage_path text not null,
  caption text check (caption is null or char_length(caption) <= 140),
  is_sensitive boolean not null default false,
  visibility text not null default 'public' check (visibility in ('public', 'on_request')),
  moderation text not null default 'pending' check (moderation in ('pending', 'approved', 'rejected')),
  moderation_flags jsonb,
  moderation_source text check (moderation_source is null or moderation_source in ('human', 'ai')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists media_need_idx on public.media (need_id);
create index if not exists media_org_idx on public.media (org_id);
create index if not exists media_moderation_idx on public.media (moderation);

-- Up to 5 photos per need or update (or profile), up to 10 per organisation.
create or replace function public.media_limits()
returns trigger
language plpgsql
as $$
declare
  v_count integer;
begin
  if new.purpose = 'org' then
    select count(*) into v_count from public.media where org_id = new.org_id and purpose = 'org';
    if v_count >= 10 then raise exception 'Organisations can show up to 10 photos'; end if;
  elsif new.purpose = 'need' then
    select count(*) into v_count from public.media where need_id = new.need_id and purpose = 'need';
    if v_count >= 5 then raise exception 'Up to 5 photos per need'; end if;
  elsif new.purpose = 'progress' then
    select count(*) into v_count from public.media where update_id = new.update_id and purpose = 'progress';
    if v_count >= 5 then raise exception 'Up to 5 photos per update'; end if;
  elsif new.purpose = 'profile' then
    select count(*) into v_count from public.media where owner_id = new.owner_id and purpose = 'profile';
    if v_count >= 5 then raise exception 'Up to 5 profile photos'; end if;
  end if;
  if not public.is_trusted_backend() and not public.is_admin() then
    new.owner_id = auth.uid();
    new.moderation = 'pending';
    new.reviewed_by = null;
    new.reviewed_at = null;
    new.moderation_source = null;
  end if;
  return new;
end;
$$;
drop trigger if exists media_limits on public.media;
create trigger media_limits before insert on public.media
  for each row execute function public.media_limits();

alter table public.media enable row level security;
create policy "media: read own or admin" on public.media for select to authenticated using (owner_id = auth.uid() or public.is_admin());
create policy "media: delete own or admin" on public.media for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- A signed-in member asks to see photos the owner keeps "on request".
create table if not exists public.media_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  need_id uuid references public.needs (id) on delete cascade,
  org_id uuid references public.organisations (id) on delete cascade,
  message text check (message is null or char_length(message) <= 280),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
  -- need_id set: a need's photos and socials; org_id set: an organisation's;
  -- neither: the owner's personal profile.
);
create unique index if not exists media_requests_need_uq on public.media_requests (requester_id, need_id) where need_id is not null;
create unique index if not exists media_requests_org_uq on public.media_requests (requester_id, org_id) where org_id is not null;
create unique index if not exists media_requests_profile_uq on public.media_requests (requester_id, owner_id) where need_id is null and org_id is null;
alter table public.media_requests enable row level security;
create policy "media requests: read own side or admin" on public.media_requests for select to authenticated
  using (requester_id = auth.uid() or owner_id = auth.uid() or public.is_admin());

-- Private bucket for all member photos. The app serves short-lived signed
-- links, and only to signed-in members who are allowed to see each photo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']),
  ('verification', 'verification', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "media: upload own" on storage.objects;
create policy "media: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "media: delete own" on storage.objects;
create policy "media: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "verification: upload own" on storage.objects;
create policy "verification: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "verification: read own or admin" on storage.objects;
create policy "verification: read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'verification' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "verification: delete own" on storage.objects;
create policy "verification: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Progress updates: allowed while live too, with receipts and more milestones.
-- ---------------------------------------------------------------------------

alter table public.updates drop constraint if exists updates_photo_paths_check;
alter table public.updates add constraint updates_photo_paths_check check (coalesce(array_length(photo_paths, 1), 0) <= 5);
alter table public.updates add column if not exists receipt_paths text[] not null default '{}' check (coalesce(array_length(receipt_paths, 1), 0) <= 5);
alter table public.updates add column if not exists receipts_public boolean not null default false;
alter table public.updates drop constraint if exists updates_milestone_check;
alter table public.updates add constraint updates_milestone_check
  check (milestone in ('enrolled', 'back_in_class', 'results', 'graduated', 'fees_paid',
                       'treated', 'discharged', 'recovering', 'bill_paid',
                       'moved_in', 'rent_paid', 'business_running', 'stock_bought',
                       'certified', 'back_on_feet', 'back_to_work', 'progress', 'thank_you'));

create or replace function public.updates_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_trusted_backend() or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status = 'pending';
    new.approved_by = null;
    new.approved_at = null;
    new.author_id = auth.uid();
    if not exists (
      select 1 from public.needs n
      where n.id = new.need_id
        and (n.beneficiary_id = auth.uid() or n.created_by = auth.uid())
        and n.status in ('live', 'funded', 'paid_out', 'completed')
    ) then
      raise exception 'Updates can be posted on your own live or funded needs';
    end if;
    return new;
  end if;
  raise exception 'Updates cannot be edited after posting';
end;
$$;

-- ---------------------------------------------------------------------------
-- Public views
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
    when n.payout_to = 'personal' then 'a verified account in ' || n.display_name || '''s name'
    when i.type = 'organisation' then i.name
    when n.is_minor then case i.type
      when 'school' then 'their school'
      when 'hospital' then 'the hospital'
      when 'pharmacy' then 'the pharmacy'
      when 'landlord' then 'the landlord'
      when 'supplier' then 'the supplier'
      when 'training_centre' then 'the training centre'
      when 'relief_partner' then 'the relief partner'
      else 'the payee' end
    else i.name
  end as institution_label,
  (select count(*) from public.contributions c where c.need_id = n.id and c.status = 'success')::int as giver_count,
  (select max(p.completed_at) from public.payouts p where p.need_id = n.id and p.status = 'success') as payout_completed_at,
  (select coalesce(sum(p.amount_kobo), 0) from public.payouts p where p.need_id = n.id and p.status = 'success')::bigint as paid_out_kobo,
  n.escrow_deadline,
  o.slug as org_slug,
  o.name as org_name,
  n.payout_to,
  n.is_urgent,
  n.deadline
from public.needs n
left join public.institutions i on i.id = n.institution_id
left join public.organisations o on o.id = n.org_id and o.status = 'verified'
where n.status in ('live', 'funded', 'paid_out', 'completed');

grant select on public.public_needs to anon, authenticated;

create or replace view public.public_updates as
select u.id, u.need_id, u.body, u.milestone, u.photo_paths,
       coalesce(u.approved_at, u.created_at) as published_at,
       case when u.receipts_public then u.receipt_paths else '{}'::text[] end as receipt_paths
from public.updates u
join public.needs n on n.id = u.need_id
where u.status = 'approved' and n.status in ('live', 'funded', 'paid_out', 'completed');
grant select on public.public_updates to anon, authenticated;

create or replace view public.public_organisations as
select o.id, o.slug, o.name, o.org_type, o.tagline, o.about, o.impact, o.people_supported, o.year_founded,
       o.cac_number, o.state, o.city, o.website, o.logo_path, o.verified_at, o.created_at,
       (select count(*) from public.needs n where n.org_id = o.id and n.status in ('live', 'funded', 'paid_out', 'completed'))::int as need_count,
       (select coalesce(sum(n.raised_kobo), 0) from public.needs n where n.org_id = o.id and n.status in ('live', 'funded', 'paid_out', 'completed'))::bigint as raised_kobo
from public.organisations o
where o.status = 'verified';
grant select on public.public_organisations to anon, authenticated;

-- Giver and member profiles anyone can browse (first name, state, short bio).
create or replace view public.public_profiles as
select p.user_id as id, p.display_name, p.state, p.bio, p.avatar_path, p.created_at,
       (p.kyc_status = 'verified') as is_verified,
       (select count(distinct c.need_id) from public.contributions c where c.giver_id = p.user_id and c.status = 'success' and not c.is_anonymous)::int as people_supported
from public.profiles p
where p.profile_public and p.banned_at is null;
grant select on public.public_profiles to anon, authenticated;

grant all on public.organisations, public.verification_documents, public.media, public.media_requests, public.banned_identities to service_role;
grant select, insert, update on public.organisations to authenticated;
grant select, insert, delete on public.verification_documents to authenticated;
grant select, delete on public.media to authenticated;
grant select on public.media_requests to authenticated;
