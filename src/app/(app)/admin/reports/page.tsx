import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import { ReportReview } from "../admin-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

export default async function AdminReports() {
  const admin = createAdminClient();
  const { data } = await admin.from("reports").select("*, need:needs(id, display_name, status)").order("created_at", { ascending: false }).limit(100);
  const reports = data ?? [];
  return (
    <div>
      <PageTitle eyebrow="Admin" title="Reports" subtitle="Concerns raised by visitors. To hide a live need while you check, open it and pause it." />
      {reports.length === 0 ? <EmptyState title="No reports" /> : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const need = Array.isArray(r.need) ? r.need[0] : r.need;
            return (
              <li key={r.id}>
                <Card className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link className="font-semibold hover:underline" href={`/admin/needs/${need?.id}`}>{need?.display_name}</Link>
                    <Badge tone={r.status === "open" ? "danger" : r.status === "reviewing" ? "sun" : "neutral"}>{r.status}</Badge>
                    <span className="text-xs text-muted">{formatDate(r.created_at)} {r.reporter_email ? `· ${r.reporter_email}` : ""}</span>
                  </div>
                  <p className="whitespace-pre-line text-sm">{r.reason}</p>
                  {r.resolution_note ? <p className="text-xs text-muted">Note: {r.resolution_note}</p> : null}
                  {["open", "reviewing"].includes(r.status) ? <ReportReview reportId={r.id} /> : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
