"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { firstError, institutionSchema, needBasicsSchema, needStorySchema, personalAccountSchema, updateSchema } from "@/lib/validation";
import { getSession, kycDone } from "@/lib/auth";
import { isBanned } from "@/lib/identity";
import { logAudit } from "@/lib/audit";
import { ESCROW_DAYS, NEED_LIFETIME_DAYS, siteUrl } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export type ActionResult = { ok?: boolean; error?: string; needId?: string; id?: string };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Step 1 and 2: create the draft, or update its basics. */
export async function saveBasics(needId: string | null, input: unknown): Promise<ActionResult> {
  const parsed = needBasicsSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };

  let orgId: string | null = null;
  if (parsed.data.org_id) {
    const { data: org } = await supabase.from("organisations").select("id, status, owner_id").eq("id", parsed.data.org_id).maybeSingle();
    if (!org || org.owner_id !== user.id) return { error: "You can only post for your own organisation." };
    if (org.status !== "verified") return { error: "Your organisation needs to be verified before it can post needs." };
    orgId = org.id as string;
  }

  const values = {
    relationship: orgId ? "organisation" : parsed.data.relationship === "organisation" ? "other" : parsed.data.relationship,
    category: parsed.data.category,
    display_name: parsed.data.display_name.split(/\s+/)[0]!,
    is_minor: parsed.data.is_minor,
    state: parsed.data.state,
    city: parsed.data.city || null,
    contact_phone: parsed.data.contact_phone,
    title: parsed.data.title,
    amount_kobo: parsed.data.amount_kobo,
    is_urgent: parsed.data.is_urgent ?? false,
    deadline: parsed.data.deadline || null,
  };

  if (needId) {
    const { error } = await supabase.from("needs").update(values).eq("id", needId);
    if (error) return { error: friendly(error.message) };
    return { ok: true, needId };
  }
  const { data, error } = await supabase
    .from("needs")
    .insert({ ...values, org_id: orgId, slug: slugify(values.display_name), status: "draft" })
    .select("id")
    .single();
  if (error) return { error: friendly(error.message) };
  await supabase.from("profiles").update({ role: "beneficiary" }).eq("user_id", user.id).eq("role", "giver");
  revalidatePath("/me/needs");
  return { ok: true, needId: data.id };
}

/** Step 3: story and "in my words". */
export async function saveStory(needId: string, input: unknown): Promise<ActionResult> {
  const parsed = needStorySchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };
  const { error } = await supabase.from("needs").update(parsed.data).eq("id", needId);
  if (error) return { error: friendly(error.message) };
  return { ok: true, needId };
}

/** Organisation needs are always paid to the organisation's own verified account. */
export async function linkOrganisationAccount(needId: string): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };
  const { data: need } = await supabase.from("needs").select("id, org_id").eq("id", needId).maybeSingle();
  if (!need?.org_id) return { error: "This need isn't linked to an organisation." };
  const admin = createAdminClient();
  const { data: org } = await admin.from("organisations").select("*").eq("id", need.org_id).maybeSingle();
  if (!org || org.owner_id !== user.id || org.status !== "verified") return { error: "Your organisation must be verified first." };
  let { data: inst } = await admin.from("institutions").select("id").eq("org_id", org.id).eq("type", "organisation").eq("account_number", org.account_number).maybeSingle();
  if (!inst) {
    const { data: created, error } = await admin
      .from("institutions")
      .insert({
        name: org.name,
        type: "organisation",
        org_id: org.id,
        state: org.state,
        address: org.address,
        contact_name: org.contact_name,
        contact_phone: org.contact_phone,
        bank_code: org.bank_code,
        bank_name: org.bank_name,
        account_number: org.account_number,
        account_name: org.account_name,
        account_resolved_at: org.account_resolved_at,
        verified_at: org.verified_at,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) return { error: "Couldn't link your organisation's account." };
    inst = created;
  }
  const { error } = await admin.from("needs").update({ institution_id: inst!.id }).eq("id", needId).in("status", ["draft", "needs_info"]);
  if (error) return { error: friendly(error.message) };
  return { ok: true, needId };
}

/**
 * Optional, individuals only: a personal account in the beneficiary's own
 * name. Dreamer still pays the school, hospital or supplier by default; the
 * team uses this only when the payee can't receive a transfer, after
 * verification, and every such choice is logged.
 */
