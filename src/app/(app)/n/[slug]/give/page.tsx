import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Landmark, RotateCcw, ShieldCheck } from "lucide-react";
import { sector } from "@/lib/sectors";
import { getPublicNeed } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import { formatNaira, progressPercent } from "@/lib/money";
import { NeedAvatar, VerifiedBadge } from "@/components/need-bits";
import { Card, LinkButton, PageTitle, Progress } from "@/components/ui";
import { GiveForm } from "./give-form";

export const metadata: Metadata = { title: "Give" };

export default async function GivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicNeed(slug);
  if (!data) notFound();
  const { need } = data;
  const session = await getSession();
  const place = need.institution_label ?? sector(need.category).payeePhrase;

  return (
    <div>
      <Link href={`/n/${need.slug}`} className="mb-5 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {need.display_name}&apos;s story
      </Link>
      <PageTitle eyebrow="Give" title={`Give to ${need.display_name}`} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {need.status !== "live" ? (
            <Card className="p-8 text-center">
              <p className="font-display text-xl">{need.display_name}&apos;s need is fully met</p>
              <p className="mt-2 text-sm text-muted">Thank you for wanting to help. There are others you can meet.</p>
              <LinkButton href="/discover" className="mt-4">Meet someone else</LinkButton>
            </Card>
          ) : (
            <Card className="p-5 sm:p-7">
              <GiveForm
                needId={need.id}
                name={need.display_name}
                place={place}
                remainingKobo={need.remaining_kobo}
                defaultEmail={session?.email ?? ""}
                defaultName={session?.profile?.display_name ?? ""}
              />
            </Card>
          )}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-8">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <NeedAvatar name={need.display_name} photoPath={need.cover_photo_path} size={52} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold">{need.display_name} <VerifiedBadge verifiedAt={need.verified_at} compact /></p>
                <p className="truncate text-sm text-muted">{need.title}</p>
              </div>
            </div>
            <Progress percent={progressPercent(need.amount_kobo, need.raised_kobo)} className="mt-4" />
            <p className="tabular mt-2 text-xs text-muted">{formatNaira(need.raised_kobo)} raised of {formatNaira(need.amount_kobo)}</p>
          </Card>
          <div className="space-y-3 rounded-2xl border border-line bg-surface p-5 text-sm">
            <p className="flex items-start gap-2"><Landmark className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /> Paid straight to {place}, never to a personal account.</p>
            <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /> Checked by our team before it went live.</p>
            <p className="flex items-start gap-2"><RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /> If the need isn&apos;t met in time, you choose: a refund, or redirect to someone similar.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
