import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MediaRow } from "@/lib/types";
import { cleanSocials, type Socials } from "@/lib/socials";

export const MEDIA_LIMITS = { need: 5, progress: 5, profile: 5, org: 10 } as const;

export type ShownPhoto = {
  id: string;
  url: string | null;
  caption: string | null;
  sensitive: boolean;
  visibility: "public" | "on_request";
  moderation: MediaRow["moderation"];
};

export type Gallery = {
  /** Photos this viewer may see (signed links valid for one hour). */
  photos: ShownPhoto[];
  /** Approved photos kept "on request" that this viewer hasn't been given access to. */
  lockedCount: number;
  /** Approved photos in total (what a signed-out visitor is told exists). */
  total: number;
  requestStatus: "none" | "pending" | "approved" | "declined";
  isOwner: boolean;
};

type Viewer = { userId: string; isAdmin: boolean } | null;

/**
 * The single place that decides who sees which photo:
 * - signed-out visitors see none (only a count),
 * - members see approved "public" photos, and "on request" photos once the owner approves their request,
 * - owners and admins see everything, including photos still being reviewed.
 */
export async function getGallery(scope: { needId?: string; orgId?: string; ownerId?: string | null }, viewer: Viewer): Promise<Gallery> {
  const empty: Gallery = { photos: [], lockedCount: 0, total: 0, requestStatus: "none", isOwner: false };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return empty;
  const admin = createAdminClient();
  let q = admin.from("media").select("*").order("sort").order("created_at");
  if (scope.needId) q = q.eq("need_id", scope.needId).eq("purpose", "need");
  else if (scope.orgId) q = q.eq("org_id", scope.orgId).eq("purpose", "org");
  else return empty;
  const { data } = await q;
  const rows = (data ?? []) as MediaRow[];
  const approved = rows.filter((r) => r.moderation === "approved");
  const isOwner = Boolean(viewer && (viewer.isAdmin || rows.some((r) => r.owner_id === viewer.userId) || scope.ownerId === viewer.userId));
  if (!viewer) return { ...empty, total: approved.length };

  let requestStatus: Gallery["requestStatus"] = "none";
  if (!isOwner) {
    let rq = admin.from("media_requests").select("status").eq("requester_id", viewer.userId);
    rq = scope.needId ? rq.eq("need_id", scope.needId) : rq.eq("org_id", scope.orgId!);
    const { data: req } = await rq.maybeSingle();
    requestStatus = (req?.status as Gallery["requestStatus"]) ?? "none";
  }

  const visible = isOwner
    ? rows.filter((r) => r.moderation !== "rejected" || viewer.isAdmin)
    : approved.filter((r) => r.visibility === "public" || requestStatus === "approved");
  const lockedCount = isOwner ? 0 : approved.length - visible.length;
  const urls = await signedUrls(visible.map((r) => r.storage_path));
  return {
    photos: visible.map((r, i) => ({
      id: r.id,
      url: urls[i] ?? null,
      caption: r.caption,
      sensitive: r.is_sensitive,
      visibility: r.visibility,
      moderation: r.moderation,
    })),
    lockedCount,
    total: approved.length,
    requestStatus,
    isOwner,
  };
}

export async function signedUrls(paths: string[], bucket = "media", seconds = 3600): Promise<(string | null)[]> {
  if (!paths.length) return [];
  const { data } = await createAdminClient().storage.from(bucket).createSignedUrls(paths, seconds);
  return paths.map((p) => data?.find((d) => d.path === p)?.signedUrl ?? null);
}

export type SocialView = {
  socials: Socials;
  /** True when the owner shares socials on request and this viewer isn't approved yet. */
  locked: boolean;
  requestStatus: Gallery["requestStatus"];
};

/**
 * Who sees social links: never signed-out visitors; members when the owner
 * chose "members"; approved people when "on request"; nobody when "hidden".
 * Owners and admins always see their own.
 * `via` lets a request on a need or organisation page count too.
 */
export async function getSocials(
  subject: { userId: string } | { orgId: string },
  viewer: Viewer,
  via?: { needId?: string },
): Promise<SocialView> {
  const none: SocialView = { socials: {}, locked: false, requestStatus: "none" };
  if (!viewer || !process.env.SUPABASE_SERVICE_ROLE_KEY) return none;
  const admin = createAdminClient();
  let ownerId: string;
  let socials: Socials;
  let visibility: string;
  if ("orgId" in subject) {
    const { data } = await admin.from("organisations").select("owner_id, socials, socials_visibility").eq("id", subject.orgId).maybeSingle();
    if (!data) return none;
    ownerId = data.owner_id as string;
    socials = cleanSocials(data.socials);
    visibility = data.socials_visibility as string;
  } else {
    const { data } = await admin.from("profiles").select("user_id, socials, socials_visibility, banned_at").eq("user_id", subject.userId).maybeSingle();
    if (!data || data.banned_at) return none;
    ownerId = data.user_id as string;
    socials = cleanSocials(data.socials);
    visibility = data.socials_visibility as string;
  }
  if (viewer.isAdmin || viewer.userId === ownerId) return { socials, locked: false, requestStatus: "approved" };
  if (!Object.keys(socials).length || visibility === "hidden") return none;
  if (visibility === "members") return { socials, locked: false, requestStatus: "none" };

  // On request: any approved request from this viewer to this owner for this page.
  const q = admin.from("media_requests").select("status, need_id, org_id").eq("requester_id", viewer.userId).eq("owner_id", ownerId);
  const { data: reqs } = await q;
  const relevant = (reqs ?? []).filter((r) =>
    "orgId" in subject ? r.org_id === subject.orgId : (!r.need_id && !r.org_id) || (via?.needId && r.need_id === via.needId),
  );
  const status = (relevant.find((r) => r.status === "approved")?.status ??
    relevant.find((r) => r.status === "pending")?.status ??
    relevant[0]?.status ??
    "none") as Gallery["requestStatus"];
  return status === "approved" ? { socials, locked: false, requestStatus: status } : { socials: {}, locked: true, requestStatus: status };
}

/** The member who created a need (server-side only, never sent to the page). */
export async function needOwnerId(needId: string): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { data } = await createAdminClient().from("needs").select("created_by").eq("id", needId).maybeSingle();
  return (data?.created_by as string) ?? null;
}
