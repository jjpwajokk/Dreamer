import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { supabaseConfigured } from "@/lib/config";

/** True when the request carries a Supabase auth cookie (no network call). */
export function hasAuthCookie(all: { name: string }[]): boolean {
  return all.some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

/** Cached per request, so the layout and the page share one lookup. */
export const getSession = cache(async (): Promise<{ userId: string; email: string | null; profile: Profile | null } | null> => {
  if (!supabaseConfigured()) return null;
  // Guests have no auth cookie: skip the round trip to Supabase entirely.
  if (!hasAuthCookie((await cookies()).getAll())) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  return { userId: user.id, email: user.email ?? null, profile: (profile as Profile) ?? null };
});

export async function requireUser(next = "/me") {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

export async function requireAdmin() {
  const session = await requireUser("/admin");
  if (session.profile?.role !== "admin") redirect("/?notice=admin-only");
  return session;
}

/** For server actions: returns the admin session or throws (no redirect). */
export async function assertAdmin() {
  const session = await getSession();
  if (!session || session.profile?.role !== "admin") throw new Error("Only admins can do this.");
  return session;
}
