import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, Building2, CalendarClock, Landmark, MapPin, ShieldCheck, Users } from "lucide-react";
import { getPublicNeed } from "@/lib/queries";
import type { PublicNeed } from "@/lib/types";
import { CATEGORY_LABEL, CHECK_LABEL, daysLeft, formatDate } from "@/lib/format";
import { formatNaira, progressPercent } from "@/lib/money";
import { siteUrl } from "@/lib/config";
import { NeedAvatar, StatusPill, VerifiedBadge } from "@/components/need-bits";
import { Card, LinkButton, Progress } from "@/components/ui";
import { ReportButton } from "@/components/report-button";
import { ShareButton } from "@/components/share-button";
import { UpdateCard } from "@/components/update-card";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicNeed(slug);
  if (!data) return { title: "Need not found" };
  const { need } = data;
  const title = `${need.display_name}: ${need.title}`;
  const description = `“${need.my_words}” ${formatNaira(need.raised_kobo)} raised of ${formatNaira(need.amount_kobo)}. Verified, and paid straight to the ${need.institution_type ?? "institution"}.`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

export default async function NeedPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicNeed(slug);
  if (!data) notFound();
  const { need, checks, updates } = data;
  const pct = progressPercent(need.amount_kobo, need.raised_kobo);
  const left = daysLeft(need.expires_at);
  const url = `${siteUrl()}/n/${need.slug}`;
  const place = need.institution_label ?? (need.institution_type === "hospital" ? "the hospital" : "the school");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-start gap-4">
        <NeedAvatar name={need.display_name} photoPath={need.cover_photo_path} size={80} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={need.status} />
            <VerifiedBadge verifiedAt={need.verified_at} />
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight">{need.display_name}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-4 w-4" aria-hidden /> {need.city ? `${need.city}, ` : ""}{need.state} · {CATEGORY_LABEL[need.category]}
          </p>
        </div>
      </div>

      <blockquote className="mt-6 rounded-2xl bg-sun-soft px-5 py-4">
        <p className="font-display text-2xl leading-snug">&ldquo;{need.my_words}&rdquo;</p>
        <footer className="mt-1 text-sm text-[#6e470b]">In {need.display_name}&apos;s words</footer>
      </blockquote>

      <Card className="mt-6 p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-bold">{formatNaira(need.raised_kobo)}</p>
          <p className="text-sm text-muted">of {formatNaira(need.amount_kobo)}</p>
        </div>
        <Progress percent={pct} className="mt-3" />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1"><Users className="h-4 w-4" aria-hidden /> {need.giver_count} giver{need.giver_count === 1 ? "" : "s"}</span>
          {need.status === "live" && left !== null ? (
            <span className="flex items-center gap-1"><CalendarClock className="h-4 w-4" aria-hidden /> {left} day{left === 1 ? "" : "s"} left</span>
          ) : null}
        </div>
        {need.status === "live" ? (
          <LinkButton href={`/n/${need.slug}/give`} size="lg" className="mt-5 w-full">
            Give to {need.display_name}
          </LinkButton>
        ) : null}
        <p className="mt-3 flex items-start gap-2 text-xs text-muted">
          <Landmark className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Money goes straight to {place}, never to a personal account.
        </p>
      </Card>

      <MoneyTrail need={need} place={place} />

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">{need.title}</h2>
        <p className="mt-3 whitespace-pre-line text-[16px] leading-relaxed">{need.story}</p>
      </section>

      <section className="mt-8">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-brand" aria-hidden /> What we checked</h2>
          {need.verification_note ? <p className="mt-2 text-sm">{need.verification_note}</p> : null}
          <ul className="mt-3 space-y-2">
            {checks.map((c) => (
              <li key={c.check} className="flex items-center gap-2 text-sm">
                <BadgeCheck className="h-4 w-4 text-brand" aria-hidden /> {CHECK_LABEL[c.check] ?? c.check}
              </li>
            ))}
          </ul>
          {need.verified_at ? <p className="mt-3 text-xs text-muted">Verified by the Dreamer team on {formatDate(need.verified_at)}.</p> : null}
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Updates</h2>
        {updates.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            {need.status === "live"
              ? `When ${need.display_name}'s need is met, they will post an update here so givers can see what changed.`
              : `${need.display_name} will post an update here soon.`}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {updates.map((u) => <UpdateCard key={u.id} update={u} />)}
          </div>
        )}
      </section>

      <section className="mt-8 space-y-4">
        <ShareButton url={url} text={`${need.display_name}: “${need.my_words}” A verified need on Dreamer.`} label={`Share ${need.display_name}'s story`} />
        <ReportButton needId={need.id} />
      </section>
    </div>
  );
}

function MoneyTrail({ need, place }: { need: PublicNeed; place: string }) {
  const steps = [
    { done: Boolean(need.verified_at), label: "Verified", date: need.verified_at },
    { done: Boolean(need.published_at), label: "Live for givers", date: need.published_at },
    { done: Boolean(need.funded_at), label: "Fully funded", date: need.funded_at },
    { done: Boolean(need.payout_completed_at || need.paid_out_at), label: `Paid to ${place}`, date: need.payout_completed_at ?? need.paid_out_at },
  ];
  return (
    <Card className="mt-4 p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Building2 className="h-5 w-5 text-brand" aria-hidden /> Where the money goes</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3 text-sm">
            <span className={`h-3 w-3 shrink-0 rounded-full ${s.done ? "bg-brand" : "border-2 border-line"}`} aria-hidden />
            <span className={s.done ? "font-medium" : "text-muted"}>{s.label}</span>
            {s.done && s.date ? <span className="ml-auto text-xs text-muted">{formatDate(s.date)}</span> : null}
          </li>
        ))}
      </ol>
      {need.paid_out_kobo > 0 ? (
        <p className="mt-3 text-xs text-muted">{formatNaira(need.paid_out_kobo)} paid to {place}.</p>
      ) : null}
    </Card>
  );
}
