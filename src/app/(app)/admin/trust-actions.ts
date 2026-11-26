"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { fingerprint } from "@/lib/identity";
import { sendEmail } from "@/lib/email";
import { siteUrl, paystackConfigured } from "@/lib/config";
import { moderateMedia } from "@/lib/moderation";
import { resolveAccount } from "@/lib/paystack";
import type { AdminResult } from "./actions";

async function emailOf(userId: string): Promise<string | null> {
  const { data } = await createAdminClient().from("profiles").select("email").eq("user_id", userId).maybeSingle();
  return (data?.email as string) ?? null;
}

// ---------------------------------------------------------------- People (light KYC)

export async function reviewKyc(userId: string, decision: "verified" | "rejected", note: string): Promise<AdminResult> {
  const session = await assertAdmin();
  if (decision === "rejected" && note.trim().length < 5) return { error: "Tell the person what to fix, kindly and clearly." };
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("kyc_status, display_name").eq("user_id", userId).maybeSingle();
  if (!p) return { error: "Member not found." };
  const after = { kyc_status: decision, kyc_note: note.trim().slice(0, 500) || null, kyc_reviewed_at: new Date().toISOString(), kyc_reviewed_by: session.userId };
  const { error } = await admin.from("profiles").update(after).eq("user_id", userId);
  if (error) return { error: error.message };
  await logAudit({ actorId: session.userId, action: `kyc.${decision}`, entity: "profile", entityId: userId, before: { kyc_status: p.kyc_status }, after });
  const to = await emailOf(userId);
  if (to) {
    await sendEmail({
      to,
      subject: decision === "verified" ? "You're verified on Dreamer" : "One more step to get verified",
      text:
        decision === "verified"
          ? `Hi ${p.display_name ?? "there"}, you're verified! You can now share needs, register an organisation and give any amount.\n\n${siteUrl()}/me`
          : `Hi ${p.display_name ?? "there"}, we couldn't finish verifying you yet:\n\n"${note.trim()}"\n\nYou can update your details here: ${siteUrl()}/me/verify`,
    });
  }
  revalidatePath("/admin/people");
  return { ok: true, message: decision === "verified" ? "Verified." : "Sent back with your note." };
}

/**
 * Permanent ban for fraud. Records fingerprints (never raw values) of the
 * person's email, phone, ID and bank accounts so they can't return, blocks
 * sign-in, closes their needs and marks any gifts for a full refund.
 */
export async function banUser(userId: string, reason: string): Promise<AdminResult> {
  const session = await assertAdmin();
  if (reason.trim().length < 10) return { error: "Record a clear reason. It is kept in the audit log." };
  if (userId === session.userId) return { error: "You can't ban yourself." };
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!p) return { error: "Member not found." };
  if (p.role === "admin") return { error: "Remove admin rights first." };
  const now = new Date().toISOString();

  const hashes: { hash: string; kind: string }[] = [];
  if (p.email) hashes.push({ hash: fingerprint("email", p.email), kind: "email" });
  if (p.phone) hashes.push({ hash: fingerprint("phone", p.phone), kind: "phone" });
  if (p.id_hash) hashes.push({ hash: p.id_hash as string, kind: "id" });
  const { data: accts } = await admin.from("institutions").select("account_number").eq("created_by", userId).eq("type", "personal_account");
  const { data: orgs } = await admin.from("organisations").select("id, account_number").eq("owner_id", userId);
  for (const a of [...(accts ?? []), ...(orgs ?? [])]) {
    if (a.account_number) hashes.push({ hash: fingerprint("account", a.account_number as string), kind: "account" });
  }
  if (hashes.length) {
    await admin.from("banned_identities").upsert(
      hashes.map((h) => ({ ...h, user_id: userId, reason: reason.trim().slice(0, 300), created_by: session.userId })),
      { onConflict: "hash" },
    );
  }

  await admin.from("profiles").update({ banned_at: now, ban_reason: reason.trim().slice(0, 300) }).eq("user_id", userId);
  await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });

  // Close their needs. Gifts on needs that can no longer be trusted are refunded.
  const { data: needs } = await admin.from("needs").select("id, status").eq("created_by", userId);
  const closedIds: string[] = [];
  for (const n of needs ?? []) {
    if (["draft", "submitted", "needs_info"].includes(n.status)) {
      await admin.from("needs").update({ status: "rejected", rejection_reason: "Account closed" }).eq("id", n.id);
    } else if (["live", "funded"].includes(n.status)) {
      await admin.from("needs").update({ status: "expired", expiry_reason: "removed" }).eq("id", n.id);
      closedIds.push(n.id);
    }
  }
  if (closedIds.length) {
    await admin.from("contributions").update({ expiry_choice: "refund", expiry_choice_at: now }).in("need_id", closedIds).eq("status", "success");
  }
  if (orgs?.length) await admin.from("organisations").update({ status: "suspended", review_note: "Account closed" }).in("id", orgs.map((o) => o.id));

  await logAudit({
    actorId: session.userId,
    action: "profile.banned",
    entity: "profile",
    entityId: userId,
    after: { reason, fingerprints: hashes.map((h) => h.kind), needs_closed: closedIds.length, orgs_suspended: orgs?.length ?? 0 },
  });
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    message: `Account closed permanently.${closedIds.length ? ` ${closedIds.length} need(s) closed; refund their gifts from Expired needs.` : ""}`,
  };
}

// ---------------------------------------------------------------- Organisations (KYB)

