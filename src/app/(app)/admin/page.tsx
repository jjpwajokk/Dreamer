import Link from "next/link";
import { AlertCircle, ArrowRight, Banknote, BadgeCheck, Coins, Flag, HandCoins, Megaphone, Timer, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatNaira } from "@/lib/money";
import { PageTitle, SectionTitle, Stat } from "@/components/ui";
import { cn } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin overview" };

export default async function AdminHome() {
  const admin = createAdminClient();
  const c = async (table: string, column: string, value: string | string[]) => {
    const q = admin.from(table).select("id", { count: "exact", head: true });
    const { count } = Array.isArray(value) ? await q.in(column, value) : await q.eq(column, value);
    return count ?? 0;
  };
  const [submitted, needsInfo, live, funded, completedOrPaid, pendingUpdates, openReports, expired, money] = await Promise.all([
    c("needs", "status", "submitted"),
    c("needs", "status", "needs_info"),
    c("needs", "status", "live"),
    c("needs", "status", "funded"),
    c("needs", "status", ["paid_out", "completed"]),
    c("updates", "status", "pending"),
    c("reports", "status", ["open", "reviewing"]),
    admin.from("needs").select("id", { count: "exact", head: true }).eq("status", "expired").gt("raised_kobo", 0),
    admin.from("contributions").select("amount_kobo, fee_kobo, giver_email, status").in("status", ["success", "redirected"]),
  ]);
  const ok = (money.data ?? []).filter((r) => r.status === "success");
  const raised = ok.reduce((s, r) => s + r.amount_kobo, 0);
  const fees = (money.data ?? []).reduce((s, r) => s + (r.fee_kobo ?? 0), 0);
  const uniqueGivers = new Set(ok.map((g) => (g.giver_email as string).toLowerCase())).size;
  const expiredCount = expired.count ?? 0;

  const queues = [
    { label: "New needs to verify", value: submitted, href: "/admin/needs?status=submitted", Icon: BadgeCheck },
    { label: "Payouts due", value: funded, href: "/admin/payouts", Icon: Banknote },
    { label: "Updates to review", value: pendingUpdates, href: "/admin/updates", Icon: Megaphone },
    { label: "Open reports", value: openReports, href: "/admin/reports", Icon: Flag },
    { label: "Expired needs to settle", value: expiredCount, href: "/admin/expired", Icon: Timer },
    { label: "Waiting on more info", value: needsInfo, href: "/admin/needs?status=needs_info", Icon: AlertCircle, quiet: true },
  ];

  return (
    <div className="space-y-8">
      <PageTitle eyebrow="Admin" title="Overview" subtitle="Work through anything highlighted, top to bottom. Every action you take is recorded in the audit log." />

      <section>
        <SectionTitle>Your queues</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {queues.map(({ label, value, href, Icon, quiet }) => {
            const urgent = value > 0 && !quiet;
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  "group flex items-center gap-4 rounded-2xl border bg-surface p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(11,20,24,.18)]",
                  urgent ? "border-sun/60" : "border-line",
                )}
              >
                <span className={cn("grid h-11 w-11 place-items-center rounded-xl", urgent ? "bg-sun-soft text-[#8a5a10]" : "bg-black/[.04] text-muted")}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="tabular block text-2xl font-semibold tracking-[-0.03em]">{value}</span>
                  <span className="block text-sm text-muted">{label}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle>Platform</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Live needs" value={live} icon={<HandCoins className="h-4 w-4" aria-hidden />} tone="brand" />
          <Stat label="Needs paid out" value={completedOrPaid} icon={<Banknote className="h-4 w-4" aria-hidden />} />
          <Stat label="Raised for needs" value={formatNaira(raised)} icon={<Coins className="h-4 w-4" aria-hidden />} tone="brand" />
          <Stat label="Platform fees" value={formatNaira(fees)} hint="5%, capped at ₦5,000 per gift" icon={<Coins className="h-4 w-4" aria-hidden />} tone="sun" />
          <Stat label="Givers" value={uniqueGivers} icon={<Users className="h-4 w-4" aria-hidden />} />
        </div>
      </section>
    </div>
  );
}
