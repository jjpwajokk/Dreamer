import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payouts" };

export default async function AdminPayouts() {
  const admin = createAdminClient();
  const [{ data: due }, { data: recent }] = await Promise.all([
    admin.from("needs").select("id, display_name, title, raised_kobo, funded_at, institution:institutions(name, account_resolved_at)").eq("status", "funded").order("funded_at"),
    admin.from("payouts").select("*, need:needs(id, display_name), institution:institutions(name)").order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <div className="space-y-8">
      <div>
        <PageTitle title="Payouts due" subtitle="Fully funded needs waiting to be paid to the institution. Oldest first." />
        {(due ?? []).length === 0 ? <EmptyState title="No payouts due" /> : (
          <ul className="space-y-2">
            {(due ?? []).map((n) => {
              const inst = Array.isArray(n.institution) ? n.institution[0] : n.institution;
              return (
                <li key={n.id}>
                  <Link href={`/admin/needs/${n.id}`}>
                    <Card className="flex items-center justify-between gap-3 p-4 transition hover:border-brand/40">
                      <div className="min-w-0">
                        <p className="font-semibold">{n.display_name} <span className="font-normal text-muted">→ {inst?.name}</span></p>
                        <p className="text-sm text-muted">Funded {formatDate(n.funded_at)} · {inst?.account_resolved_at ? "account confirmed" : "account not checked yet"}</p>
                      </div>
                      <p className="font-semibold">{formatNaira(n.raised_kobo)}</p>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold">Recent payouts</h2>
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
          {(recent ?? []).map((p) => {
            const need = Array.isArray(p.need) ? p.need[0] : p.need;
            const inst = Array.isArray(p.institution) ? p.institution[0] : p.institution;
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span><Link className="font-medium hover:underline" href={`/admin/needs/${need?.id}`}>{need?.display_name}</Link> → {inst?.name}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={p.status === "success" ? "brand" : p.status === "pending" ? "sun" : "danger"}>{p.status}</Badge>
                  <span className="text-muted">{p.method}</span>
                  <span className="font-semibold">{formatNaira(p.amount_kobo)}</span>
                  <span className="text-xs text-muted">{formatDate(p.completed_at ?? p.created_at, true)}</span>
                </span>
              </li>
            );
          })}
          {(recent ?? []).length === 0 ? <li className="px-4 py-3 text-muted">No payouts yet.</li> : null}
        </ul>
      </div>
    </div>
  );
}
