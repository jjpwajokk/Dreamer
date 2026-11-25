import type { Metadata } from "next";
import { Card, LinkButton, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "How it works" };

const principles = [
  ["Dignity over desperation", "We never rank people by how sad their story is. Each person writes their own line. Swiping left means “Pass”, never “Reject”. Faces are optional."],
  ["Transparency", "Every need shows what we verified, how much has been raised, and where the money went: which school or hospital, and on what date."],
  ["Connection over transactions", "Updates are at the heart of Dreamer. When someone you helped posts an update, you hear about it."],
  ["Trust is the product", "Money goes to institutions, not personal accounts. Nothing goes live until our team has checked it."],
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageTitle title="How Dreamer works" subtitle="Giving is about empathy, and there is no empathy without connection." />
      <ol className="space-y-4">
        {[
          ["1. A need is posted", "A student, a parent, or a trusted referrer (a teacher, a pastor, an imam) posts a need: the amount, a short story, one line in their own words, and the school or hospital's details."],
          ["2. We verify it", "Our team checks the documents and calls the school bursar or hospital billing office to confirm the amount and the account. Then it goes live with a Verified badge."],
          ["3. Givers meet them", "Givers swipe through verified needs. Swipe right to give, left to pass, up to save. Give from ₦1,000 by card, bank transfer or USSD through Paystack."],
          ["4. We pay the institution", "When a need is fully funded, we pay the school or hospital directly. The need page shows the date and amount."],
          ["5. They tell you what changed", "The person you helped posts an update: back in class, results, discharge. You get an email and see it on your impact page."],
        ].map(([t, d]) => (
          <li key={t}>
            <Card className="p-5"><p className="font-semibold">{t}</p><p className="mt-1 text-sm text-muted">{d}</p></Card>
          </li>
        ))}
      </ol>
      <h2 className="mt-10 font-display text-2xl font-semibold">What we believe</h2>
      <dl className="mt-4 space-y-4">
        {principles.map(([t, d]) => (
          <div key={t}><dt className="font-semibold">{t}</dt><dd className="text-sm text-muted">{d}</dd></div>
        ))}
      </dl>
      <h2 className="mt-10 font-display text-2xl font-semibold">Fees</h2>
      <p className="mt-2 text-sm text-muted">
        The person you help receives 100% of your gift. At checkout you can add an optional tip, which covers payment processing fees and the cost of verifying needs.
      </p>
      <h2 className="mt-10 font-display text-2xl font-semibold">If a need isn&apos;t fully funded</h2>
      <p className="mt-2 text-sm text-muted">
        Needs stay open for 30 days. If one isn&apos;t fully funded in time, we contact givers and either refund them or, only with their agreement, move the gift to another verified need.
      </p>
      <div className="mt-10 flex gap-3">
        <LinkButton href="/discover">Start meeting people</LinkButton>
        <LinkButton href="/me/needs/new" variant="secondary">Post a need</LinkButton>
      </div>
      <p className="mt-10 text-xs text-muted">The idea for Dreamer came from Kangyang Jane Pwajok.</p>
    </div>
  );
}