export async function savePersonalAccount(needId: string, input: unknown): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };
  const { data: need } = await supabase.from("needs").select("id, org_id, personal_payee_id, display_name, state").eq("id", needId).maybeSingle();
  if (!need) return { error: "Need not found." };
  if (need.org_id) return { error: "Organisations are paid only to their official account." };
  if (input === null) {
    const { error } = await supabase.from("needs").update({ personal_payee_id: null }).eq("id", needId);
    return error ? { error: friendly(error.message) } : { ok: true };
  }
  const parsed = personalAccountSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (await isBanned([{ kind: "account", value: parsed.data.account_number }])) return { error: "This account can't be used on Dreamer." };
  const values = { ...parsed.data, name: parsed.data.account_name, type: "personal_account", state: need.state };
  if (need.personal_payee_id) {
    const { error } = await supabase.from("institutions").update(values).eq("id", need.personal_payee_id);
    if (error) return { error: friendly(error.message) };
    return { ok: true };
  }
  const { data: inst, error } = await supabase.from("institutions").insert(values).select("id").single();
  if (error) return { error: friendly(error.message) };
  const { error: linkError } = await supabase.from("needs").update({ personal_payee_id: inst.id }).eq("id", needId);
  if (linkError) return { error: friendly(linkError.message) };
  return { ok: true };
}

/** Step 4: the school, hospital, landlord or supplier that will receive the money. */
export async function saveInstitution(needId: string, input: unknown): Promise<ActionResult> {
  const parsed = institutionSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };
  const { data: need } = await supabase.from("needs").select("id, institution_id, org_id").eq("id", needId).maybeSingle();
  if (!need) return { error: "Need not found." };
  if (need.org_id) return linkOrganisationAccount(needId);
  if (await isBanned([{ kind: "account", value: parsed.data.account_number }])) return { error: "This account can't be used on Dreamer." };

  const values = { ...parsed.data, address: parsed.data.address || null };
  if (need.institution_id) {
    const { data: existing } = await supabase.from("institutions").select("id, verified_at, created_by").eq("id", need.institution_id).maybeSingle();
    if (existing && !existing.verified_at && existing.created_by === user.id) {
      const { error } = await supabase.from("institutions").update(values).eq("id", existing.id);
      if (error) return { error: friendly(error.message) };
      return { ok: true, needId };
    }
  }
  const { data: inst, error } = await supabase.from("institutions").insert(values).select("id").single();
  if (error) return { error: friendly(error.message) };
  const { error: linkError } = await supabase.from("needs").update({ institution_id: inst.id }).eq("id", needId);
  if (linkError) return { error: friendly(linkError.message) };
  return { ok: true, needId };
}

export async function setCoverPhoto(needId: string, path: string | null): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };
  if (path && !path.startsWith(`${user.id}/`)) return { error: "Invalid file." };
  const { error } = await supabase.from("needs").update({ cover_photo_path: path }).eq("id", needId);
  if (error) return { error: friendly(error.message) };
  return { ok: true };
}

export async function recordDocument(needId: string, kind: string, storagePath: string, fileName: string): Promise<ActionResult> {
  const kindOk = z.enum(["invoice", "id", "letter", "photo", "other"]).safeParse(kind);
  if (!kindOk.success) return { error: "Unknown document type." };
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };
  if (!storagePath.startsWith(`${user.id}/`)) return { error: "Invalid file." };
  const { data, error } = await supabase
    .from("need_documents")
    .insert({ need_id: needId, kind: kindOk.data, storage_path: storagePath, file_name: fileName.slice(0, 120), uploaded_by: user.id })
    .select("id")
    .single();
  if (error) return { error: friendly(error.message) };
  return { ok: true, id: data.id };
}

export async function removeDocument(documentId: string): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };
  const { data: doc } = await supabase.from("need_documents").select("id, storage_path").eq("id", documentId).maybeSingle();
  if (!doc) return { error: "Document not found." };
  const { error } = await supabase.from("need_documents").delete().eq("id", documentId);
  if (error) return { error: friendly(error.message) };
  await supabase.storage.from("need-documents").remove([doc.storage_path]);
  return { ok: true };
}

