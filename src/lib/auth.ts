import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { supabaseConfigured } from "@/lib/config";

export async function getSession(): Promise<{ userId: string; email: string | null; profile: Profile | null } | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  return { userId: user.id, email: user.email ?? null, profile: (profile as Profile) ?? null };
}

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
