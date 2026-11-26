# Dreamer

Help a real person with a real, verified need, and watch it change their life.

Dreamer is a mobile-first web app for giving in Nigeria. People post a verified need (school fees first, hospital bills later) with the amount, a short story and one line in their own words. Givers swipe through needs and give through Paystack. The money is paid **straight to the school or hospital**, never to a personal account. After that, the person posts an update so givers can see what changed.

Built with Next.js 15, Supabase (Postgres, Auth, Storage) and Paystack, deployed on Vercel.

Test site: https://dreamer-woad-kappa.vercel.app (payments not switched on yet). The product brief is in [docs/PRODUCT.md](docs/PRODUCT.md).

## What's in the MVP

| # | Feature | Where |
|---|---------|-------|
| 1 | Need posting: 6-step form, drafts, private document upload, consent, submit for review | `/me/needs/new`, `/me/needs` |
| 2 | Admin verification: checklist, approve, ask for more info or reject, Verified badge with note | `/admin/needs` |
| 3 | Swipe discovery: drag or buttons, filters (category, state, close to goal), save, full story page with WhatsApp preview image | `/discover`, `/n/[slug]` |
| 4 | Giving with Paystack: quick amounts, "Finish it", flat 5% platform fee (no cap, added on top or taken from the gift, shown only at checkout), guest giving (ID-verified account needed above ₦200,000), receipts. Counted **only** by the signed webhook | `/n/[slug]/give`, `/api/paystack/webhook` |
| 5 | Payout to the institution: Paystack Transfer (with bank account check), or record a manual bank transfer | `/admin/payouts` |
| 6 | Progress updates: text, milestone, up to 5 photos and 5 receipts (private or shared with members), admin approval, givers emailed. Allowed while live too | `/me/needs/[id]/update`, `/admin/updates` |
| 7 | Giver impact page and shareable impact card | `/me`, `/impact/[id]` |
| 8 | Admin panel: queues (time-sensitive first), dashboard numbers, reports, ledger, audit log | `/admin` |
| 9 | Escrow: needs can go live before checks finish; gifts are held in the Paystack balance, payouts are locked in the database until verified, and unverified needs close after 30 days with every gift refunded | `/admin/needs?status=escrow`, daily job |
| 10 | One account for giving and getting support, with light ID checks (required to share a need, run an organisation or give over ₦200,000); permanent fraud bans by fingerprint | `/me/verify`, `/admin/people` |
| 11 | Organisations (orphanages, care homes, NGOs, foundations): CAC documents, official bank account only, profile with up to 10 photos | `/me/organisation`, `/organisations`, `/o/[slug]`, `/admin/organisations` |
| 12 | Photos: up to 5 per need, private bucket, members only, "on request" and blur-if-sensitive choices, human review plus optional AI screening (Sightengine) | `/admin/photos`, `/me/requests` |
| 13 | Profiles with optional social links (members, on request, or hidden); urgency and deadlines; light and dark mode following the device | `/me/account`, `/u/[id]`, `/discover` |

Trust and dignity rules built in: nothing is public until an admin approves it; only first names are shown; for under-18s the school name is hidden too; documents, phone numbers and bank details are never public; every admin action and money movement goes in the audit log; the ledger page checks every naira in is matched.

---

## Deploy (about 30 minutes)

You need three free accounts: **Supabase**, **Paystack** (test mode is fine) and **Vercel**.

### 1. Supabase (database, sign-in, file storage)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**. Name it `dreamer`, choose a strong database password, and pick the region closest to Nigeria (e.g. *West EU (London)*).
2. When it's ready, open **SQL Editor** → **New query**. Open [`supabase/setup.sql`](supabase/setup.sql) in this repo, copy all of it, paste it in, and click **Run**. You should see "Success. No rows returned".
3. Optional, for testing: new query again, paste [`supabase/seed.sql`](supabase/seed.sql) and **Run**. This adds 15 fictional people and schools so the app isn't empty. Delete them before launch (see "Before real launch").
4. **Project Settings → API keys**: copy the **Project URL**, the **anon / publishable** key, and the **service_role / secret** key. (Either the legacy `anon`/`service_role` keys or the newer `sb_publishable_…`/`sb_secret_…` keys work.) Keep the service key private.
5. **Authentication → URL Configuration**: set **Site URL** to your Vercel address (you get it in step 3; come back then) and add these **Redirect URLs**:
   - `https://YOUR-APP.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`

### 2. Paystack (payments, in test mode)

