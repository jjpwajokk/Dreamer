"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { NEED_LIFETIME_DAYS, paystackConfigured, siteUrl } from "@/lib/config";
import { createTransferRecipient, initiateTransfer, newReference, resolveAccount } from "@/lib/paystack";
import { sendEmail } from "@/lib/email";
import { formatNaira } from "@/lib/money";
import { notifyPaidOut, notifyUpdatePosted } from "@/lib/notify";

export type AdminResult = { ok?: boolean; error?: string; message?: string };

const CHECKS = ["identity", "amount", "institution", "account", "story"] as const;
const REQUIRED_CHECKS = ["identity", "amount", "institution", "account"] as const;

async function beneficiaryEmail(needId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: need } = await admin.from("needs").select("created_by").eq("id", needId).maybeSingle();
  if (!need?.created_by) return null;
  const { data: p } = await admin.from("profiles").select("email").eq("user_id", need.created_by).maybeSingle();
  return (p?.email as string) ?? null;
}

function refresh(needId?: string) {
  revalidatePath("/admin", "layout");
  if (needId) revalidatePath(`/admin/needs/${needId}`);
}

export async function saveChecks(needId: string, checks: { check: string; passed: boolean; note: string }[]): Promise<AdminResult> {
  const session = await assertAdmin();
  const rows = checks
    .filter((c) => (CHECKS as readonly string[]).includes(c.check))
    .map((c) => ({ need_id: needId, check: c.check, passed: c.passed, note: c.note?.slice(0, 500) || null, admin_id: session.userId }));
  const admin = createAdminClient();
  const { error } = await admin.from("verification_checks").upsert(rows, { onConflict: "need_id,check" });
  if (error) return { error: error.message };
  await logAudit({ actorId: session.userId, action: "need.checks_saved", entity: "need", entityId: needId, after: rows.map((r) => ({ check: r.check, passed: r.passed })) });
  refresh(needId);
  return { ok: true, message: "Checklist saved." };
}

export async function approveNeed(needId: string, verificationNote: string): Promise<AdminResult> {
  const session = await assertAdmin();
  const note = verificationNote.trim();
  if (note.length < 10) return { error: "Write a short public verification note, e.g. \"Fee invoice confirmed with the school bursar.\"" };
  const admin = createAdminClient();
  const { data: need } = await admin.from("needs").select("*").eq("id", needId).maybeSingle();
  if (!need) return { error: "Need not found." };
  if (!["submitted", "needs_info"].includes(need.status)) return { error: `Can't approve a need that is ${need.status}.` };
  if (!need.institution_id) return { error: "The need has no institution." };
  const { data: checks } = await admin.from("verification_checks").select("check, passed").eq("need_id", needId);
  const missing = REQUIRED_CHECKS.filter((c) => !(checks ?? []).some((x) => x.check === c && x.passed));
  if (missing.length) return { error: `Tick and save these checks first: ${missing.join(", ")}.` };

  const now = new Date();
  const after = {
    status: "live",
    verified_at: now.toISOString(),
    verified_by: session.userId,
    verification_note: note.slice(0, 300),
    published_at: now.toISOString(),
    expires_at: new Date(now.getTime() + NEED_LIFETIME_DAYS * 86_400_000).toISOString(),
    info_request: null,
  };
  const { error } = await admin.from("needs").update(after).eq("id", needId);
  if (error) return { error: error.message };
  await admin.from("institutions").update({ verified_at: now.toISOString(), verified_by: session.userId }).eq("id", need.institution_id).is("verified_at", null);
  await logAudit({ actorId: session.userId, action: "need.approved", entity: "need", entityId: needId, before: { status: need.status }, after });

  const to = await beneficiaryEmail(needId);
  if (to) {
    await sendEmail({
      to,
      subject: `${need.display_name}'s need is live and verified`,
      text: `Good news! ${need.display_name}'s need has been verified and is now live on Dreamer.\n\nShare this link on WhatsApp to reach more givers:\n${siteUrl()}/n/${need.slug}`,
    });
  }
  refresh(needId);
  return { ok: true, message: "Approved. The need is live." };
}

