import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getImpact } from "@/lib/impact";
import { formatDate } from "@/lib/format";
import { formatNaira, progressPercent } from "@/lib/money";
import { siteUrl } from "@/lib/config";
import { NeedAvatar, StatusPill } from "@/components/need-bits";
import { Card, EmptyState, LinkButton, PageTitle, Progress } from "@/components/ui";
import { ShareButton } from "@/components/share-button";
import { UpdateCard } from "@/components/update-card";

export const metadata: Metadata = { title: "My giving" };

export default async function MyGivingPage() {
  const session = await requireUser("/me");
  const impact = await getImpact(session.userId);
  const name = session.profile?.display_name ?? "I";
  const shareUrl = session.profile ? `${siteUrl()}/impact/${session.profile.id}` : siteUrl();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageTitle title="My giving" subtitle="Where every naira went, and what it changed." />

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand to-[#1f9d7f] p-6 text-white">
          <p className="text-sm text-white/80">You have given</p>
          <p className="mt-1 font-display text-4xl font-semibold">{formatNaira(impact.totalKobo)}</p>
          <p className="mt-2 text-sm text-white/90">
            to {impact.needs.length} {impact.needs.length === 1 ? "person" : "people"} · {impact.needs.filter((n) => ["paid_out", "completed"].includes(n.status)).length} paid to their school or hospital
          </p>
        </div>
        {impact.giftCount > 0 ? (
          <div className="p-4">
            <ShareButton url={shareUrl} text={`${name === "I" ? "I" : name} helped ${impact.needs.length} ${impact.needs.length === 1 ? "person" : "people"} on Dreamer.`} label="Share my impact card" />
          </div>
        ) : null}
      </Card>

      {impact.needs.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Your story starts with one person" action={<LinkButton href="/discover">Meet someone</LinkButton>}>
            When you give, you&apos;ll see here when the money reaches the school, and every update from the person you helped. Gave as a guest? Sign in with the same email and your gifts appear here.
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold">People you helped</h2>
            <ul className="mt-3 space-y-3">
              {impact.needs.map((n) => (
                <li key={n.id}>
                  <Link href={`/n/${n.slug}`}>
                    <Card className="p-4 transition hover:border-brand/40">
                      <div className="flex items-center gap-3">
                        <NeedAvatar name={n.display_name} photoPath={n.cover_photo_path} size={44} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{n.display_name}</p><StatusPill status={n.status} /></div>
                          <p className="truncate text-sm text-muted">{n.title}</p>
                        </div>
                        <p className="text-sm font-semibold">{formatNaira(n.given_kobo)}</p>
                      </div>
                      <Progress percent={progressPercent(n.amount_kobo, n.raised_kobo)} className="mt-3" />
                      <p className="mt-2 text-xs text-muted">
                        {n.payout_completed_at || n.paid_out_at
                          ? `Paid to ${n.institution_label ?? "the institution"} on ${formatDate(n.payout_completed_at ?? n.paid_out_at)}`
                          : n.status === "funded"
                            ? "Fully funded. Payment to the institution is on its way."
                            : `${formatNaira(n.remaining_kobo)} still needed`}
                      </p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><HeartHandshake className="h-5 w-5 text-brand" aria-hidden /> Updates from people you helped</h2>
            {impact.updates.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No updates yet. People post one after their fees or bills are paid, and we&apos;ll email you when they do.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {impact.updates.map((u) => (
                  <UpdateCard key={u.id} update={u} heading={<Link href={`/n/${u.slug}`} className="font-semibold hover:underline">{u.display_name}</Link>} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
