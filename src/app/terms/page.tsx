import type { Metadata } from "next";
import { Notice, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageTitle title="Terms of use" subtitle="Draft for the pilot. To be reviewed by a Nigerian lawyer before live payments." />
      <Notice tone="sun">This is a starting draft written for testing. It is not legal advice.</Notice>
      <div className="mt-6 space-y-5 text-[15px] leading-relaxed">
        <section><h2 className="font-semibold">For givers</h2><p className="text-muted">Gifts are donations, not purchases or loans. Your gift is paid to the named school or hospital for the stated need. If a need is removed for fraud, or expires without being fully funded, we will refund you or, only with your agreement, move your gift to another verified need. Tips go to Dreamer to cover fees and verification.</p></section>
        <section><h2 className="font-semibold">For people posting needs</h2><p className="text-muted">Everything you submit must be true. We will contact the institution to verify it. Money is paid only to the institution, never to you personally. Please post an update after the money is paid. If we find that information was false, we will remove the need, return gifts and may report it to the authorities.</p></section>
        <section><h2 className="font-semibold">Our role</h2><p className="text-muted">Dreamer verifies needs carefully but cannot guarantee outcomes. We keep a record of every gift and payout, and show givers where their money went.</p></section>
        <section><h2 className="font-semibold">Reporting concerns</h2><p className="text-muted">Every need has a report link. We review reports within 24 hours and may pause a need while we check.</p></section>
      </div>
    </div>
  );
}