export async function reviewOrganisation(
  orgId: string,
  decision: "verified" | "needs_info" | "rejected" | "suspended",
  note: string,
): Promise<AdminResult> {
  const session = await assertAdmin();
  if (decision !== "verified" && note.trim().length < 5) return { error: "Add a short note for the organisation." };
  const admin = createAdminClient();
  const { data: org } = await admin.from("organisations").select("*").eq("id", orgId).maybeSingle();
  if (!org) return { error: "Organisation not found." };
  const now = new Date().toISOString();

  if (decision === "verified") {
    if (!org.account_number || !org.bank_code || !org.account_name) return { error: "The organisation has no bank account yet." };
    const { count } = await admin.from("verification_documents").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("kind", "cac_certificate");
    if (!count) return { error: "There's no CAC certificate to check yet." };
    const { data: owner } = await admin.from("profiles").select("kyc_status").eq("user_id", org.owner_id).maybeSingle();
    if (owner?.kyc_status !== "verified") return { error: "Verify the person managing this organisation first (People)." };
  }

  const after: Record<string, unknown> = { status: decision, review_note: note.trim().slice(0, 500) || null };
  if (decision === "verified") Object.assign(after, { verified_at: now, verified_by: session.userId });
  const { error } = await admin.from("organisations").update(after).eq("id", orgId);
  if (error) return { error: error.message };

  if (decision === "verified") {
    // The organisation's official account becomes a verified payee.
    const { data: inst } = await admin.from("institutions").select("id").eq("org_id", orgId).eq("type", "organisation").maybeSingle();
    const payee = {
      name: org.name,
      type: "organisation",
      state: org.state,
      address: org.address,
      contact_name: org.contact_name,
      contact_phone: org.contact_phone,
      bank_code: org.bank_code,
      bank_name: org.bank_name,
      account_number: org.account_number,
      account_name: org.account_name,
      account_resolved_at: org.account_resolved_at,
      org_id: orgId,
      verified_at: now,
      verified_by: session.userId,
    };
    if (inst) await admin.from("institutions").update(payee).eq("id", inst.id);
    else await admin.from("institutions").insert({ ...payee, created_by: org.owner_id });
  }
  if (decision === "suspended") {
    await admin.from("needs").update({ status: "needs_info", info_request: "Paused while our team reviews the organisation." }).eq("org_id", orgId).eq("status", "live");
  }

  await logAudit({ actorId: session.userId, action: `organisation.${decision}`, entity: "organisation", entityId: orgId, before: { status: org.status }, after });
  const to = org.contact_email || (await emailOf(org.owner_id));
  if (to) {
    const subject: Record<typeof decision, string> = {
      verified: `${org.name} is verified on Dreamer`,
      needs_info: `A little more information for ${org.name}`,
      rejected: `About ${org.name}'s application`,
      suspended: `${org.name}'s page is paused`,
    };
    const body: Record<typeof decision, string> = {
      verified: `Welcome! ${org.name} is verified and its profile is live. You can now share needs for the people you support.\n\n${siteUrl()}/o/${org.slug}`,
      needs_info: `Our team asked:\n\n"${note.trim()}"\n\nUpdate your organisation here: ${siteUrl()}/me/organisation`,
      rejected: `We weren't able to verify ${org.name}.\n\n${note.trim()}\n\nIf you think this is a mistake, reply to this email.`,
      suspended: `${org.name}'s page is paused while we review it.\n\n${note.trim()}\n\nReply to this email if you have questions.`,
    };
    await sendEmail({ to, subject: subject[decision], text: body[decision] });
  }
  revalidatePath("/admin/organisations");
  revalidatePath(`/admin/organisations/${orgId}`);
  revalidatePath("/organisations");
  return { ok: true, message: "Saved." };
}

export async function resolveOrgAccount(orgId: string): Promise<AdminResult> {
  const session = await assertAdmin();
  if (!paystackConfigured()) return { error: "Add PAYSTACK_SECRET_KEY to check accounts with the bank." };
  const admin = createAdminClient();
  const { data: org } = await admin.from("organisations").select("account_number, bank_code, account_name").eq("id", orgId).maybeSingle();
  if (!org?.account_number || !org.bank_code) return { error: "No bank account yet." };
  try {
    const res = await resolveAccount(org.account_number, org.bank_code);
    await admin.from("organisations").update({ account_name: res.account_name, account_resolved_at: new Date().toISOString() }).eq("id", orgId);
    await logAudit({ actorId: session.userId, action: "organisation.account_resolved", entity: "organisation", entityId: orgId, before: { account_name: org.account_name }, after: { account_name: res.account_name } });
    revalidatePath(`/admin/organisations/${orgId}`);
    return { ok: true, message: `Bank says: ${res.account_name}.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------- Photos (moderation)

export async function moderatePhoto(mediaId: string, decision: "approved" | "rejected", sensitive: boolean): Promise<AdminResult> {
  const session = await assertAdmin();
  const admin = createAdminClient();
  const { data: m } = await admin.from("media").select("moderation, is_sensitive").eq("id", mediaId).maybeSingle();
  if (!m) return { error: "Photo not found." };
  const after = { moderation: decision, is_sensitive: sensitive, moderation_source: "human", reviewed_by: session.userId, reviewed_at: new Date().toISOString() };
  const { error } = await admin.from("media").update(after).eq("id", mediaId);
  if (error) return { error: error.message };
  await logAudit({ actorId: session.userId, action: `media.${decision}`, entity: "media", entityId: mediaId, before: m, after });
  revalidatePath("/admin/photos");
  return { ok: true };
}

/** Re-runs automated moderation on a photo (when an AI service is configured). */
export async function rescanPhoto(mediaId: string): Promise<AdminResult> {
  const session = await assertAdmin();
  await moderateMedia(mediaId);
  await logAudit({ actorId: session.userId, action: "media.rescanned", entity: "media", entityId: mediaId });
  revalidatePath("/admin/photos");
  return { ok: true, message: "Rescanned." };
}
