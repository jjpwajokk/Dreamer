import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, Clock } from "lucide-react";
import { kycDone, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBanks } from "@/lib/banks";
import { signedUrls } from "@/lib/media";
import type { Organisation } from "@/lib/types";
import { Card, LinkButton, Notice, PageTitle } from "@/components/ui";
import { PhotoManager } from "@/components/photo-manager";
import { OrgForm } from "./org-form";

export const metadata: Metadata = { title: "My organisation" };
export const dynamic = "force-dynamic";

export default async function MyOrganisationPage() {
  const session = await requireUser("/me/organisation");
  const admin = createAdminClient();
  const { data: orgRow } = await admin.from("organisations").select("*").eq("owner_id", session.userId).order("created_at").limit(1).maybeSingle();
  const org = (orgRow as Organisation | null) ?? null;
  const [banks, docsRes, mediaRes] = await Promise.all([
    getBanks(),
    org ? admin.from("verification_documents").select("kind").eq("org_id", org.id) : Promise.resolve({ data: [] }),
    org ? admin.from("media").select("*").eq("org_id", org.id).eq("purpose", "org").order("created_at") : Promise.resolve({ data: [] }),
  ]);
  const media = (mediaRes.data ?? []) as { id: string; storage_path: string; caption: string | null; is_sensitive: boolean; visibility: "public" | "on_request"; moderation: "pending" | "approved" | "rejected" }[];
  const urls = await signedUrls(media.map((m) => m.storage_path));

  const status = org?.status;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <PageTitle
          eyebrow="Organisations"
          title={org ? org.name : "Register your organisation"}
          subtitle="For children's homes, care homes, NGOs, foundations, schools and community groups. Share your story and the good work you do, and raise support for specific needs."
          action={org && status === "verified" ? <LinkButton href={`/o/${org.slug}`} variant="secondary" size="sm">View public profile</LinkButton> : undefined}
        />
        {!kycDone(session) ? (
          <Notice tone="sun">First, please <Link href="/me/verify" className="font-semibold underline">get verified</Link> yourself. The person managing an organisation is verified too.</Notice>
        ) : null}
        {status === "submitted" ? <Notice tone="sun"><span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" aria-hidden /> Under review. We&apos;ll be in touch within 2 working days.</span></Notice> : null}
        {status === "needs_info" ? <Notice tone="sun">Our team asked for more information: {org?.review_note}</Notice> : null}
        {status === "verified" ? <Notice><span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4" aria-hidden /> Verified. You can now <Link className="font-semibold underline" href="/me/needs/new">share needs for your organisation</Link>.</span></Notice> : null}
        {status === "rejected" || status === "suspended" ? <Notice tone="danger">This organisation isn&apos;t active on Dreamer{org?.review_note ? `: ${org.review_note}` : "."}</Notice> : null}

        <Card className="p-5 sm:p-7">
          <OrgForm org={org} banks={banks} docs={docsRes.data ?? []} />
        </Card>

        {org ? (
          <Card className="space-y-3 p-5 sm:p-7">
            <h2 className="font-semibold">Photos of your work (up to 10)</h2>
            <p className="text-sm text-muted">Your home, your classrooms, your team, your events. Choose for each photo whether members can see it or only people you approve.</p>
            <PhotoManager
              scope={{ orgId: org.id, purpose: "org" }}
              max={10}
              photos={media.map((m, i) => ({ id: m.id, url: urls[i] ?? null, caption: m.caption, sensitive: m.is_sensitive, visibility: m.visibility, moderation: m.moderation }))}
              hint="Please don't show children's faces in a way that identifies where they live unless you have consent. Every photo is checked before it's shown."
            />
          </Card>
        ) : null}
      </div>
      <aside className="space-y-3 lg:sticky lg:top-8">
        <div className="rounded-2xl border border-line bg-surface p-5 text-sm">
          <p className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-brand" aria-hidden /> How it works</p>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-muted">
            <li>Tell us about your organisation and add your official bank account.</li>
            <li>Upload your CAC certificate (and any other documents you have).</li>
            <li>We verify your registration and account, usually within 2 working days.</li>
            <li>Your profile goes live, and you can share needs. Gifts go only to your official account.</li>
          </ol>
        </div>
      </aside>
    </div>
  );
}
