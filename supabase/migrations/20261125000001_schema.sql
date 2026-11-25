-- Dreamer: core schema
-- Money is always stored as integer kobo (bigint). ₦1 = 100 kobo.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role text not null default 'giver' check (role in ('beneficiary', 'giver', 'admin')),
  full_name text,
  display_name text,
  phone text,
  email text,
  state text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Is the current request made by an admin? SECURITY DEFINER so RLS policies
-- can call it without recursing into the profiles policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Requests made with the service role key (our server code) or by the
-- database owner bypass the guards below.
create or replace function public.is_trusted_backend()
returns boolean
language sql
stable
as $$
  select current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nobody can make themselves an admin from the browser.
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
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------------------
-- institutions: the schools and hospitals that receive payouts
-- ---------------------------------------------------------------------------

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  type text not null check (type in ('school', 'hospital')),
  state text,
  address text,
  contact_name text,
  contact_phone text,
  bank_code text,
  bank_name text,
  account_number text check (account_number is null or account_number ~ '^[0-9]{10}$'),
  account_name text,
  paystack_recipient_code text,
  account_resolved_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users (id),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index institutions_account_idx on public.institutions (bank_code, account_number);

create trigger institutions_updated_at before update on public.institutions
  for each row execute function public.set_updated_at();

-- Only admins (or our server) can mark an institution verified or attach a
-- Paystack recipient.
create or replace function public.institutions_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_trusted_backend() or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verified_at = null;
    new.verified_by = null;
    new.paystack_recipient_code = null;
    new.account_resolved_at = null;
    new.created_by = auth.uid();
    return new;
  end if;
  if old.verified_at is not null then
    raise exception 'A verified institution can only be changed by an admin';
  end if;
  if new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by
     or new.paystack_recipient_code is distinct from old.paystack_recipient_code
     or new.account_resolved_at is distinct from old.account_resolved_at
     or new.created_by is distinct from old.created_by then
    raise exception 'Only an admin can change verification fields';
  end if;
  return new;
end;
$$;

create trigger institutions_guard before insert or update on public.institutions
  for each row execute function public.institutions_guard();

-- ---------------------------------------------------------------------------
-- needs
-- ---------------------------------------------------------------------------

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  beneficiary_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  relationship text not null default 'self'
    check (relationship in ('self', 'parent', 'guardian', 'teacher', 'religious_leader', 'other')),
  category text not null check (category in ('education', 'healthcare')),
  title text not null check (char_length(title) between 4 and 80),
  story text not null default '' check (char_length(story) <= 600),
  my_words text not null default '' check (char_length(my_words) <= 120),
  -- Public identity: first name only, never a full name.
  display_name text not null check (char_length(display_name) between 1 and 40),
  state text not null,
  city text,
  is_minor boolean not null default false,
  contact_phone text,
  consent_at timestamptz,
  cover_photo_path text,
  amount_kobo bigint not null check (amount_kobo >= 100000),
  raised_kobo bigint not null default 0 check (raised_kobo >= 0),
  institution_id uuid references public.institutions (id),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'needs_info', 'live', 'funded', 'paid_out', 'completed', 'rejected', 'expired')),
  info_request text,
  rejection_reason text,
  verified_at timestamptz,
  verified_by uuid references auth.users (id),
  verification_note text,
  submitted_at timestamptz,
  published_at timestamptz,
  funded_at timestamptz,
  paid_out_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Launch caps (adjust with a new migration after the pilot):
  -- education up to ₦500,000, healthcare up to ₦1,500,000.
  constraint needs_amount_cap check (
    (category = 'education' and amount_kobo <= 50000000)
    or (category = 'healthcare' and amount_kobo <= 150000000)
  )
);

create index needs_status_idx on public.needs (status);
create index needs_beneficiary_idx on public.needs (beneficiary_id);
create index needs_created_by_idx on public.needs (created_by);

create trigger needs_updated_at before update on public.needs
  for each row execute function public.set_updated_at();

