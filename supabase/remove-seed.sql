-- Removes the fictional seed data (needs with no owner). Run before real launch.
begin;
-- Sample accounts loaded from Admin > Sample data (emails end in .sample@example.com).
-- Prefer the "Remove sample data" button there: it also deletes their photos from storage.
delete from public.payouts where need_id in (select id from public.needs where slug like '%-sample');
delete from public.contributions where need_id in (select id from public.needs where slug like '%-sample') or paystack_reference like 'sample-%';
delete from public.needs where slug like '%-sample';
delete from public.institutions where created_by in (select id from auth.users where email like '%.sample@example.com');
delete from auth.users where email like '%.sample@example.com';
-- The original 15 fictional needs (no owner).
delete from public.payouts where need_id in (select id from public.needs where created_by is null);
delete from public.contributions where need_id in (select id from public.needs where created_by is null);
delete from public.needs where created_by is null;
delete from public.institutions where created_by is null
  and id not in (select institution_id from public.needs where institution_id is not null);
commit;