/** Final step: consent and submit for review. */
export async function submitNeed(needId: string, consent: { truthful: boolean; dataConsent: boolean; guardian: boolean }): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };
  const session = await getSession();
  if (!session || session.profile?.banned_at) return { error: "This account can't share needs." };
  if (!kycDone(session)) return { error: "Please complete “Get verified” first. It takes about 3 minutes and keeps Dreamer trusted." };
  const { data: need } = await supabase.from("needs").select("id, is_minor, story, my_words, institution_id, display_name, slug").eq("id", needId).maybeSingle();
  if (!need) return { error: "Need not found." };
  if (!consent.truthful || !consent.dataConsent) return { error: "Please confirm both statements to submit." };
  if (need.is_minor && !consent.guardian) return { error: "A parent or guardian must give consent for anyone under 18." };
  if (!need.my_words) return { error: "Please add one line in your own words." };
  const { count } = await supabase.from("need_documents").select("id", { count: "exact", head: true }).eq("need_id", needId).eq("kind", "invoice");
  if (!count) return { error: "Please upload the invoice, bill or quote so we can confirm the amount." };

  const { error } = await supabase
    .from("needs")
    .update({ status: "submitted", consent_at: new Date().toISOString() })
    .eq("id", needId);
  if (error) return { error: friendly(error.message) };

  // Escrow mode: go live straight away (so a need can be shared while it's
  // hot) but hold every naira until our team verifies it. Unverified after
  // 30 days means every giver is refunded.
  let live = false;
  if (process.env.ESCROW_AUTO_PUBLISH === "true" && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const now = Date.now();
    const deadline = new Date(now + ESCROW_DAYS * 86_400_000).toISOString();
    const expires = new Date(now + NEED_LIFETIME_DAYS * 86_400_000).toISOString();
    const { error: pubError } = await createAdminClient()
      .from("needs")
      .update({ status: "live", published_at: new Date(now).toISOString(), expires_at: expires, escrow_deadline: deadline })
      .eq("id", needId)
      .eq("status", "submitted");
    if (!pubError) {
      live = true;
      await logAudit({ actorId: user.id, action: "need.published_escrow", entity: "need", entityId: needId, after: { escrow_deadline: deadline, via: "auto" } });
    }
  }

  // Let the admins know there is something to review.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data: admins } = await createAdminClient().from("profiles").select("email").eq("role", "admin");
    await sendEmail({
      to: (admins ?? []).map((a) => a.email as string).filter(Boolean),
      subject: `New need to verify: ${need.display_name}${live ? " (live, funds held)" : ""}`,
      text: `${need.display_name}'s need was submitted for review.${live ? " It is already live with funds held until you verify it." : ""}\n\n${siteUrl()}/admin/needs/${needId}`,
    });
  }
  revalidatePath("/me/needs");
  return { ok: true, needId, id: live ? need.slug : undefined };
}

export async function withdrawToDraft(needId: string): Promise<ActionResult> {
  const { supabase } = await currentUser();
  const { error } = await supabase.from("needs").update({ status: "draft" }).eq("id", needId).eq("status", "submitted");
  if (error) return { error: friendly(error.message) };
  revalidatePath("/me/needs");
  return { ok: true };
}

export async function deleteDraft(needId: string): Promise<ActionResult> {
  const { supabase } = await currentUser();
  const { error } = await supabase.from("needs").delete().eq("id", needId).eq("status", "draft");
  if (error) return { error: friendly(error.message) };
  revalidatePath("/me/needs");
  return { ok: true };
}

export async function postUpdate(needId: string, input: unknown, photoPaths: string[], receiptPaths: string[] = []): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };
  const photos = photoPaths.filter((p) => p.startsWith(`${user.id}/`)).slice(0, 5);
  const receipts = receiptPaths.filter((p) => p.startsWith(`${user.id}/`)).slice(0, 5);
  const { error } = await supabase.from("updates").insert({
    need_id: needId,
    body: parsed.data.body,
    milestone: parsed.data.milestone,
    photo_paths: photos,
    receipt_paths: receipts,
    receipts_public: parsed.data.receiptsPublic,
  });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/me/needs");
  return { ok: true };
}

function friendly(message: string): string {
  if (message.includes("needs_amount_cap")) return "That amount is above the current limit for this category.";
  if (!message.includes("violates") && !message.includes("row-level") && message.length < 160) return message;
  if (message.includes("violates check constraint")) return "Some details are not valid. Please check the form.";
  if (message.includes("row-level security")) return "You can't change this need.";
  return message;
}
