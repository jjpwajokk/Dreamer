"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { readConsentToken } from "@/lib/consent";
import { logAudit } from "@/lib/audit";
import { RATE_LIMITED, allow } from "@/lib/rate-limit";

export async function chooseExpiryOption(token: string, choice: "refund" | "redirect"): Promise<{ ok?: boolean; error?: string }> {
  if (choice !== "refund" && choice !== "redirect") return { error: "Choose an option." };
  if (!(await allow("consent", 20, 600))) return { error: RATE_LIMITED };
  const id = readConsentToken(token);
  if (!id) return { error: "This link isn't valid. Please use the link in your email." };
  const admin = createAdminClient();
  const { data: c } = await admin.from("contributions").select("id, status, expiry_choice, need:needs(status)").eq("id", id).maybeSingle();
  const need = (Array.isArray(c?.need) ? c?.need[0] : c?.need) as { status: string } | null | undefined;
  if (!c || c.status !== "success" || need?.status !== "expired") return { error: "This gift has already been settled." };
  const { error } = await admin.from("contributions").update({ expiry_choice: choice, expiry_choice_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "Something went wrong. Please try again." };
  await logAudit({ actorId: null, action: "contribution.expiry_choice", entity: "contribution", entityId: id, before: { expiry_choice: c.expiry_choice }, after: { expiry_choice: choice, via: "giver_link" } });
  revalidatePath(`/consent/${token}`);
  return { ok: true };
}
