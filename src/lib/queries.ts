import "server-only";
import { isCategory } from "@/lib/sectors";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/config";
import type { PublicNeed, PublicUpdate } from "@/lib/types";

export type FeedFilters = { category?: string; state?: string; close?: boolean; urgent?: boolean; sort?: "deadline" };

export async function getFeed(filters: FeedFilters, viewer: { userId?: string | null }): Promise<PublicNeed[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  let query = supabase.from("public_needs").select("*").eq("status", "live").limit(60);
  if (isCategory(filters.category)) query = query.eq("category", filters.category);
  if (filters.state) query = query.eq("state", filters.state);
  const { data, error } = await query.order("published_at", { ascending: false });
  if (error) {
    console.error("feed error", error);
    return [];
  }
  let needs = (data ?? []) as PublicNeed[];
  needs = needs.filter((n) => !n.expires_at || new Date(n.expires_at) > new Date());

  // Hide cards this person passed on in the last 14 days.
  const seen = await recentlyPassed(viewer.userId ?? null);
  const fresh = needs.filter((n) => !seen.has(n.id));
  needs = fresh.length > 0 ? fresh : needs;

  if (filters.urgent) needs = needs.filter((n) => n.is_urgent || (n.deadline && daysUntil(n.deadline) <= 14));

  if (filters.sort === "deadline") {
    // Soonest deadline first; time-sensitive needs without a date next; then the rest.
    const key = (n: PublicNeed) => (n.deadline ? daysUntil(n.deadline) : n.is_urgent ? 10_000 : 20_000);
    needs = needs.sort((a, b) => key(a) - key(b));
  } else if (filters.close) {
    needs = needs
      .filter((n) => n.raised_kobo / n.amount_kobo >= 0.5)
      .sort((a, b) => b.raised_kobo / b.amount_kobo - a.raised_kobo / a.amount_kobo);
  } else {
    // A gentle daily shuffle so the same people aren't always first.
    // Never sorted by how sad a story is.
    const day = new Date().toISOString().slice(0, 10);
    needs = needs
      .map((n) => ({ n, k: hash(n.id + day) }))
      .sort((a, b) => a.k - b.k)
      .map(({ n }) => n);
  }
  return viewer.userId ? needs : needs.map(hidePhoto);
}

function daysUntil(date: string): number {
  return Math.ceil((new Date(`${date}T23:59:59+01:00`).getTime() - Date.now()) / 86_400_000);
}

/** Photos are for signed-in members only. */
function hidePhoto<T extends { cover_photo_path: string | null }>(n: T): T {
  return { ...n, cover_photo_path: null };
}

async function recentlyPassed(userId: string | null): Promise<Set<string>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return new Set();
  const anonId = (await cookies()).get("dreamer_anon")?.value;
  if (!userId && !anonId) return new Set();
  const admin = createAdminClient();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  let q = admin.from("swipes").select("need_id").eq("action", "pass").gte("created_at", since).limit(500);
  q = userId ? q.eq("user_id", userId) : q.eq("anon_id", anonId!);
  const { data } = await q;
  return new Set((data ?? []).map((r) => r.need_id as string));
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export async function getPublicNeed(slug: string, signedIn = false) {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: row } = await supabase.from("public_needs").select("*").eq("slug", slug).maybeSingle();
  if (!row) return null;
  const need = signedIn ? row : hidePhoto(row as PublicNeed);
  const [{ data: checks }, { data: updates }] = await Promise.all([
    supabase.from("public_need_checks").select("check, checked_at").eq("need_id", need.id),
    supabase.from("public_updates").select("*").eq("need_id", need.id).order("published_at", { ascending: false }),
  ]);
  const visibleUpdates = ((updates ?? []) as PublicUpdate[]).map((u) => (signedIn ? u : { ...u, photo_paths: [], receipt_paths: [] }));
  return {
    need: need as PublicNeed,
    checks: (checks ?? []) as { check: string; checked_at: string }[],
    updates: visibleUpdates,
  };
}

export async function getSiteStats() {
  const empty = { live: 0, funded: 0, raisedKobo: 0, givers: 0, sectors: 0 };
  if (!supabaseConfigured()) return empty;
  const supabase = await createClient();
  const { data } = await supabase.from("public_needs").select("status, raised_kobo, giver_count, category");
  if (!data) return empty;
  return {
    live: data.filter((n) => n.status === "live").length,
    funded: data.filter((n) => ["funded", "paid_out", "completed"].includes(n.status)).length,
    raisedKobo: data.reduce((s, n) => s + Number(n.raised_kobo), 0),
    givers: data.reduce((s, n) => s + Number(n.giver_count), 0),
    sectors: new Set(data.map((n) => n.category)).size,
  };
}

export async function getRecentUpdates(limit = 3, signedIn = false) {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data: updates } = await supabase.from("public_updates").select("*").order("published_at", { ascending: false }).limit(limit);
  if (!updates?.length) return [];
  const { data: needs } = await supabase
    .from("public_needs")
    .select("id, slug, display_name, category, state, cover_photo_path")
    .in("id", updates.map((u) => u.need_id));
  return updates
    .map((u) => {
      const need = needs?.find((n) => n.id === u.need_id);
      return signedIn
        ? { update: u as PublicUpdate, need }
        : { update: { ...(u as PublicUpdate), photo_paths: [], receipt_paths: [] }, need: need ? { ...need, cover_photo_path: null } : need };
    })
    .filter((r) => r.need) as { update: PublicUpdate; need: Pick<PublicNeed, "id" | "slug" | "display_name" | "category" | "state" | "cover_photo_path"> }[];
}
