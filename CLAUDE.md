# Dreamer: notes for Claude Code sessions

Read `docs/PRODUCT.md` (the brief) before changing behaviour. `README.md` has setup and deploy steps.

## Stack
Next.js 15 (App Router, server actions) + TypeScript strict, Tailwind v4 (tokens in `src/app/globals.css`), hand-rolled UI in `src/components/ui.tsx`, `motion` for the swipe deck, Zod 4, Supabase (`@supabase/ssr`), Paystack REST API, optional Resend over fetch. Tests: `npm test` (node:test), `./scripts/test-db.sh` (Postgres behaviour tests).

## Hard rules
- Money is integer kobo everywhere (`src/lib/money.ts`). Display with `formatNaira`. Minimum gift and need: ₦1,000.
- Platform fee: 5% floored to whole naira, capped at ₦5,000 (`planGift`). The giver picks `on_top` (pays gift + fee) or `deducted` (person receives gift − fee). `contributions.amount_kobo` is what the need is credited; `fee_kobo` is Dreamer's; the charge is amount + fee + tip.
- Sectors live in `src/lib/sectors.ts` (education, healthcare, housing, livelihood, skills, emergency) with per-sector caps and payee types. Keep in sync with the SQL check constraints.
- `needs.raised_kobo` changes ONLY in SQL functions: `record_paystack_charge` (called ONLY from the signature-checked webhook `src/app/api/paystack/webhook/route.ts`), and `redirect_contribution` / `record_refund` (admin-only, for expired needs). Never trust the checkout redirect. A gift is redirected only if the giver chose it (`expiry_choice`, set from the signed `/consent/[token]` link).
- Money never goes to a beneficiary personally: payouts go to `institutions` (verified payees: schools, hospitals, landlords, suppliers, training centres, relief partners) only.
- Only admins publish needs, trigger payouts, approve updates. Every admin action calls `logAudit`. Admin server actions start with `assertAdmin()` and then use the service-role client.
- Public reads go through the `public_needs`, `public_need_checks`, `public_updates` views. Never expose documents, phone numbers, bank details or full names. For minors (`is_minor`) the institution name is hidden.
- Dignity: no ranking by sadness; "Pass" not "Reject"; first names only; faces optional.
- Secrets only in env vars. Paystack TEST keys until legal sign-off.

## Database changes
Add a new file in `supabase/migrations/` (never edit an applied one), then `npm run db:bundle` to regenerate `supabase/setup.sql`, and extend `supabase/tests/rls_and_money.test.sql`. Row-level guards live in triggers (`needs_guard`, `institutions_guard`, `updates_guard`, `profiles_guard`).

## Next up (after the MVP)
Done: update reminders at 2 weeks and 3 months (daily cron, email + Termii SMS when `TERMII_API_KEY` is set), refund/redirect flow for expired needs (`/admin/expired`), rate limiting (`src/lib/rate-limit.ts`). Still to do: WhatsApp prompts, Playwright suite in the repo, phase 2 (organisation giving).
