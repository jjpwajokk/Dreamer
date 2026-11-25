# Dreamer: notes for Claude Code sessions

Read `docs/PRODUCT.md` (the brief) before changing behaviour. `README.md` has setup and deploy steps.

## Stack
Next.js 15 (App Router, server actions) + TypeScript strict, Tailwind v4 (tokens in `src/app/globals.css`), hand-rolled UI in `src/components/ui.tsx`, `motion` for the swipe deck, Zod 4, Supabase (`@supabase/ssr`), Paystack REST API, optional Resend over fetch. Tests: `npm test` (node:test), `./scripts/test-db.sh` (Postgres behaviour tests).

## Hard rules
- Money is integer kobo everywhere (`src/lib/money.ts`). Display with `formatNaira`. Minimum gift and need: ₦1,000.
- `needs.raised_kobo` changes ONLY in `record_paystack_charge` (SQL), called ONLY from the signature-checked webhook `src/app/api/paystack/webhook/route.ts`. Never trust the checkout redirect.
- Money never goes to a beneficiary personally: payouts go to `institutions` only.
- Only admins publish needs, trigger payouts, approve updates. Every admin action calls `logAudit`. Admin server actions start with `assertAdmin()` and then use the service-role client.
- Public reads go through the `public_needs`, `public_need_checks`, `public_updates` views. Never expose documents, phone numbers, bank details or full names. For minors (`is_minor`) the institution name is hidden.
- Dignity: no ranking by sadness; "Pass" not "Reject"; first names only; faces optional.
- Secrets only in env vars. Paystack TEST keys until legal sign-off.

## Database changes
Add a new file in `supabase/migrations/` (never edit an applied one), then `npm run db:bundle` to regenerate `supabase/setup.sql`, and extend `supabase/tests/rls_and_money.test.sql`. Row-level guards live in triggers (`needs_guard`, `institutions_guard`, `updates_guard`, `profiles_guard`).

## Next up (after the MVP)
SMS/WhatsApp prompts for updates (Termii), update reminders at 2 weeks and 3 months, refund/redirect flow for expired needs, rate limiting on public actions, Playwright suite in the repo.
