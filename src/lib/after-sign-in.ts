import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminEmails } from "@/lib/config";
import { logAudit } from "@/lib/audit";

/**
 * Runs after every successful sign-in:
 * - makes sure a profile exists,
 * - promotes emails listed in ADMIN_EMAILS to admin,
 * - links gifts made as a guest with the same email to this account.
 */
export async function afterSignIn(userId: string, email: string | null | undefined, firstName?: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const admin = createAdminClient();
  const normalized = (email ?? "").toLowerCase();

  const { data: profile } = await admin.from("profiles").select("id, role").eq("user_id", userId).maybeSingle();
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
}
