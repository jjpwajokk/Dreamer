import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUS_LABEL, formatDate, type NeedStatus } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import type { Need } from "@/lib/types";
import { NeedAvatar, StatusPill } from "@/components/need-bits";
import { Card, EmptyState, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Needs" };

const FILTERS: NeedStatus[] = ["submitted", "needs_info", "live", "funded", "paid_out", "completed", "expired", "rejected", "draft"];

export default async function AdminNeeds({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status = (FILTERS as string[]).includes(raw ?? "") ? (raw as NeedStatus) : "submitted";
  const admin = createAdminClient();
  const { data } = await admin
    .from("needs")
    .select("*")
    .eq("status", status)
    .order(status === "submitted" ? "submitted_at" : "updated_at", { ascending: status === "submitted" })
    .limit(200);
  const needs = (data ?? []) as Need[];

  return (
    <div>
      <PageTitle eyebrow="Admin" title="Needs" subtitle={status === "submitted" ? "Oldest first. Aim to decide within 48 hours." : undefined} />
      <div className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <Link key={f} href={`/admin/needs?status=${f}`} className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${f === status ? "bg-ink text-white" : "bg-black/5"}`}>
            {STATUS_LABEL[f]}
          </Link>
        ))}
      </div>
      {needs.length === 0 ? (
        <EmptyState title="Nothing here" />
      ) : (
        <ul className="space-y-2">
          {needs.map((n) => (
            <li key={n.id}>
              <Link href={`/admin/needs/${n.id}`}>
                <Card className="flex items-center gap-3 p-4 transition hover:border-brand/40">
                  <NeedAvatar name={n.display_name} photoPath={n.cover_photo_path} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{n.display_name}</p><StatusPill status={n.status} /><span className="text-xs text-muted">{n.state}</span></div>
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