export async function requestInfo(needId: string, message: string): Promise<AdminResult> {
  const session = await assertAdmin();
  if (message.trim().length < 5) return { error: "Say what information is needed." };
  const admin = createAdminClient();
  const { data: need } = await admin.from("needs").select("status, display_name").eq("id", needId).maybeSingle();
  if (!need) return { error: "Need not found." };
  const { error } = await admin.from("needs").update({ status: "needs_info", info_request: message.trim().slice(0, 500) }).eq("id", needId);
  if (error) return { error: error.message };
  await logAudit({ actorId: session.userId, action: "need.info_requested", entity: "need", entityId: needId, before: { status: need.status }, after: { status: "needs_info", info_request: message } });
  const to = await beneficiaryEmail(needId);
  if (to) {
    await sendEmail({
      to,
      subject: `We need a little more information about ${need.display_name}'s need`,
      text: `Our verification team asked:\n\n"${message.trim()}"\n\nAdd it here: ${siteUrl()}/me/needs/${needId}`,
    });
  }
  refresh(needId);
  return { ok: true, message: "Sent back for more information." };
}

export async function rejectNeed(needId: string, reason: string): Promise<AdminResult> {
  const session = await assertAdmin();
  if (reason.trim().length < 5) return { error: "Give a reason. The person who posted will see it." };
  const admin = createAdminClient();
  const { data: need } = await admin.from("needs").select("status, display_name, raised_kobo").eq("id", needId).maybeSingle();
  if (!need) return { error: "Need not found." };
  if (need.raised_kobo > 0) return { error: "This need has received gifts. Resolve refunds before rejecting it." };
  const { error } = await admin.from("needs").update({ status: "rejected", rejection_reason: reason.trim().slice(0, 500) }).eq("id", needId);
  if (error) return { error: error.message };
  await logAudit({ actorId: session.userId, action: "need.rejected", entity: "need", entityId: needId, before: { status: need.status }, after: { status: "rejected", reason } });
  const to = await beneficiaryEmail(needId);
  if (to) await sendEmail({ to, subject: `About ${need.display_name}'s need`, text: `We weren't able to approve this need.\n\nReason: ${reason.trim()}\n\nIf you think this is a mistake, reply to this email.` });
  refresh(needId);
  return { ok: true, message: "Rejected." };
}

/** Pause a live need (e.g. after a report) by sending it back for information. */
export async function pauseNeed(needId: string, reason: string): Promise<AdminResult> {
  const session = await assertAdmin();
  const admin = createAdminClient();
  const { data: need } = await admin.from("needs").select("status").eq("id", needId).maybeSingle();
  if (!need || need.status !== "live") return { error: "Only live needs can be paused." };
  const { error } = await admin.from("needs").update({ status: "needs_info", info_request: reason || "Paused while our team checks a report." }).eq("id", needId);
  if (error) return { error: error.message };
  await logAudit({ actorId: session.userId, action: "need.paused", entity: "need", entityId: needId, before: { status: "live" }, after: { status: "needs_info", reason } });
  refresh(needId);
  return { ok: true, message: "Paused. It's hidden from givers until re-approved." };
}

const institutionEdit = z.object({
  name: z.string().trim().min(2).max(160),
  contact_name: z.string().trim().max(80).optional().or(z.literal("")),
  contact_phone: z.string().trim().max(20).optional().or(z.literal("")),
  bank_code: z.string().trim().min(3),
  bank_name: z.string().trim().max(80).optional().or(z.literal("")),
  account_number: z.string().trim().regex(/^\d{10}$/),
  account_name: z.string().trim().min(2).max(120),
});

export async function updateInstitution(institutionId: string, input: unknown): Promise<AdminResult> {
  const session = await assertAdmin();
  const parsed = institutionEdit.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const admin = createAdminClient();
  const { data: before } = await admin.from("institutions").select("*").eq("id", institutionId).maybeSingle();
  if (!before) return { error: "Institution not found." };
  const bankChanged = before.account_number !== parsed.data.account_number || before.bank_code !== parsed.data.bank_code;
  const { error } = await admin
    .from("institutions")
    .update({ ...parsed.data, ...(bankChanged ? { paystack_recipient_code: null, account_resolved_at: null } : {}) })
    .eq("id", institutionId);
  if (error) return { error: error.message };
  await logAudit({ actorId: session.userId, action: "institution.updated", entity: "institution", entityId: institutionId, before, after: parsed.data });
  refresh();
  return { ok: true, message: "Institution saved." };
}

