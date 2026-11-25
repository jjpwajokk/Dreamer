"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { healthcareEnabled } from "@/lib/config";
import { slugify } from "@/lib/format";
import { firstError, institutionSchema, needBasicsSchema, needStorySchema, updateSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/config";

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
  if (parsed.data.category === "healthcare" && !healthcareEnabled()) return { error: "Healthcare needs open soon. For now, please choose Education." };
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };

  const values = {
    relationship: parsed.data.relationship,
    category: parsed.data.category,
    display_name: parsed.data.display_name.split(/\s+/)[0]!,
    is_minor: parsed.data.is_minor,
    state: parsed.data.state,
    city: parsed.data.city || null,
    contact_phone: parsed.data.contact_phone,
    title: parsed.data.title,
    amount_kobo: parsed.data.amount_kobo,
  };

  if (needId) {
    const { error } = await supabase.from("needs").update(values).eq("id", needId);
    if (error) return { error: friendly(error.message) };
    return { ok: true, needId };
  }
  const { data, error } = await supabase
    .from("needs")
    .insert({ ...values, slug: slugify(values.display_name), status: "draft" })
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

/** Step 4: the school or hospital that will receive the money. */
export async function saveInstitution(needId: string, input: unknown): Promise<ActionResult> {
  const parsed = institutionSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };
  const { data: need } = await supabase.from("needs").select("id, institution_id").eq("id", needId).maybeSingle();
  if (!need) return { error: "Need not found." };

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
  const { data: need } = await supabase.from("needs").select("id, is_minor, story, my_words, institution_id, display_name").eq("id", needId).maybeSingle();
  if (!need) return { error: "Need not found." };
  if (!consent.truthful || !consent.dataConsent) return { error: "Please confirm both statements to submit." };
  if (need.is_minor && !consent.guardian) return { error: "A parent or guardian must give consent for anyone under 18." };
  if (!need.my_words) return { error: "Please add one line in your own words." };
  const { count } = await supabase.from("need_documents").select("id", { count: "exact", head: true }).eq("need_id", needId).eq("kind", "invoice");
  if (!count) return { error: "Please upload the fee invoice or hospital bill so we can verify the amount." };

  const { error } = await supabase
    .from("needs")
    .update({ status: "submitted", consent_at: new Date().toISOString() })
    .eq("id", needId);
  if (error) return { error: friendly(error.message) };

  // Let the admins know there is something to review.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data: admins } = await createAdminClient().from("profiles").select("email").eq("role", "admin");
    await sendEmail({
      to: (admins ?? []).map((a) => a.email as string).filter(Boolean),
      subject: `New need to verify: ${need.display_name}`,
      text: `${need.display_name}'s need was submitted for review.\n\n${siteUrl()}/admin/needs/${needId}`,
    });
  }
  revalidatePath("/me/needs");
  return { ok: true, needId };
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

export async function postUpdate(needId: string, input: unknown, photoPaths: string[]): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Please sign in again." };
  const photos = photoPaths.filter((p) => p.startsWith(`${user.id}/`)).slice(0, 4);
  const { error } = await supabase.from("updates").insert({ need_id: needId, body: parsed.data.body, milestone: parsed.data.milestone, photo_paths: photos });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/me/needs");
  return { ok: true };
}

function friendly(message: string): string {
  if (message.includes("needs_amount_cap")) return "That amount is above the current limit for this category.";
  if (message.includes("violates check constraint")) return "Some details are not valid. Please check the form.";
  if (message.includes("row-level security")) return "You can't change this need.";
  return message;
}
