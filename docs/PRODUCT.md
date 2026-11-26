> Product brief for Dreamer (working name in the brief: GiveLine). Written 2026-11-25. The source of truth for scope and principles.
# Giving Platform: Product Brief & MVP Spec
## TL;DR
We are building a mobile-first web app where Nigerians post a verified need (amount, short story, one line in their own words), givers swipe through them and contribute, and the money goes straight to the school or hospital, not to a personal account. Beneficiaries then post updates showing what changed, so givers see their impact.
- Launch sectors: Education (school fees) first, Healthcare (hospital bills) second. Basic Needs and SMEs wait for phase 2.
- Why: both have an institution that can confirm the need and receive the money, which is what makes the trust model work.
- MVP: need posting, admin verification with a Verified badge, swipe discovery, Paystack contributions, payout to the institution, transformation updates, a giver impact page, and an admin panel.
- Stack: Next.js + TypeScript + Tailwind, Supabase (Postgres, Auth, Storage), Paystack, Vercel.
- First milestone: 20 real, verified education needs fully funded and paid out, each with an update posted.
The product name is not chosen yet; the build prompt uses the placeholder GiveLine.
## Vision and positioning
Giving is about empathy, and there is no empathy without connection. The platform makes it easy for anyone to help a real person with a specific, verified need, and to see what their help changed.
Positioning: "Help a real person with a real, verified need, and watch it change their life." Not "the rich rescuing the poor". Every giver is a neighbour; a student in Jos can give ₦2,000 alongside a diaspora professional giving ₦200,000.
Three phases
- Need marketplace (now): individuals post verified needs, givers fund them, beneficiaries post updates.
- Giving infrastructure: businesses, foundations and NGOs run campaigns, CSR budgets and scholarship programmes on the same rails, with reporting.
- Human connection: ongoing relationships between givers and beneficiaries (mentorship, messages, alumni stories).
Principles, and what each means in the product
Principle
What it means in the product
Dignity over desperation
No ranking by how sad a story is. Beneficiaries write their own line. Swipe left is "Pass", never "Reject". Faces are optional.
Transparency
Every need shows its verification status, amount raised, and where the money went (paid to which school or hospital, on what date).
Connection over transactions
Updates are a core feature, not an afterthought. Givers get notified when someone they helped posts.
Trust is the product
Money goes to institutions where possible. Nothing goes live without admin verification.
Idea credit: Kangyang Jane Pwajok. Jane should co-own the beneficiary experience and the verification playbook.
## Launch sectors: start with Education, add Healthcare
Recommendation: launch with Education only, add Healthcare about 4 to 6 weeks later, and hold Basic Needs and SMEs for phase 2. The deciding test is simple: can a third party confirm the need, and can we pay that third party directly? Education and Healthcare pass both. The other two don't yet.
Sector
Can a third party verify it?
Can we pay an institution directly?
Fraud risk
Update story
Verdict
Education (school fees, exam fees like WAEC/JAMB, uniforms, books)
Yes: school bursar, fee invoice, student ID
Yes: school's bank account
Low
Strong: result slips, photos in uniform, promotion to next class
Launch
Healthcare (hospital bills, surgery, medication)
Yes: hospital invoice, doctor's letter, call to the billing office
Yes: hospital account
Medium: forged bills happen, so verify by phone
Strong: discharge, recovery, return to work
Add at week 4 to 6
Basic Needs (food, rent, utilities)
Hard: no institution for food; rent needs the landlord
Partly: rent to a landlord, food can't be
High: cash-like and hard to check
Weak and repetitive
Phase 2: start with rent paid to landlords
SME / MSME (stock, equipment, working capital)
Partly: business visit, CAC registration
Yes for equipment suppliers
Medium to high
Good, but slower
Phase 2: different product (grants or micro-loans with milestones), better suited to foundations and corporate partners
Why Education first
- Clearest emotional pull with the least desperation: a child going back to school is hopeful, not tragic.
- Fixed, checkable amounts. A fee invoice has a number on it.
- Good timing: the second term starts in January 2027, which is when fee pressure peaks.
- Easiest verification playbook for a small team to run by phone and WhatsApp.
- Natural bridge to phase 2: scholarship funds from companies and foundations.
Guardrails for launch
- Cap a single need at ₦500,000 for education and ₦1,500,000 for healthcare at first (adjust after the pilot).
- Every need must name a receiving institution. No payouts to personal accounts in the MVP.
- Needs expire after 30 days unfunded; unspent money is refunded or redirected only with the giver's consent.
## MVP core features
Eight features make the MVP. Everything else waits until 20 needs have been funded end to end.
#
Feature
What it does
Done when
1
Need posting
Beneficiary (or a trusted referrer such as a teacher or pastor) submits: category, title, amount in naira, story (max 600 chars), "In my words" line (max 120 chars), photo (optional), institution name + contact + bank details, supporting documents (invoice, ID, letter). Saves as draft, then "Submit for review".
A need can be submitted from a phone on 3G in under 5 minutes
2
Admin verification + Verified badge
Admin reviews documents, calls the institution, ticks a checklist, then approves, rejects (with a reason) or requests more info. Approved needs go live with a Verified badge showing the date and what was checked ("Fee invoice confirmed with school bursar").
No need is public without approval; every decision is logged
3
Swipe discovery
Full-screen cards: photo or initials, first name + state, category, amount, progress bar, "In my words" line, Verified badge. Swipe right = Give, left = Pass, up = Save, tap = full story. Button fallbacks for accessibility. Filters: category, state, "close to goal".
Feed loads under 2 s on mid-range Android; works without swipe gestures
4
Contributions
Give any amount from ₦1,000, quick picks (₦2k, ₦5k, ₦10k, "Finish it"). Paystack checkout (card, bank transfer, USSD). Optional anonymity. A 5% platform fee, capped at ₦5,000, which the giver adds on top or takes from the gift; the checkout shows exactly what the person receives. Receipt by email.
Payment confirmed by webhook, not by the browser redirect; progress updates instantly
5
Payout to institution
When a need is fully funded (or at expiry, if partly funded and admin agrees), admin triggers a Paystack Transfer to the institution's verified account. Payout status and date show on the need page.
Every naira in is matched to a payout or refund in the ledger
6
Transformation updates
After payout, the beneficiary is prompted (SMS/WhatsApp link) to post an update: text + up to 4 photos + a milestone tag (Enrolled, Results, Discharged, etc.). Admin approves before it shows. Reminders at 2 weeks and 3 months.
70%+ of funded needs have at least one update within 30 days
7
Giver impact page
"My giving": total given, people helped, each need's status (funding, paid to school on date, updates), and a feed of updates from people they helped. Shareable impact card.
A giver can see where every contribution went
8
Admin panel
Queues: new needs, more-info, updates to review, payouts due, flagged reports. Need detail with documents, checklist, notes, audit trail. Basic dashboard numbers. Report button on every public need.
One admin can verify 10 needs a day
Not in the MVP: native apps, in-app chat between giver and beneficiary, recurring giving, corporate accounts, automated KYC (BVN/NIN lookups), multiple currencies, payouts to individuals, comments, leaderboards, a public "most urgent" ranking.
## User journeys
Beneficiary: Amina, 15, SS2 in Jos, ₦185,000 school fees owed
- Her teacher shares a WhatsApp link. Amina's mother signs up with her phone number.
- She picks Education, enters the amount, writes the story, and the line "I want to be the first nurse in my family."
- She uploads the fee invoice and her ID, and enters the school bursar's name and phone number.
- She sees "Under review, usually within 48 hours". An admin calls the bursar, confirms the balance and the school's account, and approves.
- She gets an SMS: "Your need is live and verified." She can share her link.
- When funded, she sees "Paid to Government Secondary School, 12 Jan". She is asked to post an update.
- She posts a photo in uniform and, at term end, her result slip.
Giver: Tunde, Lagos, gives a few times a month
- Lands on the site from a friend's shared impact card. Swipes without signing up.
- Swipes right on Amina. Sees the full story, the Verified badge and what was checked.
- Gives ₦10,000 through Paystack bank transfer. Signs up with email in the same flow to track it.
- Gets a receipt, then a notification when the need is fully funded and paid to the school.
- Three weeks later gets "Amina posted an update" and sees the photo on his impact page. Shares the impact card.
Admin: Jane, runs verification
- Opens the New needs queue each morning.
- Checks documents, calls the institution, ticks the checklist (identity, amount, institution account, story consistent).
- Approves with a verification note, asks for more info, or rejects with a reason.
- Triggers payouts for fully funded needs and confirms with the institution.
- Reviews updates and reported needs.
## Data model
Postgres (Supabase). Money is stored in kobo as integers (₦1 = 100 kobo) to avoid rounding errors. Every table has id uuid, created_at, updated_at.
Table
Key fields
Notes
profiles
user_id (auth), role (beneficiary / giver / admin), full_name, display_name, phone, email, state, avatar_url
One row per auth user. Role checked by RLS.
institutions
name, type (school / hospital), state, address, contact_name, contact_phone, bank_code, account_number, account_name, paystack_recipient_code, verified_at, verified_by
Reused across needs. Account name confirmed via Paystack account resolve.
needs
beneficiary_id, created_by (referrer), category (education / healthcare), title, story, my_words, amount_kobo, raised_kobo, institution_id, status, verified_at, verified_by, verification_note, expires_at, slug
Status: draft → submitted → needs_info → live → funded → paid_out → completed; also rejected, expired.
need_documents
need_id, kind (invoice / id / letter / photo), storage_path, is_public
Private bucket by default. Only cover photo is public.
verification_checks
need_id, admin_id, check (identity / amount / institution / account / story), passed, note
The checklist behind the badge.
contributions
need_id, giver_id (nullable for guests), amount_kobo, tip_kobo, is_anonymous, paystack_reference, status (pending / success / failed / refunded), paid_at
Only success (set by webhook) counts toward raised_kobo.
payouts
need_id, institution_id, amount_kobo, paystack_transfer_code, status (pending / success / failed / reversed), initiated_by, completed_at
One need usually has one payout.
updates
need_id, author_id, body, milestone, photo_paths[], status (pending / approved / rejected), approved_by
Shown on need page and givers' feeds once approved.
saved_needs
user_id, need_id
Swipe up.
swipes
user_id or anon_id, need_id, action (pass / give / save)
Used to avoid repeating cards and for funnel metrics.
reports
need_id, reporter_id, reason, status
Report button.
audit_log
actor_id, action, entity, entity_id, before, after
Every admin action and every money movement.
Key rules
- raised_kobo is updated only inside the Paystack webhook handler, in a transaction, and is idempotent on paystack_reference.
- A need flips to funded when raised_kobo >= amount_kobo; further contributions are blocked.
- Beneficiaries can read and edit only their own needs while in draft or needs_info.
- Public reads go through a view that hides documents, phone numbers and bank details.
## Tech stack
Pick boring, well-documented tools that Claude Code knows well and that a solo founder can run for close to ₦0 a month until there is traction.
Layer
Choice
Why
Frontend + API
Next.js (App Router) + TypeScript
One codebase for pages, server actions and webhook routes.
Styling + UI
Tailwind CSS + shadcn/ui
Fast, consistent, accessible components.
Swipe cards
Framer Motion (drag gestures)
Smooth swipe on mobile with button fallbacks.
Database, auth, files
Supabase (Postgres, Auth, Storage, Row Level Security)
Free tier to start; RLS keeps documents private.
Payments
Paystack (Checkout, Webhooks, Transfers, Account Resolve)
Widest Nigerian payment coverage; bank transfer and USSD matter for local givers. Flutterwave is the fallback.
Email
Resend
Receipts and notifications.
SMS / WhatsApp
Termii (later: WhatsApp Business API)
Beneficiaries are more reachable by SMS and WhatsApp than email.
Images
Supabase Storage + Next.js Image (resized, WebP)
Keeps the feed light on mobile data.
Hosting
Vercel
Zero-config deploys from GitHub.
Validation
Zod
Same schemas on client and server.
Testing
Vitest + Playwright
Unit tests for money logic; one end-to-end test of the give flow.
Build it as a mobile-first PWA, not a native app. Most users will be on Android over mobile data, so keep pages light and test on a slow connection.
## Payments and compliance
Money never goes to a beneficiary's personal account in the MVP. Givers pay through Paystack, funds settle into the platform's business account, and the platform pays the school or hospital by Paystack Transfer. This is the single biggest trust and fraud control we have.
How the money moves
- Giver pays on Paystack Checkout (card, bank transfer, USSD). The contribution is pending.
- Paystack calls our webhook (charge.success). We verify the signature, mark the contribution success, and add it to raised_kobo.
- When the need is funded, an admin confirms the institution's account (Paystack resolves the account name) and starts a Transfer.
- Paystack calls the webhook again (transfer.success). The need shows "Paid to [institution] on [date]".
- If a need expires unfunded, givers choose: refund, or move the money to another verified need.
The platform only ever pays a verified school or hospital; what flows back to the giver is the beneficiary's update.
Fees. Paystack's local fee is roughly 1.5% + ₦100 per transaction, capped at ₦2,000, and transfers cost a small flat fee (approximate, from memory; confirm on Paystack's pricing page). Decided model (26 Nov 2026): a 5% platform fee capped at ₦5,000 per gift covers verification, payment processing and payouts. The giver chooses to add it on top or deduct it from the gift.
Legal and regulatory checklist (talk to a Nigerian lawyer before taking real money)
- Register the entity with the CAC. For a giving platform, Incorporated Trustees (a registered non-profit) or a company limited by guarantee usually fits better than a regular company; it also helps with Paystack approval and future foundation partners.
- SCUML registration (anti-money-laundering registration required for non-profits).
- Paystack business verification. Tell Paystack plainly that you are a donation platform paying institutions, so the account isn't frozen for unusual flows.
- CBN rules: holding and moving money on behalf of others can require a licence. Paying institutions quickly, keeping a clean ledger, and staying a merchant of record for donations reduces risk, but get legal confirmation.
- Nigeria Data Protection Act 2023: consent screen for beneficiaries, keep ID documents private, minimum data, a privacy policy, and a way to delete data.
- Consent for minors: a parent or guardian submits and consents for anyone under 18; no full names or school names for minors on public pages.
- Terms of use for givers (donations are gifts, refund rules) and beneficiaries (truthfulness, updates, removal if fraud is found).
Fraud controls in the MVP: institution-only payouts, phone call to the institution for every need, one live need per beneficiary, duplicate checks on phone number and institution account, a report button, and an audit log of every admin action.
## Metrics
North star: needs fully funded, paid to the institution, and followed by an approved update. It captures trust (verified), giving (funded), integrity (paid out) and connection (update) in one number.
Metric
Pilot target (first 90 days)
Verified needs live
50
Needs completed (funded + paid + update)
20
Median time from submit to verified
under 48 hours
Median time from live to funded
under 14 days
Swipe-right rate (Give / all swipes)
10%+
Checkout conversion (Give tapped → paid)
40%+
Repeat givers (gave 2+ times in 60 days)
30%+
Update rate (funded needs with an update in 30 days)
70%+
Confirmed fraud cases
0
Track these from the swipes, contributions, payouts and updates tables; no analytics tool is needed for the pilot.
## Nigerian launch plan
Aim to have 20 verified education needs live when schools resume for the second term in early January 2027. Validation runs in parallel with the build, so real needs are waiting when the app is ready.
- Validate by hand (now to mid-December). Jane and Jonn collect 20 real school-fee needs through WhatsApp, churches, mosques and 3 to 5 partner schools in one or two cities (Jos and Lagos are natural starts). Verify each by calling the school. Fund 3 to 5 of them from your own network by bank transfer straight to the school, to test the story, the update and the giver reaction before writing payment code.
- Set up the business (in parallel). CAC registration, Paystack business account in test mode, domain, a lawyer's review of the money flow and terms.
- Build the MVP (December). Follow the phased build plan below. Load the 20 validated needs as the first live content.
- Private pilot (first two weeks of January). Invite 50 to 100 givers from your own network and the diaspora. Watch every transaction and payout by hand.
- Public launch (late January). Share the first transformation updates as the launch story: "Amina is back in class." Use WhatsApp status, Instagram, X and Nigerian Twitter voices who care about education.
- Add Healthcare (February). Partner with 2 to 3 hospitals that will confirm bills by phone, then open the category.
Channels that fit Nigeria: WhatsApp groups and status (the main one), church and mosque networks, alumni associations, diaspora communities (UK, US, Canada) who already send money home, and school PTAs for finding needs.
## Phased build plan
Six build phases, each ending in something you can click through. Run one Claude Code session per phase, commit when it works, then move on. Rough effort assumes a few focused hours a day.
- Foundation (1 to 2 days). Next.js + TypeScript + Tailwind + shadcn/ui project, Supabase project, full database schema as SQL migrations with RLS, seed script with 15 sample needs, auth (email magic link), roles, mobile layout shell.
- Check: you can sign up, and the seed needs exist in the database.
- Need posting (2 days). Multi-step form (category, amount, story, "In my words", institution, documents, photo), drafts, private document upload, "Submit for review", beneficiary dashboard showing status.
- Check: a need submitted from your phone appears as submitted.
- Admin verification (2 days). Admin queues, need review page with documents, verification checklist, approve / request info / reject, Verified badge with note, audit log.
- Check: approving a need makes it public with the badge.
- Swipe discovery + need page (2 to 3 days). Card stack with drag gestures and buttons, filters, saved needs, full need page with progress, verification details and share link (with Open Graph image for WhatsApp previews).
- Check: swiping works smoothly on a mid-range Android phone.
- Contributions + payouts (3 days). Paystack Checkout in test mode, webhook with signature check and idempotency, progress updates, receipts, guest giving, admin payout via Paystack Transfers, payout status on the need page.
- Check: a test payment funds a need and a test transfer marks it paid out.
- Updates + impact (2 days). Beneficiary update form, admin approval, updates on the need page, giver impact page and update feed, email notifications, shareable impact card.
- Check: a giver sees an update from someone they funded.
Then: a polish and safety pass (empty states, error states, rate limits, report button, privacy policy and terms pages, slow-network testing), deploy to Vercel, switch Paystack to live keys only after legal sign-off.
## Claude Code kickoff prompt
Create an empty GitHub repo, open it in Claude Code, and paste the prompt below. It builds Phase 1 and writes a CLAUDE.md so later sessions keep the same rules. For each later phase, start a new session with: "Read CLAUDE.md and docs/PRODUCT.md, then build Phase N."
<<= amount_kobo; block further contributions.
- Only admins can set status to live, trigger payouts or approve updates; log every admin action in audit_log.
- Secrets only in env vars (.env.local, never committed). Use Paystack TEST keys until I say otherwise.
- Format naira as ₦1,234 and accept amounts from ₦1,000.

