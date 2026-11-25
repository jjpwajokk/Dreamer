import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Landmark } from "lucide-react";
import { getPublicNeed } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import { formatNaira, progressPercent } from "@/lib/money";
import { NeedAvatar, VerifiedBadge } from "@/components/need-bits";
import { Card, LinkButton, Progress } from "@/components/ui";
import { GiveForm } from "./give-form";

export const metadata: Metadata = { title: "Give" };

export default async function GivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicNeed(slug);
  if (!data) notFound();
  const { need } = data;
  const session = await getSession();
  const place = need.institution_label ?? "the institution";

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Link href={`/n/${need.slug}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {need.display_name}&apos;s story
      </Link>
      <Card className="flex items-center gap-4 p-4">
        <NeedAvatar name={need.display_name} photoPath={need.cover_photo_path} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-lg font-semibold">{need.display_name}</p>
            <VerifiedBadge verifiedAt={need.verified_at} compact />
          </div>
          <p className="truncate text-sm text-muted">{need.title}</p>
          <Progress percent={progressPercent(need.amount_kobo, need.raised_kobo)} className="mt-2" />
          <p className="mt-1 text-xs text-muted">{formatNaira(need.raised_kobo)} of {formatNaira(need.amount_kobo)}</p>
        </div>
      </Card>

      {need.status !== "live" ? (
        <Card className="mt-6 p-6 text-center">
          <p className="font-display text-xl font-semibold">{need.display_name}&apos;s need is fully met</p>
          <p className="mt-2 text-sm text-muted">Thank you for wanting to help. There are others you can meet.</p>
          <LinkButton href="/discover" className="mt-4">Meet someone else</LinkButton>
        </Card>
      ) : (
        <>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">
            <Landmark className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Your gift is paid straight to {place}, not to a personal account.
          </p>
          <div className="mt-6">
            <GiveForm needId={need.id} name={need.display_name} remainingKobo={need.remaining_kobo} defaultEmail={session?.email ?? ""} />
          </div>
        </>
      )}
    </div>
  );
}
