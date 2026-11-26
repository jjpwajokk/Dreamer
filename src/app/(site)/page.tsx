import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  Camera,
  CheckCircle2,
  Eye,
  HandCoins,
  HeartHandshake,
  Landmark,
  LockKeyhole,
  PhoneCall,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getFeed, getRecentUpdates, getSiteStats } from "@/lib/queries";
import { formatNaira, progressPercent } from "@/lib/money";
import { CATEGORIES, SECTORS } from "@/lib/sectors";
import { milestoneLabel } from "@/lib/format";
import { CategoryBadge, NeedAvatar } from "@/components/need-bits";

export const dynamic = "force-dynamic";

const compact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

export default async function Home() {
  const [stats, needs, updates] = await Promise.all([getSiteStats(), getFeed({}, {}), getRecentUpdates(3)]);
  const featured = needs.slice(0, 3);

  return (
    <div className="bg-bg">
      {/* Hero */}
      <section className="aurora relative overflow-hidden text-white">
        <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pb-28">
          <div className="animate-rise">
            <p className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_10px_2px_rgba(52,211,153,.7)]" aria-hidden />
              Verified giving for Nigeria, built for Africa
            </p>
            <h1 className="mt-6 text-[40px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-[68px]">
              Real people. Verified needs.{" "}
              <span className="text-gradient">Lives you can watch change.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/70">
              Dreamer connects you with Nigerians facing a real, checked need: school fees, a hospital bill, rent, the tools to earn a living. You give in a few taps. The money goes straight to the school, hospital or supplier. Then you see what changed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/discover" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-night shadow-[0_10px_30px_-10px_rgba(52,211,153,.6)] transition hover:bg-white/90">
                Start giving <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/me/needs/new" className="glass inline-flex h-12 items-center gap-2 rounded-xl px-6 text-[15px] font-semibold text-white transition hover:bg-white/10">
                Ask for help
              </Link>
            </div>
            <ul className="mt-10 grid max-w-lg grid-cols-1 gap-3 text-sm text-white/65 sm:grid-cols-3">
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-mint" aria-hidden /> Every need verified</li>
              <li className="flex items-center gap-2"><Landmark className="h-4 w-4 text-mint" aria-hidden /> Paid to institutions</li>
              <li className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-mint" aria-hidden /> Secured by Paystack</li>
            </ul>
          </div>

          {/* Floating card stack */}
          <div className="relative mx-auto h-[420px] w-full max-w-[400px]" aria-hidden={featured.length === 0}>
            <div className="absolute -inset-10 rounded-full bg-mint/20 blur-3xl" aria-hidden />
            {featured.length ? (
              featured.map((n, i) => (
                <Link
                  key={n.id}
                  href={`/n/${n.slug}`}
                  className="glass absolute left-0 right-0 rounded-3xl p-5 text-white shadow-2xl shadow-black/40 transition hover:-translate-y-1"
                  style={{
                    top: i * 128,
                    transform: `translateX(${i === 1 ? 26 : i === 2 ? -14 : 0}px) rotate(${i === 1 ? 2 : i === 2 ? -1.5 : 0}deg)`,
                    zIndex: 3 - i,
                    animation: `float ${9 + i * 2}s ease-in-out ${i * 0.8}s infinite`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <NeedAvatar name={n.display_name} photoPath={n.cover_photo_path} size={42} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-semibold">
                        {n.display_name} <BadgeCheck className="h-4 w-4 text-mint" aria-label="Verified" />
                      </p>
                      <p className="truncate text-xs text-white/60">{SECTORS[n.category]?.label ?? "Education"} · {n.state}</p>
                    </div>
                    <span className="tabular ml-auto text-sm font-semibold">{progressPercent(n.amount_kobo, n.raised_kobo)}%</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-[15px] leading-snug text-white/85">&ldquo;{n.my_words}&rdquo;</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-mint to-sun" style={{ width: `${progressPercent(n.amount_kobo, n.raised_kobo)}%` }} />
                  </div>
                  <p className="tabular mt-2 text-xs text-white/55">{formatNaira(n.raised_kobo)} of {formatNaira(n.amount_kobo)}</p>
                </Link>
              ))
            ) : (
              <div className="glass absolute inset-x-0 top-16 rounded-3xl p-8 text-center text-white/80">
                <Sparkles className="mx-auto h-8 w-8 text-mint" aria-hidden />
                <p className="mt-3 font-semibold">New verified needs are on their way.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl shadow-black/[.04] md:grid-cols-4">
          {(stats.raisedKobo >= 100_000_00
            ? [
                { label: "Verified needs live", value: compact.format(stats.live) },
                { label: "Raised for people", value: `₦${compact.format(stats.raisedKobo / 100)}` },
                { label: "Gifts made", value: compact.format(stats.givers) },
                { label: "Needs fully met", value: compact.format(stats.funded) },
              ]
            : [
                { label: "Sectors, from school fees to rent", value: String(CATEGORIES.length) },
                { label: "Of every need checked by a person", value: "100%" },
                { label: "Paid to personal accounts. Ever.", value: "₦0" },
                { label: "Refunded if a need can't be verified", value: "100%" },
              ]
          ).map((s, i) => (
            <div key={s.label} className={`p-5 sm:p-7 ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""} border-line`}>
              <p className="tabular text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What Dreamer is */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">What Dreamer is</p>
            <h2 className="mt-3 font-display text-4xl leading-[1.05] sm:text-5xl">Giving you can see, trust and follow.</h2>
          </div>
          <div className="space-y-5 text-[17px] leading-relaxed text-muted">
            <p>
              Every day, students drop out over a fee balance, patients wait at hospitals they can&apos;t pay, and families lose a home over a few months&apos; rent. Many people want to help, but they don&apos;t know who is genuine or whether the money will be used well.
            </p>
            <p>
              <strong className="text-ink">Dreamer closes that gap.</strong> Each person tells their story in their own words. Our team checks the documents and calls the school, hospital or landlord to confirm the amount before anything goes live. When you give, the money is paid to that institution, never to a personal account. And when it lands, the person posts an update so you can see what your gift did.
            </p>
            <p>It&apos;s not about the rich rescuing the poor. It&apos;s about dignity, transparency and connection between people who would never otherwise meet.</p>
          </div>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            { Icon: ShieldCheck, title: "Verified before it's visible", text: "Documents reviewed, institution called, bank account confirmed. You see exactly what we checked, and when." },
            { Icon: Building2, title: "Paid to the institution", text: "Gifts go to the school, hospital, landlord or supplier, with the payout date shown on the need." },
            { Icon: Camera, title: "Updates that close the loop", text: "Back in class. Discharged. Shop open. Each person shares what changed, so your giving feels real." },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="group rounded-2xl border border-line bg-surface p-6 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/[.04]">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="h-5 w-5" aria-hidden /></span>
              <p className="mt-5 text-lg font-semibold tracking-[-0.02em]">{title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">How it works</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl leading-[1.05] sm:text-5xl">Simple for everyone involved.</h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {[
              {
                who: "If you want to give",
                Icon: HeartHandshake,
                steps: [
                  ["Meet people", "Swipe through verified needs or filter by sector and state. Read each story and what we checked."],
                  ["Give from ₦1,000", "Pick an amount, or finish a need in one go. Pay by card, bank transfer or USSD."],
                  ["Money goes to the institution", "We pay the school, hospital or supplier directly and show you the date."],
                  ["See what changed", "Get the update in your impact feed, and share your impact card."],
                ],
              },
              {
                who: "If you need help",
                Icon: HandCoins,
                steps: [
                  ["Tell your story", "Post for yourself, your child, or someone you vouch for. First names only, faces optional."],
                  ["Upload the bill", "Share the fee invoice, hospital bill or quote, and who we should call to confirm it."],
                  ["We verify and publish", "Our team confirms the details. Your need goes live with a Verified badge."],
                  ["Get funded, then share", "We pay the institution. You post a short update to thank the people who helped."],
                ],
              },
            ].map((track) => (
              <div key={track.who} className="rounded-3xl border border-line bg-bg p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-night text-mint"><track.Icon className="h-5 w-5" aria-hidden /></span>
                  <p className="text-lg font-semibold tracking-[-0.02em]">{track.who}</p>
                </div>
                <ol className="mt-6 space-y-5">
                  {track.steps.map(([t, d], i) => (
                    <li key={t} className="flex gap-4">
                      <span className="tabular grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-surface text-xs font-semibold">{i + 1}</span>
                      <div>
                        <p className="font-semibold">{t}</p>
                        <p className="mt-0.5 text-[15px] text-muted">{d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section id="sectors" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-28">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Sectors</p>
            <h2 className="mt-3 max-w-xl font-display text-4xl leading-[1.05] sm:text-5xl">One platform for the needs that matter most.</h2>
          </div>
          <p className="max-w-sm text-[15px] text-muted">Each sector has its own verification playbook, and the money always goes to a checked third party.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => {
            const s = SECTORS[c];
            return (
              <Link key={c} href={`/discover?category=${c}`} className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/[.05]">
                <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[.12] blur-2xl transition group-hover:opacity-25" style={{ background: s.accent }} aria-hidden />
                <span className="inline-block h-2 w-8 rounded-full" style={{ background: s.accent }} aria-hidden />
                <p className="mt-5 text-xl font-semibold tracking-[-0.02em]">{s.label}</p>
                <p className="mt-1.5 text-[15px] text-muted">{s.examples}</p>
                <p className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-muted">Paid to {s.payeePhrase.replace("the ", "")}</span>
                  <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="aurora relative scroll-mt-20 overflow-hidden text-white">
        <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">Trust, by design</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl leading-[1.05] sm:text-5xl">Every naira is checked, tracked and accounted for.</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: ScanSearch, t: "Documents reviewed", d: "Fee invoices, bills and quotes checked against ID." },
              { Icon: PhoneCall, t: "Institution called", d: "We confirm the amount with the bursar, billing office or landlord." },
              { Icon: Banknote, t: "Account confirmed", d: "The receiving bank account is verified before any payout." },
              { Icon: Eye, t: "Full audit trail", d: "Every approval and every naira in and out is logged and reconciled." },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="glass rounded-2xl p-6">
                <Icon className="h-6 w-6 text-mint" aria-hidden />
                <p className="mt-4 font-semibold">{t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/65">{d}</p>
              </div>
            ))}
          </div>
          <div className="glass mt-6 flex flex-col items-start gap-4 rounded-2xl p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
              <span className="rounded-lg bg-white/10 px-3 py-1.5">You</span>
              <ArrowRight className="h-4 w-4 text-white/40" aria-hidden />
              <span className="rounded-lg bg-white/10 px-3 py-1.5">Paystack (secured)</span>
              <ArrowRight className="h-4 w-4 text-white/40" aria-hidden />
              <span className="rounded-lg bg-mint/20 px-3 py-1.5 text-mint">School · Hospital · Landlord · Supplier</span>
            </div>
            <p className="text-sm text-white/60">Released only after every check passes.</p>
          </div>
        </div>
      </section>

      {/* Stories */}
      {updates.length || featured.length ? (
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{updates.length ? "What changed" : "Meet people"}</p>
                <h2 className="mt-3 font-display text-4xl leading-[1.05]">{updates.length ? "Updates from people you helped." : "Verified needs, live now."}</h2>
              </div>
              <Link href="/discover" className="hidden items-center gap-1.5 text-sm font-semibold text-brand sm:inline-flex">See all <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {updates.length
                ? updates.map(({ update, need }) => (
                    <Link key={update.id} href={`/n/${need.slug}`} className="rounded-2xl border border-line bg-bg p-6 transition hover:bg-surface hover:shadow-lg hover:shadow-black/[.04]">
                      <div className="flex items-center gap-3">
                        <NeedAvatar name={need.display_name} photoPath={need.cover_photo_path} size={40} />
                        <div>
                          <p className="font-semibold">{need.display_name}</p>
                          <p className="text-xs text-muted">{need.state}</p>
                        </div>
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {milestoneLabel(update.milestone)}
                        </span>
                      </div>
                      <p className="mt-4 line-clamp-4 text-[15px] leading-relaxed">{update.body}</p>
                    </Link>
                  ))
                : featured.map((n) => (
                    <Link key={n.id} href={`/n/${n.slug}`} className="rounded-2xl border border-line bg-bg p-6 transition hover:bg-surface hover:shadow-lg hover:shadow-black/[.04]">
                      <div className="flex items-center gap-3">
                        <NeedAvatar name={n.display_name} photoPath={n.cover_photo_path} size={40} />
                        <div>
                          <p className="font-semibold">{n.display_name}</p>
                          <p className="text-xs text-muted">{n.state}</p>
                        </div>
                        <CategoryBadge category={n.category} className="ml-auto" />
                      </div>
                      <p className="mt-4 text-[15px] leading-relaxed">&ldquo;{n.my_words}&rdquo;</p>
                    </Link>
                  ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 md:py-28">
        <h2 className="text-center font-display text-4xl leading-[1.05]">Questions, answered.</h2>
        <div className="mt-10 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {[
            ["How do I know a need is genuine?", "Our team reviews the documents, checks the person's ID and calls the school, hospital or business to confirm the amount and the bank account. Every gift is held securely by our licensed payment partner until those checks pass, and if a need can't be verified within 30 days, every giver is refunded in full."],
            ["Where does the money go?", "Straight to the school, hospital, landlord, supplier or training centre named on the need, once it's verified. Organisations are paid only into their official, registered account. This protects givers and the people being supported."],
            ["What if a need isn't fully funded?", "Needs stay open for 30 days. If one isn't fully funded, we ask each giver whether they'd like a refund or to move their gift to another verified need. Nothing moves without your consent."],
            ["Can I give without an account?", "Yes. Use your email for the receipt. If you create an account later with the same email, your gifts and updates appear in your impact feed."],
            ["Is my information safe?", "Only first names are public. Documents, phone numbers and bank details are never shown. For anyone under 18, the school name is hidden too."],
          ].map(([q, a]) => (
            <details key={q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="aurora relative mx-auto max-w-6xl overflow-hidden rounded-[28px] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
          <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-4xl leading-[1.05] sm:text-5xl">Someone&apos;s next chapter starts with you.</h2>
            <p className="mx-auto mt-4 max-w-lg text-white/70">Meet a verified need today. It takes less than two minutes, and you&apos;ll see the difference you made.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/discover" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-night hover:bg-white/90">
                Start giving <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/login" className="glass inline-flex h-12 items-center rounded-xl px-6 font-semibold text-white hover:bg-white/10">Create an account</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