1. Sign in at [dashboard.paystack.com](https://dashboard.paystack.com) and make sure the **Test mode** toggle is on.
2. **Settings → API Keys & Webhooks**: copy the **Test Secret Key** (`sk_test_…`) and **Test Public Key** (`pk_test_…`).
3. On the same page, set **Test Webhook URL** to `https://YOUR-APP.vercel.app/api/paystack/webhook` (after step 3).
4. For payouts by Paystack Transfer: **Settings → Preferences → Transfers**, turn off "Confirm transfers before sending (OTP)" for test mode. You can always record a manual bank transfer instead.

### 3. Vercel (hosting)

1. Go to [vercel.com/new](https://vercel.com/new), import the `dreamer` GitHub repository, keep the default settings.
2. Before clicking Deploy, open **Environment Variables** and add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role / secret key |
| `PAYSTACK_SECRET_KEY` | `sk_test_…` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | `pk_test_…` |
| `ADMIN_EMAILS` | Your email (and Jane's), comma-separated. These become admins when they sign in. |
| `CRON_SECRET` | Any long random string (protects the daily job: expiry, giver choice emails, update reminders) |
| `TERMII_API_KEY` | Optional. Sends SMS update reminders through Termii |
| `CONSENT_SECRET` | Optional. Signs refund/redirect choice links (falls back to the service role key) |
| `ESCROW_AUTO_PUBLISH` | Optional. `true` puts submitted needs live straight away in escrow (funds held until an admin verifies). Leave unset to review before going live |
| `IDENTITY_SALT` | Recommended. Long random string used to fingerprint ID numbers and banned identities. Set once and never change it |
| `SIGHTENGINE_API_USER`, `SIGHTENGINE_API_SECRET` | Optional. AI screening of uploaded photos (explicit content removed, graphic content blurred) |
| `MODERATION_AUTO_APPROVE` | Optional. `true` lets photos that pass AI screening appear without a human review |
| `DOJAH_APP_ID`, `DOJAH_SECRET_KEY` | Optional. Automatic NIN check during "Get verified"; without it the team reviews IDs by hand |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel address, e.g. `https://dreamer-xyz.vercel.app` (add after the first deploy, then redeploy) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional. Without them, emails (receipts, updates) are written to the Vercel logs instead of sent. |

3. Click **Deploy**. When it's done, copy your address, put it in `NEXT_PUBLIC_SITE_URL`, in Supabase's Site URL and Redirect URLs, and in Paystack's webhook URL. Then **Redeploy** in Vercel.

### 4. Try it

1. Open the site and sign in with an email in `ADMIN_EMAILS` (an email link, or "Create an account with a password"). You'll see **Admin** in the menu.
2. **Give**: open Discover, swipe right, give ₦2,000. On Paystack's test page use the test card `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456` (check [Paystack's test payments page](https://paystack.com/docs/payments/test-payments/) if that changes). The thank-you page turns green once Paystack's webhook arrives.
3. **Post a need** from a second account (another email), with a photo of any document as the invoice, and submit.
4. As admin: **Admin → Needs**, open it, tick the checklist, **Save checklist**, **Approve and publish**. It appears in Discover.
5. Fund it fully ("Finish it"), then **Admin → Payouts** → pay it, or record a manual transfer.
6. As the second account: **My needs → Post an update**. As admin: **Admin → Updates → Approve**. The giver sees it on **My giving**.

> Supabase's built-in email sender only sends a few sign-in emails per hour. That's fine for testing; before inviting pilot users, set up custom SMTP (Supabase → Authentication → Emails → SMTP, e.g. with Resend).

---

## Run it locally

```bash
npm install
cp .env.example .env.local     # fill in the values (same as the Vercel table)
npm run dev                    # http://localhost:3000
```

To run Supabase on your own machine instead of a hosted project, install Docker and use the [Supabase CLI](https://supabase.com/docs/guides/local-development): `npx supabase init` (keep the existing files), `npx supabase start`, then `npx supabase db reset` applies `supabase/migrations` and `supabase/seed.sql`.

Paystack can't reach `localhost`, so to test gifts locally use a tunnel (e.g. `ngrok http 3000`) as the webhook URL, or test giving on the Vercel deployment.

## Tests

```bash
npm test               # money rules (amounts, gift caps, platform fee)
npm run typecheck
./scripts/test-db.sh   # applies migrations + seed to a throwaway local Postgres and checks the
                       # security rules and money functions (needs psql and a local Postgres)
```

The full flow (swipe → give → webhook → post a need → verify → payout → update → impact) was also tested end to end in a browser against a local Supabase stack.

## How the money works

1. Giving creates a `pending` contribution and sends the giver to Paystack Checkout.
2. Paystack calls `/api/paystack/webhook` (`charge.success`). The signature is checked, then the database function `record_paystack_charge` marks the gift successful and adds it to the need, in one transaction, at most once per reference. **This is the only place a gift is counted.** The platform fee is recorded in `fee_kobo` and never counted toward the need.
3. When the total reaches the goal, the need becomes `funded` and stops taking gifts. Admins get a "payout due" email.
4. The admin checks the school's account with the bank (Paystack account resolve) and sends a Paystack Transfer, or records a manual transfer. `transfer.success` marks the need `paid_out`.
5. When the person's first update is approved, the need is `completed`.
6. Escrow: a need can be live before it is verified. Gifts sit in the Paystack balance (held by the licensed payment provider, not by Dreamer), and a database trigger refuses any payout until both the need and the payee are verified. If a need is still unverified 30 days after going live, the daily job closes it and refunds every gift through Paystack (or lists it under Expired needs when Paystack isn't connected).
7. Live needs expire after 30 days (daily job at 06:00 UTC). Expired needs with gifts show in **Admin → Needs → Expired**, where an admin can pay out the partial amount if the institution agrees, or arrange refunds.

## Before real launch (live money)

- Legal sign-off on the money flow, terms and privacy policy (drafts are at `/terms` and `/privacy`), CAC registration and Paystack business verification. See the checklist in [docs/PRODUCT.md](docs/PRODUCT.md).
- Remove the seed data: run [`supabase/remove-seed.sql`](supabase/remove-seed.sql) in the SQL editor.
- Custom SMTP for sign-in emails, and `RESEND_API_KEY` for receipts.
- Only then switch to Paystack **live** keys (`sk_live_…`). The "Test mode" banner disappears automatically.

## Project layout

```
src/app/             pages and API routes (App Router)
  discover/          swipe deck
  n/[slug]/          public need page, give page, preview image
  me/                giver impact, my needs, need form, updates, saved, account
  admin/             verification, payouts, updates, reports, ledger, audit log
  api/paystack/      webhook
src/lib/             money rules, Paystack client, Supabase clients, validation
supabase/migrations  database schema, security rules, money functions, storage
supabase/seed.sql    15 fictional needs for testing
supabase/setup.sql   all migrations in one file for the SQL editor (npm run db:bundle)
docs/PRODUCT.md      the product brief
```

Idea credit: Kangyang Jane Pwajok.
