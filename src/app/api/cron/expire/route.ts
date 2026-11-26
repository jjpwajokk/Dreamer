import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNeedExpired, notifyEscrowRefund, remindForUpdate } from "@/lib/notify";
import { paystackConfigured } from "@/lib/config";
import { refundTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 86_400_000;

/**
 * Daily (vercel.json):
 * 0. escrow: closes needs still unverified after 30 days and refunds every gift
 *    (through Paystack when connected; otherwise they wait in /admin/expired),
 * 1. marks live needs past their 30 days as expired,
 * 2. asks givers of newly expired needs to choose a refund or a redirect,
 * 3. reminds people who were helped to post an update at 2 weeks and 3 months.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();

  // Escrow first, so an unverified need is closed as "unverified" (refund only)
  // rather than "time" (where givers could choose to redirect).
  const { data: closedUnverified, error: escrowError } = await admin.rpc("close_unverified_needs");
  if (escrowError) return NextResponse.json({ error: escrowError.message }, { status: 500 });
  let refunded = 0;
  const { data: owed } = await admin
    .from("contributions")
    .select("id, paystack_reference, need:needs!inner(id, status, expiry_reason)")
    .eq("status", "success")
    .eq("expiry_choice", "refund")
    .eq("need.status", "expired")
    .in("need.expiry_reason", ["unverified", "removed"])
    .limit(40);
  for (const c of owed ?? []) {
    let note = "";
    if (paystackConfigured() && c.paystack_reference) {
      try {
        await refundTransaction(c.paystack_reference as string);
        note = "paystack_refund_auto";
      } catch {
        continue; // left for an admin in /admin/expired
      }
    } else {
      continue;
    }
    const { data: r } = await admin.rpc("record_refund", { p_contribution_id: c.id, p_actor: null, p_note: note });
    if ((r as { result?: string } | null)?.result === "ok") {
      refunded++;
      await notifyEscrowRefund(c.id as string);
    }
  }

  const { data: expired, error } = await admin.rpc("expire_needs");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Expiry notices
  const { data: toNotify } = await admin
    .from("needs")
    .select("id, display_name")
    .eq("status", "expired")
    .gt("raised_kobo", 0)
    .is("expiry_notice_at", null)
    .limit(50);
  for (const n of toNotify ?? []) {
    await notifyNeedExpired(n.id as string, n.display_name as string);
    await admin.from("needs").update({ expiry_notice_at: new Date().toISOString() }).eq("id", n.id);
  }

  // Update reminders: only for needs paid out with no approved update since.
  const now = Date.now();
  const { data: paid } = await admin
    .from("needs")
    .select("id, paid_out_at, reminded_2w_at, reminded_3m_at")
    .in("status", ["paid_out", "completed"])
    .not("paid_out_at", "is", null)
    .or("reminded_2w_at.is.null,reminded_3m_at.is.null")
    .limit(200);
  let reminded = 0;
  for (const n of paid ?? []) {
    const age = now - new Date(n.paid_out_at as string).getTime();
    const which = !n.reminded_3m_at && age >= 90 * DAY ? "3m" : !n.reminded_2w_at && age >= 14 * DAY ? "2w" : null;
    if (!which) continue;
    const { count } = await admin
      .from("updates")
      .select("id", { count: "exact", head: true })
      .eq("need_id", n.id)
      .eq("status", "approved")
      .gte("created_at", new Date(now - (which === "3m" ? 60 : 14) * DAY).toISOString());
    if (!count) {
      await remindForUpdate(n.id as string, which);
      reminded++;
    }
    await admin
      .from("needs")
      .update(which === "3m" ? { reminded_3m_at: new Date().toISOString(), reminded_2w_at: n.reminded_2w_at ?? new Date().toISOString() } : { reminded_2w_at: new Date().toISOString() })
      .eq("id", n.id);
  }

  return NextResponse.json({ closedUnverified, refunded, expired, expiryNotices: toNotify?.length ?? 0, reminded });
}
