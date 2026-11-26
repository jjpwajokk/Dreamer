import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrls } from "@/lib/media";
import type { ManagedPhoto } from "@/components/photo-manager";
import type { Profile } from "@/lib/types";

/** Everything the need form needs beyond the need itself. */
export async function needFormExtras(userId: string, profile: Profile | null, needId: string | null, personalPayeeId: string | null) {
  const admin = createAdminClient();
  const [{ data: orgs }, personal, media] = await Promise.all([
    admin.from("organisations").select("id, name, account_number").eq("owner_id", userId).eq("status", "verified"),
    personalPayeeId
      ? admin.from("institutions").select("bank_code, account_number, account_name").eq("id", personalPayeeId).maybeSingle()
      : Promise.resolve({ data: null }),
    needId
      ? admin.from("media").select("*").eq("need_id", needId).eq("purpose", "need").order("created_at")
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const rows = (media.data ?? []) as { id: string; storage_path: string; caption: string | null; is_sensitive: boolean; visibility: "public" | "on_request"; moderation: "pending" | "approved" | "rejected" }[];
  const urls = await signedUrls(rows.map((r) => r.storage_path));
  const photos: ManagedPhoto[] = rows.map((r, i) => ({ id: r.id, url: urls[i] ?? null, caption: r.caption, sensitive: r.is_sensitive, visibility: r.visibility, moderation: r.moderation }));
  return {
    orgs: (orgs ?? []).map((o) => ({ id: o.id as string, name: o.name as string, last4: (o.account_number as string | null)?.slice(-4) ?? null })),
    kycStatus: profile?.kyc_status ?? "none",
    personal: (personal.data as { bank_code: string | null; account_number: string | null; account_name: string | null } | null) ?? null,
    photos,
  };
}
