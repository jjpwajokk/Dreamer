import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrls } from "@/lib/media";

/**
 * Photo moderation. Today every photo is reviewed by a person in
 * /admin/photos. When SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET are set,
 * each upload is also scored by AI for nudity, gore and offensive content:
 * - high-risk photos are rejected straight away,
 * - medical or injury photos are marked sensitive (blurred until a viewer asks),
 * - and, only if MODERATION_AUTO_APPROVE=true, clearly safe photos are approved
 *   without waiting for a person (for when volume grows).
 */
export async function moderateMedia(mediaId: string): Promise<void> {
  const user = process.env.SIGHTENGINE_API_USER;
  const secret = process.env.SIGHTENGINE_API_SECRET;
  if (!user || !secret) return;
  const admin = createAdminClient();
  const { data: m } = await admin.from("media").select("id, storage_path, is_sensitive").eq("id", mediaId).maybeSingle();
  if (!m) return;
  const [url] = await signedUrls([m.storage_path as string], "media", 600);
  if (!url) return;
  try {
    const qs = new URLSearchParams({ models: "nudity-2.1,gore-2.0,offensive-2.0", api_user: user, api_secret: secret, url });
    const res = await fetch(`https://api.sightengine.com/1.0/check.json?${qs}`, { cache: "no-store" });
    if (!res.ok) return;
    const r = (await res.json()) as {
      nudity?: { sexual_activity?: number; sexual_display?: number; erotica?: number; none?: number };
      gore?: { prob?: number };
      offensive?: { prob?: number };
    };
    const explicit = Math.max(r.nudity?.sexual_activity ?? 0, r.nudity?.sexual_display ?? 0, r.nudity?.erotica ?? 0);
    const gore = r.gore?.prob ?? 0;
    const offensive = r.offensive?.prob ?? 0;
    const flags = { explicit, gore, offensive };
    if (explicit > 0.6 || offensive > 0.8) {
      await admin.from("media").update({ moderation: "rejected", moderation_flags: flags, moderation_source: "ai", reviewed_at: new Date().toISOString() }).eq("id", mediaId);
      return;
    }
    const sensitive = m.is_sensitive || gore > 0.4 || explicit > 0.2;
    const autoApprove = process.env.MODERATION_AUTO_APPROVE === "true" && explicit < 0.1 && offensive < 0.3;
    await admin
      .from("media")
      .update({
        is_sensitive: sensitive,
        moderation_flags: flags,
        ...(autoApprove ? { moderation: "approved", moderation_source: "ai", reviewed_at: new Date().toISOString() } : {}),
      })
      .eq("id", mediaId);
  } catch (e) {
    console.error("moderation failed", e);
  }
}
