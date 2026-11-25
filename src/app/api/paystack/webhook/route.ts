import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyGiftReceived, notifyPaidOut } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaystackEvent = {
  event: string;
  data: {
    reference?: string;
    amount?: number;
    channel?: string;
    paid_at?: string;
    status?: string;
    transfer_code?: string;
    reason?: string;
    gateway_response?: string;
  };
};

/**
 * Paystack webhook. The ONLY place where a gift is counted toward a need
 * (raised_kobo) and where a Paystack payout is confirmed. The browser
 * redirect after checkout is never trusted.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(raw) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ref = event.data?.reference;
  if (!ref) return NextResponse.json({ ok: true, ignored: "no reference" });

  if (event.event === "charge.success") {
    const { data, error } = await admin.rpc("record_paystack_charge", {
      p_reference: ref,
      p_amount_paid_kobo: event.data.amount ?? 0,
      p_channel: event.data.channel ?? null,
      p_paid_at: event.data.paid_at ?? new Date().toISOString(),
    });
    if (error) {
      console.error("record_paystack_charge failed", error);
      return NextResponse.json({ error: "db" }, { status: 500 }); // Paystack retries
    }
    const result = data as { result: string; funded?: boolean };
    if (result.result === "ok") await notifyGiftReceived(ref, Boolean(result.funded));
    return NextResponse.json({ ok: true, result: result.result });
  }

  if (event.event === "charge.failed") {
    await admin.from("contributions").update({ status: "failed" }).eq("paystack_reference", ref).eq("status", "pending");
    return NextResponse.json({ ok: true });
  }

  if (event.event === "transfer.success" || event.event === "transfer.failed" || event.event === "transfer.reversed") {
    const status = event.event.split(".")[1] as "success" | "failed" | "reversed";
    const { data, error } = await admin.rpc("record_transfer_result", {
      p_reference: ref,
      p_status: status,
      p_transfer_code: event.data.transfer_code ?? null,
      p_reason: event.data.reason ?? event.data.gateway_response ?? null,
    });
    if (error) {
      console.error("record_transfer_result failed", error);
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
    const result = data as { result: string; need_id?: string };
    if (result.result === "ok" && status === "success" && result.need_id) await notifyPaidOut(result.need_id);
    return NextResponse.json({ ok: true, result: result.result });
  }

  return NextResponse.json({ ok: true, ignored: event.event });
}
