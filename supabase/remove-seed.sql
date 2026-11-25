-- Removes the fictional seed data (needs with no owner). Run before real launch.
begin;
delete from public.payouts where need_id in (select id from public.needs where created_by is null);
delete from public.contributions where need_id in (select id from public.needs where created_by is null);
delete from public.needs where created_by is null;
delete from public.institutions where created_by is null
  and id not in (select institution_id from public.needs where institution_id is not null);
commit;