export async function resolveInstitutionAccount(institutionId: string): Promise<AdminResult> {
  const session = await assertAdmin();
  if (!paystackConfigured()) return { error: "Add PAYSTACK_SECRET_KEY to check accounts." };
  const admin = createAdminClient();
  const { data: inst } = await admin.from("institutions").select("*").eq("id", institutionId).maybeSingle();
  if (!inst?.account_number || !inst.bank_code) return { error: "Add the bank and account number first." };
  try {
    const res = await resolveAccount(inst.account_number, inst.bank_code);
    await admin.from("institutions").update({ account_name: res.account_name, account_resolved_at: new Date().toISOString() }).eq("id", institutionId);
    await logAudit({ actorId: session.userId, action: "institution.account_resolved", entity: "institution", entityId: institutionId, before: { account_name: inst.account_name }, after: { account_name: res.account_name } });
    refresh();
    const match = normalize(res.account_name) === normalize(inst.account_name ?? "");
    return { ok: true, message: `Bank says: ${res.account_name}.${match ? " Matches." : " This differs from what was entered. Check it with the institution before paying."}` };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

function normalize(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function payableKobo(needId: string): Promise<{ need: Record<string, unknown> | null; amount: number; error?: string }> {
  const admin = createAdminClient();
  const { data: need } = await admin.from("needs").select("*").eq("id", needId).maybeSingle();
  if (!need) return { need: null, amount: 0, error: "Need not found." };
  if (!["funded", "expired"].includes(need.status)) return { need, amount: 0, error: "Payouts are for fully funded needs (or expired needs you choose to pay out)." };
  const { data: payouts } = await admin.from("payouts").select("amount_kobo, status").eq("need_id", needId);
  if ((payouts ?? []).some((p) => p.status === "pending")) return { need, amount: 0, error: "A payout is already in progress for this need." };
  const paid = (payouts ?? []).filter((p) => p.status === "success").reduce((s, p) => s + p.amount_kobo, 0);
  const amount = need.raised_kobo - paid;
  if (amount <= 0) return { need, amount: 0, error: "Nothing left to pay out." };
  return { need, amount };
}

export async function startPaystackPayout(needId: string): Promise<AdminResult> {
  const session = await assertAdmin();
  if (!paystackConfigured()) return { error: "Add PAYSTACK_SECRET_KEY to send transfers, or record a manual bank transfer." };
  const { need, amount, error } = await payableKobo(needId);
  if (error || !need) return { error };
  const admin = createAdminClient();
  const { data: inst } = await admin.from("institutions").select("*").eq("id", need.institution_id as string).maybeSingle();
  if (!inst) return { error: "Institution not found." };
  if (!inst.verified_at) return { error: "Verify the institution first." };
  if (!inst.account_resolved_at) return { error: "Confirm the account with \"Check account with bank\" first." };

  let recipient = inst.paystack_recipient_code as string | null;
  try {
    if (!recipient) {
      const r = await createTransferRecipient({ name: inst.account_name, accountNumber: inst.account_number, bankCode: inst.bank_code });
      recipient = r.recipient_code;
      await admin.from("institutions").update({ paystack_recipient_code: recipient }).eq("id", inst.id);
    }
  } catch (err) {
    return { error: (err as Error).message };
  }

  const reference = newReference("po");
  const { error: insertError } = await admin.from("payouts").insert({
    need_id: needId,
    institution_id: inst.id,
    amount_kobo: amount,
    method: "paystack",
    reference,
    status: "pending",
    initiated_by: session.userId,
  });
  if (insertError) return { error: insertError.message };
  await logAudit({ actorId: session.userId, action: "payout.initiated", entity: "need", entityId: needId, after: { amount_kobo: amount, reference, institution: inst.name } });

  try {
    const t = await initiateTransfer({ amountKobo: amount, recipientCode: recipient!, reference, reason: `Dreamer: ${need.display_name} (${need.slug})` });
    await admin.from("payouts").update({ paystack_transfer_code: t.transfer_code }).eq("reference", reference);
    if (t.status === "success") {
      await admin.rpc("record_transfer_result", { p_reference: reference, p_status: "success", p_transfer_code: t.transfer_code, p_reason: null });
      await notifyPaidOut(needId);
    }
    refresh(needId);
    if (t.status === "otp") return { ok: true, message: "Paystack wants an OTP for transfers. Turn off OTP for transfers in Paystack settings, then retry." };
    return { ok: true, message: t.status === "success" ? `Paid ${formatNaira(amount)} to ${inst.name}.` : `Transfer of ${formatNaira(amount)} started (${t.status}). It will be confirmed by Paystack shortly.` };
  } catch (err) {
    await admin.rpc("record_transfer_result", { p_reference: reference, p_status: "failed", p_transfer_code: null, p_reason: (err as Error).message });
    refresh(needId);
    return { error: (err as Error).message };
  }
}

export async function recordManualPayout(needId: string, bankReference: string): Promise<AdminResult> {
  const session = await assertAdmin();
  if (bankReference.trim().length < 4) return { error: "Enter the bank transfer reference or session ID." };
  const { need, amount, error } = await payableKobo(needId);
  if (error || !need) return { error };
  const admin = createAdminClient();
  const reference = newReference("po");
  const { error: insertError } = await admin.from("payouts").insert({
    need_id: needId,
    institution_id: need.institution_id,
    amount_kobo: amount,
    method: "manual",
    manual_reference: bankReference.trim().slice(0, 120),
    reference,
    status: "pending",
    initiated_by: session.userId,
  });
  if (insertError) return { error: insertError.message };
  const { error: rpcError } = await admin.rpc("record_transfer_result", { p_reference: reference, p_status: "success", p_transfer_code: null, p_reason: null });
  if (rpcError) return { error: rpcError.message };
  await logAudit({ actorId: session.userId, action: "payout.manual_recorded", entity: "need", entityId: needId, after: { amount_kobo: amount, bank_reference: bankReference } });
  await notifyPaidOut(needId);
  refresh(needId);
  return { ok: true, message: `Recorded a manual payout of ${formatNaira(amount)}.` };
}

export async function approveUpdate(updateId: string): Promise<AdminResult> {
  const session = await assertAdmin();
  const admin = createAdminClient();
  const { data: u } = await admin.from("updates").select("id, need_id, status").eq("id", updateId).maybeSingle();
  if (!u) return { error: "Update not found." };
  const { error } = await admin.from("updates").update({ status: "approved", approved_by: session.userId, approved_at: new Date().toISOString() }).eq("id", updateId);
  if (error) return { error: error.message };
  await admin.from("needs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", u.need_id).eq("status", "paid_out");
  await logAudit({ actorId: session.userId, action: "update.approved", entity: "update", entityId: updateId, before: { status: u.status }, after: { status: "approved" } });
  await notifyUpdatePosted(u.need_id);
  refresh();
  return { ok: true, message: "Approved and givers notified." };
}

export async function rejectUpdate(updateId: string, reason: string): Promise<AdminResult> {
  const session = await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("updates").update({ status: "rejected", rejection_reason: reason.slice(0, 300) || null }).eq("id", updateId);
  if (error) return { error: error.message };
  await logAudit({ actorId: session.userId, action: "update.rejected", entity: "update", entityId: updateId, after: { reason } });
  refresh();
  return { ok: true, message: "Update rejected." };
}

export async function setReportStatus(reportId: string, status: "reviewing" | "resolved" | "dismissed", note: string): Promise<AdminResult> {
  const session = await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("reports").update({ status, resolution_note: note.slice(0, 500) || null }).eq("id", reportId);
  if (error) return { error: error.message };
  await logAudit({ actorId: session.userId, action: `report.${status}`, entity: "report", entityId: reportId, after: { note } });
  refresh();
  return { ok: true, message: "Report updated." };
}
