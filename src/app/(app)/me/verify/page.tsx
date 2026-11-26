import type { Metadata } from "next";
import { BadgeCheck, Clock, Lock, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Notice, PageTitle } from "@/components/ui";
import { KycForm } from "./kyc-form";

export const metadata: Metadata = { title: "Get verified" };
export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const session = await requireUser("/me/verify");
  const p = session.profile;
  const { data: docs } = await createAdminClient().from("verification_documents").select("kind").eq("owner_id", session.userId).is("org_id", null);
  const status = p?.kyc_status ?? "none";

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <PageTitle
          eyebrow="Your account"
          title="Get verified"
          subtitle="A quick, private check that keeps Dreamer a place where everyone can trust everyone. It takes about 3 minutes."
        />
        {status === "verified" ? (
          <Notice><span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4" aria-hidden /> You&apos;re verified. Thank you for helping keep Dreamer trusted.</span></Notice>
        ) : status === "submitted" ? (
          <div className="mb-6"><Notice tone="sun"><span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" aria-hidden /> Thanks! We&apos;re confirming your details. You can update them below if anything changed.</span></Notice></div>
        ) : status === "rejected" ? (
          <div className="mb-6"><Notice tone="danger">We couldn&apos;t confirm your details{p?.kyc_note ? `: ${p.kyc_note}` : "."} Please check them and try again.</Notice></div>
        ) : null}
        {status !== "verified" ? (
          <Card className="mt-2 p-5 sm:p-7">
            <KycForm profile={p} docs={docs ?? []} />
          </Card>
        ) : null}
      </div>
      <aside className="space-y-3 lg:sticky lg:top-8">
        <div className="rounded-2xl border border-line bg-surface p-5 text-sm">
          <p className="font-semibold">Why we ask</p>
          <ul className="mt-3 space-y-3 text-muted">
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /> So givers know every need comes from a real, accountable person.</li>
            <li className="flex gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /> Your details are private. Only our small verification team can see them, and never your full ID number.</li>
            <li className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /> Verified members get a badge on their profile.</li>
          </ul>
        </div>
        <p className="px-1 text-xs text-muted">Giving doesn&apos;t need verification. You&apos;ll need it to share a need, to register an organisation, or to give more than ₦200,000 at once.</p>
      </aside>
    </div>
  );
}