BUILD PHASES
1. Foundation: scaffold, schema + RLS migrations, seed 15 realistic Nigerian sample needs (fictional people), magic-link auth, roles, mobile layout shell.
2. Need posting: multi-step form, drafts, private document upload, submit for review, beneficiary dashboard.
3. Admin verification: queues, review page, checklist, approve / request info / reject, Verified badge with note.
4. Swipe discovery + need page: card stack with drag + button fallbacks, filters, saves, need page, share link with Open Graph image.
5. Contributions + payouts: Paystack Checkout, webhook, receipts, guest giving, admin payouts via Transfers.
6. Updates + impact: update form, admin approval, giver impact page and feed, email notifications, shareable impact card.

WHAT TO DO NOW
1. Ask me any questions you need answered first (keep it to 5 or fewer).
2. Write docs/PRODUCT.md (this brief) and CLAUDE.md (stack, conventions, hard rules, how to run, phase checklist).
3. Build Phase 1 only. Make small commits. Finish with: how to run it locally, which env vars I must fill in, and what to check in the browser.]]>
## Risks and open questions
Risk
Mitigation
Fake or inflated needs
Institution-only payouts, phone verification of every need, caps per need, report button
Paystack freezes the account over unusual donation flows
Register as a non-profit, explain the model to Paystack up front, keep the ledger clean
Regulatory surprise (CBN, data protection)
Lawyer review before live payments; pay institutions quickly rather than holding funds
Story competition turns desperate
No sadness ranking, "In my words" written by the beneficiary, writing guide for referrers
Beneficiaries don't post updates
Make updates easy by SMS/WhatsApp link, reminders, let a teacher or referrer post on their behalf
Admin verification doesn't scale
Fine for the pilot; plan partner schools and hospitals as trusted verifiers, then automated KYC
Open questions for Jonn and Jane
- Product name and domain.
- Which one or two cities to pilot in first?
- Who are the first 3 to 5 partner schools?
- Legal entity: Incorporated Trustees or company limited by guarantee?
- Should givers be able to message beneficiaries in phase 1, or wait for phase 3?