-- Beneficiaries may only edit their own drafts (or needs an admin sent back
-- for more info), and may only move them to "submitted" (or back to draft).
-- Money and verification fields are never writable from the browser.
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
    return new;
  end if;

  if old.status not in ('draft', 'needs_info') then
    raise exception 'This need can no longer be edited';
  end if;
  if new.status not in ('draft', 'submitted', 'needs_info') then
    raise exception 'Only an admin can publish a need';
  end if;
  if new.status = 'needs_info' and old.status <> 'needs_info' then
    raise exception 'Only an admin can request more information';
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
     or new.rejection_reason is distinct from old.rejection_reason
     or new.info_request is distinct from old.info_request
     or new.beneficiary_id is distinct from old.beneficiary_id
     or new.created_by is distinct from old.created_by
     or new.slug <> old.slug then
    raise exception 'That field can only be changed by an admin';
  end if;

  if new.status = 'submitted' and old.status <> 'submitted' then
    if new.consent_at is null then
      raise exception 'Consent is required before submitting';
    end if;
    if new.institution_id is null then
      raise exception 'Every need must name a school or hospital';
    end if;
    if char_length(new.story) < 40 then
      raise exception 'Please tell your story in at least 40 characters';
    end if;
    -- One active need for someone posting for themselves; referrers such as
    -- teachers or parents may have up to five active needs at once.
    if (
      select count(*) from public.needs n
      where n.id <> new.id
        and n.beneficiary_id = new.beneficiary_id
        and n.status in ('submitted', 'needs_info', 'live', 'funded')
    ) >= (case when new.relationship = 'self' then 1 else 5 end) then
      raise exception 'You already have the maximum number of needs under review or live';
    end if;
    new.submitted_at = now();
  end if;

  return new;
end;
$$;

create trigger needs_guard before insert or update on public.needs
  for each row execute function public.needs_guard();

-- ---------------------------------------------------------------------------
-- need_documents: invoices, IDs, letters (private bucket)
-- ---------------------------------------------------------------------------

create table public.need_documents (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs (id) on delete cascade,
  kind text not null check (kind in ('invoice', 'id', 'letter', 'photo', 'other')),
  storage_path text not null,
  file_name text,
  is_public boolean not null default false,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index need_documents_need_idx on public.need_documents (need_id);

create trigger need_documents_updated_at before update on public.need_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- verification_checks: the checklist behind the Verified badge
-- ---------------------------------------------------------------------------

create table public.verification_checks (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs (id) on delete cascade,
  admin_id uuid references auth.users (id) on delete set null,
  "check" text not null check ("check" in ('identity', 'amount', 'institution', 'account', 'story')),
  passed boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (need_id, "check")
);

create trigger verification_checks_updated_at before update on public.verification_checks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contributions
-- ---------------------------------------------------------------------------

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs (id),
  giver_id uuid references auth.users (id) on delete set null,
  giver_email text not null,
  giver_name text,
  amount_kobo bigint not null check (amount_kobo >= 100000),
  tip_kobo bigint not null default 0 check (tip_kobo >= 0),
  is_anonymous boolean not null default false,
  paystack_reference text not null unique,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'refunded')),
  channel text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contributions_need_idx on public.contributions (need_id);
create index contributions_giver_idx on public.contributions (giver_id);
create index contributions_email_idx on public.contributions (lower(giver_email));

create trigger contributions_updated_at before update on public.contributions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payouts: money out, always to an institution
-- ---------------------------------------------------------------------------

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs (id),
  institution_id uuid not null references public.institutions (id),
  amount_kobo bigint not null check (amount_kobo > 0),
  method text not null default 'paystack' check (method in ('paystack', 'manual')),
  reference text not null unique,
  paystack_transfer_code text,
  manual_reference text,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'reversed')),
  failure_reason text,
  initiated_by uuid references auth.users (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payouts_need_idx on public.payouts (need_id);

create trigger payouts_updated_at before update on public.payouts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- updates: transformation updates from beneficiaries
-- ---------------------------------------------------------------------------

create table public.updates (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 10 and 1000),
  milestone text not null default 'progress'
    check (milestone in ('enrolled', 'back_in_class', 'results', 'graduated', 'treated', 'discharged', 'recovering', 'back_to_work', 'progress', 'thank_you')),
  photo_paths text[] not null default '{}' check (coalesce(array_length(photo_paths, 1), 0) <= 4),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index updates_need_idx on public.updates (need_id);
create index updates_status_idx on public.updates (status);

create trigger updates_updated_at before update on public.updates
  for each row execute function public.set_updated_at();

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
        and n.status in ('funded', 'paid_out', 'completed')
    ) then
      raise exception 'Updates can be posted on your own funded needs';
    end if;
    return new;
  end if;
  raise exception 'Updates cannot be edited after posting';
end;
$$;

create trigger updates_guard before insert or update on public.updates
  for each row execute function public.updates_guard();

-- ---------------------------------------------------------------------------
-- saves, swipes, reports, audit log
-- ---------------------------------------------------------------------------

create table public.saved_needs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  need_id uuid not null references public.needs (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, need_id)
);

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  anon_id text,
  need_id uuid not null references public.needs (id) on delete cascade,
  action text not null check (action in ('pass', 'give', 'save', 'open')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or anon_id is not null)
);

create index swipes_user_idx on public.swipes (user_id);
create index swipes_anon_idx on public.swipes (anon_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reporter_email text,
  reason text not null check (char_length(reason) between 5 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity, entity_id);
create index audit_log_created_idx on public.audit_log (created_at desc);
