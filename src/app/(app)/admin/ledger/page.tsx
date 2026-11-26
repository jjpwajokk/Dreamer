import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUS_LABEL, type NeedStatus } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { Notice, PageTitle, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ledger" };

/** Every naira in must be matched by a payout, or still be held for a need. */
export default async function Ledger() {
  const admin = createAdminClient();
  const [{ data: gifts }, { data: payouts }, { data: needs }] = await Promise.all([
    admin.from("contributions").select("need_id, amount_kobo, fee_kobo, tip_kobo, status").in("status", ["success", "redirected", "refunded"]),
    admin.from("payouts").select("need_id, amount_kobo").eq("status", "success"),
    admin.from("needs").select("id, display_name, status, raised_kobo").gt("raised_kobo", 0),
  ]);
  const inBy = new Map<string, number>();
  for (const g of (gifts ?? []).filter((x) => x.status === "success")) inBy.set(g.need_id, (inBy.get(g.need_id) ?? 0) + g.amount_kobo);
  const outBy = new Map<string, number>();
  for (const p of payouts ?? []) outBy.set(p.need_id, (outBy.get(p.need_id) ?? 0) + p.amount_kobo);
  const totalIn = [...inBy.values()].reduce((a, b) => a + b, 0);
  const totalOut = [...outBy.values()].reduce((a, b) => a + b, 0);
  const fees = (gifts ?? []).filter((g) => g.status !== "refunded").reduce((s, g) => s + g.fee_kobo + g.tip_kobo, 0);
  const refunded = (gifts ?? []).filter((g) => g.status === "refunded").reduce((s, g) => s + g.amount_kobo + g.fee_kobo + g.tip_kobo, 0);
  const rows = (needs ?? []).map((n) => {
    const inK = inBy.get(n.id) ?? 0;
    const outK = outBy.get(n.id) ?? 0;
    return { ...n, inK, outK, held: inK - outK, mismatch: inK !== n.raised_kobo };
  });
  const mismatches = rows.filter((r) => r.mismatch);

  return (
    <div>
      <PageTitle eyebrow="Admin" title="Ledger" subtitle="Gifts in, payouts out, platform fees, refunds, and what is held for each need right now." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Gifts in", formatNaira(totalIn)],
          ["Paid to institutions", formatNaira(totalOut)],
          ["Held for needs", formatNaira(totalIn - totalOut)],
          ["Platform fees", formatNaira(fees)],
          ["Refunded to givers", formatNaira(refunded)],
        ].map(([k, v]) => <Stat key={k} label={k!} value={v} />)}
      </div>
      <div className="mt-4">
        {mismatches.length ? (
          <Notice tone="danger">{mismatches.length} need(s) where confirmed gifts don&apos;t match the raised total. Investigate before paying out.</Notice>
        ) : (
          <Notice>Balanced: every need&apos;s raised total matches its confirmed gifts.</Notice>
        )}
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-2">Need</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">In</th><th className="px-4 py-2 text-right">Out</th><th className="px-4 py-2 text-right">Held</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className={r.mismatch ? "bg-danger-soft" : ""}>
                <td className="px-4 py-2"><Link className="hover:underline" href={`/admin/needs/${r.id}`}>{r.display_name}</Link></td>
                <td className="px-4 py-2">{STATUS_LABEL[r.status as NeedStatus]}</td>
                <td className="px-4 py-2 text-right">{formatNaira(r.inK)}</td>
                <td className="px-4 py-2 text-right">{formatNaira(r.outK)}</td>
                <td className="px-4 py-2 text-right font-semibold">{formatNaira(r.held)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
