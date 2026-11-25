import type { Metadata } from "next";
import { Notice, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageTitle title="Privacy policy" subtitle="Draft for the pilot. To be reviewed by a Nigerian lawyer before live payments." />
      <Notice tone="sun">This is a starting draft written for testing. It is not legal advice.</Notice>
      <div className="mt-6 space-y-5 text-[15px] leading-relaxed">
        <section><h2 className="font-semibold">What we collect</h2><p className="text-muted">For people posting needs: name, phone number, state, the story, the amount, the institution&apos;s details, and supporting documents (invoices, IDs, letters). For givers: email, optional name, and gift history. Payments are processed by Paystack; we never see or store card details.</p></section>
        <section><h2 className="font-semibold">What is public</h2><p className="text-muted">Only the first name, state, story, &ldquo;in my words&rdquo; line, amount, verification summary, optional photo and approved updates. Phone numbers, documents and bank details are never public. For anyone under 18, the school or hospital name is hidden too.</p></section>
        <section><h2 className="font-semibold">Why we use it</h2><p className="text-muted">To verify needs, pay institutions, prevent fraud, send receipts and updates, and keep an audit record of money movements. We rely on your consent (given when you submit a need) and our legitimate interest in preventing fraud, in line with the Nigeria Data Protection Act 2023.</p></section>
        <section><h2 className="font-semibold">Who can see private documents</h2><p className="text-muted">Only Dreamer&apos;s verification team. Documents are stored in a private, access-controlled store.</p></section>
        <section><h2 className="font-semibold">Children</h2><p className="text-muted">Needs for anyone under 18 must be submitted by, or with the consent of, a parent or guardian.</p></section>
        <section><h2 className="font-semibold">Your rights</h2><p className="text-muted">You can ask to see, correct or delete your data at any time. We keep financial records for as long as the law requires.</p></section>
      </div>
    </div>
  );
}
