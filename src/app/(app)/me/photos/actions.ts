"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { moderateMedia } from "@/lib/moderation";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/config";
import { RATE_LIMITED, allow } from "@/lib/rate-limit";

export type MediaScope = { needId?: string; orgId?: string; purpose: "need" | "org" | "profile" };
type Result = { ok?: boolean; error?: string; id?: string };

async function ownsScope(userId: string, scope: MediaScope): Promise<boolean> {
  const admin = createAdminClient();
  if (scope.purpose === "profile") return true;
  if (scope.needId) {
    const { data } = await admin.from("needs").select("created_by, beneficiary_id, status").eq("id", scope.needId).maybeSingle();
    return Boolean(data && (data.created_by === userId || data.beneficiary_id === userId) && !["rejected", "expired"].includes(data.status as string));
  }
  if (scope.orgId) {
    const { data } = await admin.from("organisations").select("owner_id").eq("id", scope.orgId).maybeSingle();
    return data?.owner_id === userId;
  }
  return false;
}

const opts = z.object({
  caption: z.string().trim().max(140).optional().default(""),
  sensitive: z.boolean().default(false),
  visibility: z.enum(["public", "on_request"]).default("public"),
});

export async function addMedia(scope: MediaScope, path: string, input: unknown): Promise<Result> {
  const session = await getSession();
  if (!session || session.profile?.banned_at) return { error: "Please sign in again." };
  if (!(await allow("media", 40, 3600))) return { error: RATE_LIMITED };
  if (!path.startsWith(`${session.userId}/`)) return { error: "Upload failed. Please try again." };
  if (!(await ownsScope(session.userId, scope))) return { error: "You can only add photos to your own pages." };
  const o = opts.parse(input ?? {});
  const { data, error } = await createAdminClient()
    .from("media")
    .insert({
      owner_id: session.userId,
      need_id: scope.needId ?? null,
      org_id: scope.orgId ?? null,
      purpose: scope.purpose,
      storage_path: path,
      caption: o.caption || null,
      is_sensitive: o.sensitive,
      visibility: o.visibility,
    })
    .select("id")
    .single();
  if (error) return { error: error.message.includes("Up to") || error.message.includes("up to") ? error.message : "Couldn't save that photo." };
  await moderateMedia(data.id as string);
  revalidatePath("/", "layout");
  return { ok: true, id: data.id as string };
}

export async function updateMedia(id: string, input: unknown): Promise<Result> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const o = opts.parse(input ?? {});
  const admin = createAdminClient();
  const { data: m } = await admin.from("media").select("owner_id").eq("id", id).maybeSingle();
  if (!m || m.owner_id !== session.userId) return { error: "Not your photo." };
  await admin.from("media").update({ caption: o.caption || null, is_sensitive: o.sensitive, visibility: o.visibility }).eq("id", id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteMedia(id: string): Promise<Result> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const admin = createAdminClient();
  const { data: m } = await admin.from("media").select("owner_id, storage_path").eq("id", id).maybeSingle();
  if (!m || m.owner_id !== session.userId) return { error: "Not your photo." };
  await admin.storage.from("media").remove([m.storage_path as string]);
  await admin.from("media").delete().eq("id", id);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** A signed-in member asks to see photos the owner keeps private. */
export async function requestPhotos(target: { needId?: string; orgId?: string; profileUserId?: string }, message: string): Promise<Result> {
  const session = await getSession();
  if (!session) return { error: "Sign in to ask." };
  if (!(await allow("photo-request", 20, 3600))) return { error: RATE_LIMITED };
  const admin = createAdminClient();
  let ownerId: string | null = null;
  let label = "your page";
  if (target.needId) {
    const { data } = await admin.from("needs").select("created_by, display_name").eq("id", target.needId).maybeSingle();
    ownerId = (data?.created_by as string) ?? null;
    label = `${data?.display_name ?? "your"}'s need`;
  } else if (target.orgId) {
    const { data } = await admin.from("organisations").select("owner_id, name").eq("id", target.orgId).maybeSingle();
    ownerId = (data?.owner_id as string) ?? null;
    label = (data?.name as string) ?? "your organisation";
  } else if (target.profileUserId) {
    const { data } = await admin.from("profiles").select("user_id").eq("user_id", target.profileUserId).maybeSingle();
    ownerId = (data?.user_id as string) ?? null;
    label = "your profile";
  }
  if (!ownerId) return { error: "Not found." };
  if (ownerId === session.userId) return { error: "This is your own page." };
  const { error } = await admin.from("media_requests").insert({
    requester_id: session.userId,
    owner_id: ownerId,
    need_id: target.needId ?? null,
    org_id: target.orgId ?? null,
    message: message.trim().slice(0, 280) || null,
  });
  if (error && !error.message.includes("duplicate")) return { error: "Couldn't send your request." };
  const { data: owner } = await admin.from("profiles").select("email").eq("user_id", ownerId).maybeSingle();
  if (owner?.email) {
    await sendEmail({
      to: owner.email as string,
      subject: "Someone would like to connect",
      text: `${session.profile?.display_name ?? "A Dreamer member"} asked to see the photos and social links you keep private on ${label}. It's your choice: approve or decline here: ${siteUrl()}/me/requests`,
    });
  }
  return { ok: true };
}

export async function decideRequest(id: string, approve: boolean): Promise<Result> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const admin = createAdminClient();
  const { data: r } = await admin.from("media_requests").select("owner_id").eq("id", id).maybeSingle();
  if (!r || r.owner_id !== session.userId) return { error: "Not your request to decide." };
  await admin.from("media_requests").update({ status: approve ? "approved" : "declined", decided_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/me/requests");
  return { ok: true };
}
