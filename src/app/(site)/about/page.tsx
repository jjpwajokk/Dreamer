import type { Metadata } from "next";
import { BadgeCheck, HandHeart, Landmark, MessageCircleHeart, PenLine, ShieldCheck } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { FEE_CAP_KOBO, FEE_PERCENT, formatNaira } from "@/lib/money";
import { CATEGORIES, SECTORS } from "@/lib/sectors";

export const metadata: Metadata = { title: "How it works", description: "How Dreamer verifies needs, pays institutions directly, and keeps givers connected to the people they help." };

const steps = [
  { Icon: PenLine, title: "A need is posted", text: "A student, parent, patient, tenant, trader or a trusted referrer (teacher, pastor, imam, community leader) posts a need: the amount, a short story, one line in their own words, and the payee's details from the invoice." },
  { Icon: ShieldCheck, title: "We verify it", text: "Our team checks the documents and calls the school bursar, hospital billing office, landlord or supplier to confirm the amount and the account. Only then does it go live with a Verified badge." },
  { Icon: HandHeart, title: "Givers meet them", text: "Givers swipe through verified needs, or browse by sector and state. Give from ₦1,000 by card, bank transfer or USSD through Paystack." },
  { Icon: Landmark, title: "We pay the bill directly", text: "When a need is fully funded, we pay the school, hospital, landlord or supplier directly. The need page shows the date and amount. No money ever goes to a personal account." },
  { Icon: MessageCircleHeart, title: "They tell you what changed", text: "The person you helped posts an update: back in class, discharged, moved in, business running. You get an email and see it in My impact." },
];

const principles = [
  ["Dignity over desperation", "We never rank people by how sad their story is. Each person writes their own line. Swiping left means “Pass”, never “Reject”. Faces are optional and only first names are shown."],
  ["Transparency", "Every need shows what we verified, how much has been raised, and where the money went: which payee, and on what date."],
  ["Connection over transactions", "Updates are at the heart of Dreamer. When someone you helped posts an update, you hear about it."],
  ["Trust is the product", "Money goes to verified institutions and businesses, never to personal accounts. Nothing goes live until our team has checked it."],
];

export default function AboutPage() {
  return (
    <div>
      <section className="aurora relative overflow-hidden text-white">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">How it works</p>
          <h1 className="mx-auto mt-3 max-w-2xl font-display text-[40px] leading-[1.05] sm:text-[56px]">
            Giving is about empathy. There&apos;s no empathy without <span className="text-gradient">connection</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-white/70">
            Dreamer connects people with real, verified needs to people who want to help, then shows both sides exactly what changed.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-20 px-4 py-16 sm:py-20">
        <section>
          <h2 className="font-display text-3xl">Five steps, fully transparent</h2>
          <ol className="mt-8 space-y-4">
            {steps.map(({ Icon, title, text }, i) => (
              <li key={title} className="flex gap-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="h-6 w-6" aria-hidden /></span>
                <div>
                  <p className="text-xs font-semibold text-muted">Step {i + 1}</p>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-display text-3xl">What you can get help with</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => {
              const s = SECTORS[c];
              return (
                <div key={c} className="rounded-2xl border border-line bg-surface p-5">
                  <span className="inline-block h-2 w-8 rounded-full" style={{ background: s.accent }} aria-hidden />
                  <p className="mt-3 font-semibold">{s.label}</p>
                  <p className="mt-1 text-sm text-muted">{s.examples}</p>
                  <p className="mt-3 text-xs text-muted">Up to {formatNaira(s.capKobo)} · paid to {s.payeePhrase}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl">Fees, plainly</h2>
            <p className="mt-4 text-muted">
              Dreamer charges a {FEE_PERCENT}% platform fee on each gift, capped at {formatNaira(FEE_CAP_KOBO)}. It pays for verifying every need,
              payment processing, and paying institutions. At checkout you choose:
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /> <span><strong>Add the fee on top</strong>, so the person receives your full gift.</span></li>
              <li className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /> <span><strong>Take it from your gift</strong>, so you pay exactly the amount you chose.</span></li>
            </ul>
            <p className="mt-4 text-sm text-muted">Either way, we show you exactly how much will be credited to the person before you pay.</p>
          </div>
          <div>
            <h2 className="font-display text-3xl">If a need isn&apos;t fully funded</h2>
            <p className="mt-4 text-muted">
              Needs stay open for 30 days. If one isn&apos;t fully funded in time, we never pay out part of a bill without your say. We email every
              giver to choose: a full refund, or moving the gift to another verified person with a similar need.
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-3xl">What we believe</h2>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            {principles.map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-line bg-surface p-5">
                <dt className="font-semibold">{t}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-3xl bg-night px-6 py-12 text-center text-white sm:px-12">
          <h2 className="font-display text-3xl">Ready to meet someone?</h2>
          <p className="mx-auto mt-2 max-w-md text-white/65">Every person on Dreamer has been checked by our team.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkButton href="/discover" size="lg">Start giving</LinkButton>
            <LinkButton href="/me/needs/new" size="lg" variant="secondary">Post a need</LinkButton>
          </div>
        </section>
      </div>
    </div>
  );
}
