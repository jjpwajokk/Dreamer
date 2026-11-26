import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminEmails } from "@/lib/config";
import { logAudit } from "@/lib/audit";
import { isBanned } from "@/lib/identity";

/**
 * Runs after every successful sign-in:
 * - makes sure a profile exists,
 * - promotes emails listed in ADMIN_EMAILS to admin,
 * - links gifts made as a guest with the same email to this account,
 * - closes accounts whose email matches a permanently banned identity.
 * Returns true when the account is closed (the caller sends them to /account-closed).
 */
export async function afterSignIn(userId: string, email: string | null | undefined, firstName?: string): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const admin = createAdminClient();
  const normalized = (email ?? "").toLowerCase();

  const { data: profile } = await admin.from("profiles").select("id, role, banned_at").eq("user_id", userId).maybeSingle();
  if (profile?.banned_at) return true;
  if (normalized && profile?.role !== "admin" && (await isBanned([{ kind: "email", value: normalized }]))) {
    if (!profile) await admin.from("profiles").insert({ user_id: userId, email: normalized, display_name: normalized.split("@")[0] });
    await admin.from("profiles").update({ banned_at: new Date().toISOString(), ban_reason: "Matched a permanently closed account" }).eq("user_id", userId);
    await logAudit({ actorId: null, action: "profile.ban_matched", entity: "profile", entityId: userId, after: { via: "email" } });
    return true;
  }
  if (!profile) {
    await admin.from("profiles").insert({ user_id: userId, email: normalized, display_name: firstName || normalized.split("@")[0] });
  }

  if (normalized && adminEmails().includes(normalized) && profile?.role !== "admin") {
    await admin.from("profiles").update({ role: "admin" }).eq("user_id", userId);
    await logAudit({ actorId: userId, action: "profile.promoted_admin", entity: "profile", entityId: profile?.id ?? null, after: { via: "ADMIN_EMAILS" } });
  }

  if (normalized) {
    await admin.from("contributions").update({ giver_id: userId }).is("giver_id", null).ilike("giver_email", normalized);
  }
  return false;
}
