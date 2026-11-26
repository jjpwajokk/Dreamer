-- Dreamer: platform fee, more sectors, giver consent on expired needs,
-- update reminders and rate limiting.

-- ---------------------------------------------------------------------------
-- Sectors: more categories, and more kinds of verified payee.
-- ---------------------------------------------------------------------------

alter table public.needs drop constraint if exists needs_category_check;
alter table public.needs add constraint needs_category_check
  check (category in ('education', 'healthcare', 'housing', 'livelihood', 'skills', 'emergency'));

alter table public.needs drop constraint if exists needs_amount_cap;
alter table public.needs add constraint needs_amount_cap check (
  (category = 'education' and amount_kobo <= 50000000)
  or (category = 'healthcare' and amount_kobo <= 150000000)
  or (category = 'housing' and amount_kobo <= 100000000)
  or (category = 'livelihood' and amount_kobo <= 50000000)
  or (category = 'skills' and amount_kobo <= 30000000)
  or (category = 'emergency' and amount_kobo <= 20000000)
);

alter table public.institutions drop constraint if exists institutions_type_check;
alter table public.institutions add constraint institutions_type_check
  check (type in ('school', 'hospital', 'pharmacy', 'landlord', 'supplier', 'training_centre', 'relief_partner'));

alter table public.updates drop constraint if exists updates_milestone_check;
alter table public.updates add constraint updates_milestone_check
  check (milestone in ('enrolled', 'back_in_class', 'results', 'graduated', 'treated', 'discharged', 'recovering',
                       'moved_in', 'business_running', 'certified', 'back_on_feet', 'back_to_work', 'progress', 'thank_you'));

-- ---------------------------------------------------------------------------
-- Platform fee: 5% capped at ₦5,000. amount_kobo stays "what is credited to
-- the need"; fee_kobo is Dreamer's; the giver is charged amount + fee + tip.
-- ---------------------------------------------------------------------------

alter table public.contributions drop constraint if exists contributions_amount_kobo_check;
alter table public.contributions add constraint contributions_amount_kobo_check check (amount_kobo > 0);
alter table public.contributions add column if not exists fee_kobo bigint not null default 0 check (fee_kobo >= 0 and fee_kobo <= 500000);
alter table public.contributions add column if not exists fee_mode text not null default 'on_top' check (fee_mode in ('on_top', 'deducted'));
-- Giver's choice when a need expires before it is funded.
alter table public.contributions add column if not exists expiry_choice text check (expiry_choice in ('refund', 'redirect'));
alter table public.contributions add column if not exists expiry_choice_at timestamptz;
alter table public.contributions add column if not exists redirected_to uuid references public.needs (id);
alter table public.contributions add column if not exists redirected_from uuid references public.contributions (id);
alter table public.contributions drop constraint if exists contributions_status_check;
alter table public.contributions add constraint contributions_status_check
  check (status in ('pending', 'success', 'failed', 'refunded', 'redirected'));

-- Reminders to post an update after payout (2 weeks and 3 months).
alter table public.needs add column if not exists reminded_2w_at timestamptz;
alter table public.needs add column if not exists reminded_3m_at timestamptz;
-- When givers of an expired need were asked to choose refund or redirect.
alter table public.needs add column if not exists expiry_notice_at timestamptz;

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
  v_expected bigint;
begin
  select * into c from public.contributions where paystack_reference = p_reference for update;
  if not found then
    return jsonb_build_object('result', 'unknown_reference');
  end if;
  if c.status = 'success' then
    return jsonb_build_object('result', 'duplicate', 'need_id', c.need_id);
  end if;
  v_expected := c.amount_kobo + c.fee_kobo + c.tip_kobo;
  if p_amount_paid_kobo < v_expected then
    update public.contributions set status = 'failed' where id = c.id;
    insert into public.audit_log (action, entity, entity_id, after)
      values ('contribution.amount_mismatch', 'contribution', c.id,
              jsonb_build_object('expected', v_expected, 'paid', p_amount_paid_kobo));
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
            jsonb_build_object('status', 'success', 'amount_kobo', c.amount_kobo, 'fee_kobo', c.fee_kobo,
                               'tip_kobo', c.tip_kobo, 'need_raised_kobo', n.raised_kobo + c.amount_kobo,
                               'need_funded', v_now_funded));

  return jsonb_build_object('result', 'ok', 'need_id', n.id, 'funded', v_now_funded);
end;
$$;

