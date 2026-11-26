import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUS_LABEL, formatDate, type NeedStatus } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import type { Need } from "@/lib/types";
import { EscrowBadge, NeedAvatar, StatusPill, UrgencyBadge } from "@/components/need-bits";
import { Card, EmptyState, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Needs" };

const FILTERS: NeedStatus[] = ["submitted", "needs_info", "live", "funded", "paid_out", "completed", "expired", "rejected", "draft"];

export default async function AdminNeeds({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const escrowTab = raw === "escrow";
  const status = (FILTERS as string[]).includes(raw ?? "") ? (raw as NeedStatus) : "submitted";
  const admin = createAdminClient();
  let q = admin.from("needs").select("*");
  q = escrowTab ? q.in("status", ["live", "funded"]).is("verified_at", null) : q.eq("status", status);
  const { data } = await q.order(status === "submitted" || escrowTab ? "submitted_at" : "updated_at", { ascending: status === "submitted" || escrowTab }).limit(200);
  // Time-sensitive first, then the nearest deadline (or escrow deadline), then the order above.
  const rank = (n: Need) => (n.is_urgent ? 0 : 1) * 1e13 + (n.deadline ? new Date(n.deadline).getTime() : n.escrow_deadline ? new Date(n.escrow_deadline).getTime() : 9e12);
  const reviewQueue = escrowTab || ["submitted", "needs_info"].includes(status);
  const needs = ((data ?? []) as Need[]).map((n, i) => ({ n, i })).sort((a, b) => (reviewQueue ? rank(a.n) - rank(b.n) : 0) || a.i - b.i).map(({ n }) => n);
  const urgentCount = needs.filter((n) => n.is_urgent).length;

  return (
    <div>
      <PageTitle
        eyebrow="Admin"
        title="Needs"
        subtitle={
          escrowTab
            ? "Live and holding gifts, but not verified yet. Payouts stay locked until you verify; unverified after 30 days means automatic refunds."
            : reviewQueue
              ? `Time-sensitive first, then nearest deadline. Aim to decide within 48 hours (same day for time-sensitive).${urgentCount ? ` ${urgentCount} time-sensitive.` : ""}`
              : undefined
        }
      />
      <div className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <Link key={f} href={`/admin/needs?status=${f}`} className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${f === status && !escrowTab ? "bg-ink text-bg" : "bg-tint/5"}`}>
            {STATUS_LABEL[f]}
          </Link>
        ))}
        <Link href="/admin/needs?status=escrow" className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${escrowTab ? "bg-ink text-bg" : "bg-sun-soft text-sun-ink"}`}>In escrow</Link>
      </div>
      {needs.length === 0 ? (
        <EmptyState title="Nothing here" />
      ) : (
        <ul className="space-y-2">
          {needs.map((n) => (
            <li key={n.id}>
              <Link href={`/admin/needs/${n.id}`}>
                <Card className={`flex items-center gap-3 p-4 transition hover:border-brand/40 ${n.is_urgent && reviewQueue ? "border-danger/50 bg-danger-soft/40" : ""}`}>
                  <NeedAvatar name={n.display_name} photoPath={n.cover_photo_path} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{n.display_name}</p><StatusPill status={n.status} /><EscrowBadge verifiedAt={n.verified_at} status={n.status} /><UrgencyBadge isUrgent={n.is_urgent} deadline={n.deadline} /><span className="text-xs text-muted">{n.state}</span></div>
                    <p className="truncate text-sm text-muted">{n.title}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{formatNaira(n.amount_kobo)}</p>
                    <p className="text-xs text-muted">{formatDate(n.submitted_at ?? n.updated_at, true)}</p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
