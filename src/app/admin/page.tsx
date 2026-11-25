import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatNaira } from "@/lib/money";
import { Card, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";


export default async function AdminHome() {
  const admin = createAdminClient();
  const c = async (table: string, column: string, value: string | string[]) => {
    const q = admin.from(table).select("id", { count: "exact", head: true });
    const { count } = Array.isArray(value) ? await q.in(column, value) : await q.eq(column, value);
    return count ?? 0;
  };
  const [submitted, needsInfo, live, funded, completedOrPaid, pendingUpdates, openReports, money, givers] = await Promise.all([
    c("needs", "status", "submitted"),
    c("needs", "status", "needs_info"),
    c("needs", "status", "live"),
    c("needs", "status", "funded"),
    c("needs", "status", ["paid_out", "completed"]),
    c("updates", "status", "pending"),
    c("reports", "status", ["open", "reviewing"]),
    admin.from("contributions").select("amount_kobo, tip_kobo").eq("status", "success"),
    admin.from("contributions").select("giver_email").eq("status", "success"),
  ]);
  const raised = (money.data ?? []).reduce((s, r) => s + r.amount_kobo, 0);
  const tips = (money.data ?? []).reduce((s, r) => s + r.tip_kobo, 0);
  const uniqueGivers = new Set((givers.data ?? []).map((g) => (g.giver_email as string).toLowerCase())).size;

  const queues = [
    { label: "New needs to verify", value: submitted, href: "/admin/needs?status=submitted", urgent: submitted > 0 },
    { label: "Waiting on more info", value: needsInfo, href: "/admin/needs?status=needs_info" },
    { label: "Payouts due", value: funded, href: "/admin/payouts", urgent: funded > 0 },
    { label: "Updates to review", value: pendingUpdates, href: "/admin/updates", urgent: pendingUpdates > 0 },
    { label: "Open reports", value: openReports, href: "/admin/reports", urgent: openReports > 0 },
  ];
  const stats = [
    { label: "Live needs", value: String(live) },
    { label: "Paid out", value: String(completedOrPaid) },
    { label: "Raised for needs", value: formatNaira(raised) },
    { label: "Tips", value: formatNaira(tips) },
    { label: "Givers", value: String(uniqueGivers) },
  ];

  return (
    <div>
      <PageTitle title="Admin" subtitle="Start each day with the queues on the left." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {queues.map((q) => (
          <Link key={q.label} href={q.href}>
            <Card className={`p-5 transition hover:border-brand/40 ${q.urgent ? "border-sun" : ""}`}>
              <p className="text-3xl font-bold">{q.value}</p>
              <p className="text-sm text-muted">{q.label}</p>
            </Card>
          </Link>
        ))}
      </div>
      <h2 className="mt-8 font-display text-xl font-semibold">Numbers</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