-- Moves one successful gift from an expired need to another live need, with
-- the giver's consent (expiry_choice = 'redirect'). The original gift is
-- marked 'redirected' and a new successful gift is created on the target, so
-- the ledger still matches every naira in to a payout, refund or redirect.
create or replace function public.redirect_contribution(p_contribution_id uuid, p_to_need_id uuid, p_actor uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.contributions%rowtype;
  src public.needs%rowtype;
  dst public.needs%rowtype;
  v_move bigint;
  v_now_funded boolean;
  v_new_id uuid;
begin
  select * into c from public.contributions where id = p_contribution_id for update;
  if not found or c.status <> 'success' then
    return jsonb_build_object('result', 'not_redirectable');
  end if;
  if c.expiry_choice is distinct from 'redirect' then
    return jsonb_build_object('result', 'no_consent');
  end if;
  select * into src from public.needs where id = c.need_id for update;
  if src.status <> 'expired' then
    return jsonb_build_object('result', 'source_not_expired');
  end if;
  select * into dst from public.needs where id = p_to_need_id for update;
  if not found or dst.status <> 'live' then
    return jsonb_build_object('result', 'target_not_live');
  end if;

  v_move := least(c.amount_kobo, greatest(dst.amount_kobo - dst.raised_kobo, 0));
  if v_move <= 0 then
    return jsonb_build_object('result', 'target_full');
  end if;
  if v_move < c.amount_kobo then
    return jsonb_build_object('result', 'target_too_small', 'room_kobo', v_move);
  end if;

  update public.contributions set status = 'redirected', redirected_to = dst.id where id = c.id;
  update public.needs set raised_kobo = greatest(raised_kobo - c.amount_kobo, 0) where id = src.id;

  insert into public.contributions (need_id, giver_id, giver_email, giver_name, amount_kobo, fee_kobo, tip_kobo,
                                    is_anonymous, paystack_reference, status, channel, paid_at, redirected_from)
  values (dst.id, c.giver_id, c.giver_email, c.giver_name, c.amount_kobo, 0, 0,
          c.is_anonymous, c.paystack_reference || '-r', 'success', 'redirect', now(), c.id)
  returning id into v_new_id;

  v_now_funded := dst.raised_kobo + c.amount_kobo >= dst.amount_kobo;
  update public.needs
    set raised_kobo = raised_kobo + c.amount_kobo,
        status = case when v_now_funded then 'funded' else status end,
        funded_at = case when v_now_funded then now() else funded_at end
    where id = dst.id;

  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
    values (p_actor, 'contribution.redirected', 'contribution', c.id,
            jsonb_build_object('need_id', src.id, 'amount_kobo', c.amount_kobo),
            jsonb_build_object('need_id', dst.id, 'new_contribution_id', v_new_id, 'need_funded', v_now_funded));

  return jsonb_build_object('result', 'ok', 'new_contribution_id', v_new_id, 'funded', v_now_funded);
end;
$$;

-- Records a refund made through Paystack (or by hand) for an expired need.
create or replace function public.record_refund(p_contribution_id uuid, p_actor uuid default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.contributions%rowtype;
begin
  select * into c from public.contributions where id = p_contribution_id for update;
  if not found or c.status <> 'success' then
    return jsonb_build_object('result', 'not_refundable');
  end if;
  update public.contributions set status = 'refunded' where id = c.id;
  update public.needs set raised_kobo = greatest(raised_kobo - c.amount_kobo, 0) where id = c.need_id;
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
    values (p_actor, 'contribution.refunded', 'contribution', c.id,
            jsonb_build_object('amount_kobo', c.amount_kobo, 'fee_kobo', c.fee_kobo, 'note', p_note));
  return jsonb_build_object('result', 'ok');
end;
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting for public actions (gifts, reports, sign-ups, submissions).
-- ---------------------------------------------------------------------------

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;

-- Returns true when the action is allowed, false when the limit is reached.
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_start, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  -- Housekeeping: drop old windows now and then.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_limit;
end;
$$;

revoke all on function public.redirect_contribution(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_refund(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.redirect_contribution(uuid, uuid, uuid) to service_role;
grant execute on function public.record_refund(uuid, uuid, text) to service_role;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
grant all on public.rate_limits to service_role;

-- ---------------------------------------------------------------------------
-- Public view: hidden payee label for every payee type.
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
    when n.is_minor then case i.type
      when 'school' then 'their school'
      when 'hospital' then 'the hospital'
      when 'pharmacy' then 'the pharmacy'
      when 'landlord' then 'the landlord'
      when 'supplier' then 'the supplier'
      when 'training_centre' then 'the training centre'
      when 'relief_partner' then 'the relief partner'
      else 'the institution' end
    else i.name
  end as institution_label,
  (select count(*) from public.contributions c where c.need_id = n.id and c.status = 'success')::int as giver_count,
  (select max(p.completed_at) from public.payouts p where p.need_id = n.id and p.status = 'success') as payout_completed_at,
  (select coalesce(sum(p.amount_kobo), 0) from public.payouts p where p.need_id = n.id and p.status = 'success')::bigint as paid_out_kobo
from public.needs n
left join public.institutions i on i.id = n.institution_id
where n.status in ('live', 'funded', 'paid_out', 'completed');

grant select on public.public_needs to anon, authenticated;
