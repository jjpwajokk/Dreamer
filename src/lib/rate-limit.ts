import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** The caller's IP, as Vercel reports it. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/**
 * Counts one hit for `action` from this IP (and optional extra key) and says
 * whether it is allowed. Fails open if the database can't be reached, so a
 * hiccup never blocks a real giver.
 */
export async function allow(action: string, limit: number, windowSeconds: number, extra?: string): Promise<boolean> {
  try {
    const key = `${action}:${await clientIp()}${extra ? `:${extra}` : ""}`;
    const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

export const RATE_LIMITED = "You're going a little fast. Please wait a minute and try again.";
