"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NIGERIAN_STATES } from "@/lib/format";
import { fingerprint, isBanned, lookupNin } from "@/lib/identity";
import { logAudit } from "@/lib/audit";
import { RATE_LIMITED, allow } from "@/lib/rate-limit";

const schema = z.object({
  legal_name: z.string().trim().min(3, "Enter your full name as it appears on your ID").max(120),
  phone: z.string().trim().regex(/^[0-9+ ()-]{10,20}$/, "Enter a phone number we can call"),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth"),
  state: z.enum(NIGERIAN_STATES, { message: "Choose your state" }),
  city: z.string().trim().min(2, "Enter your town or city").max(60),
  address: z.string().trim().min(5, "Enter your address").max(240),
  occupation: z.string().trim().min(2, "Tell us what you do").max(80),
  workplace: z.string().trim().max(120).optional().or(z.literal("")),
  id_type: z.enum(["nin", "voters_card", "drivers_licence", "passport", "bvn"]),
  id_number: z.string().trim().min(6, "Enter your ID number").max(30),
});

export type KycState = { ok?: boolean; error?: string } | undefined;

export async function submitKyc(_prev: KycState, formData: FormData): Promise<KycState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  if (!(await allow("kyc", 6, 3600))) return { error: RATE_LIMITED };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const d = parsed.data;
  const age = (Date.now() - new Date(d.date_of_birth).getTime()) / (365.25 * 86_400_000);
  if (!(age >= 18 && age < 110)) return { error: "You need to be 18 or older to verify. A parent or guardian can post for anyone younger." };

  const admin = createAdminClient();
  const { count: docs } = await admin.from("verification_documents").select("id", { count: "exact", head: true }).eq("owner_id", session.userId).is("org_id", null).eq("kind", "id_front");
  if (!docs) return { error: "Add a photo of your ID first." };

  if (await isBanned([{ kind: "email", value: session.email }, { kind: "phone", value: d.phone }, { kind: "id", value: `${d.id_type}:${d.id_number}` }])) {
    await admin.from("profiles").update({ banned_at: new Date().toISOString(), ban_reason: "Matched a permanently closed account" }).eq("user_id", session.userId);
    return { error: "We can't verify this account. If you think this is a mistake, contact us." };
  }

  const idHash = fingerprint("id", `${d.id_type}:${d.id_number}`);
  const { data: clash } = await admin.from("profiles").select("user_id").eq("id_hash", idHash).neq("user_id", session.userId).maybeSingle();
  if (clash) return { error: "This ID is already linked to another Dreamer account. Each person can have one account." };

  const auto = d.id_type === "nin" ? await lookupNin(d.id_number, d.legal_name) : { checked: false as const };
  const status = auto.checked && auto.match ? "verified" : "submitted";
  const now = new Date().toISOString();
  const { error } = await admin
    .from("profiles")
    .update({
      legal_name: d.legal_name,
      full_name: d.legal_name,
      phone: d.phone,
      date_of_birth: d.date_of_birth,
      state: d.state,
      city: d.city,
      address: d.address,
      occupation: d.occupation,
      workplace: d.workplace || null,
      id_type: d.id_type,
      id_last4: d.id_number.replace(/[^0-9A-Za-z]/g, "").slice(-4),
      id_hash: idHash,
      kyc_status: status,
      kyc_submitted_at: now,
      kyc_note: auto.checked && !auto.match ? "Automatic NIN check: name did not match. Review by hand." : null,
      kyc_provider_ref: auto.checked ? (auto as { ref?: string }).ref ?? null : null,
      ...(status === "verified" ? { kyc_reviewed_at: now } : {}),
    })
    .eq("user_id", session.userId);
  if (error) return { error: "Couldn't save. Please try again." };
  await logAudit({ actorId: session.userId, action: "profile.kyc_submitted", entity: "profile", entityId: session.profile?.id ?? null, after: { status, id_type: d.id_type, auto_checked: auto.checked } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function recordVerificationDoc(kind: "id_front" | "id_back" | "selfie" | "proof_of_address", path: string, fileName: string) {
  const session = await getSession();
  if (!session || !path.startsWith(`${session.userId}/`)) return { error: "Please sign in again." };
  const admin = createAdminClient();
  const { error } = await admin.from("verification_documents").insert({ owner_id: session.userId, kind, storage_path: path, file_name: fileName.slice(0, 120) });
  if (error) return { error: "Couldn't save the file." };
  revalidatePath("/me/verify");
  return { ok: true };
}
