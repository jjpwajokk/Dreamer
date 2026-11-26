import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Banned emails, phones, ID numbers and bank accounts are stored only as
// salted SHA-256 fingerprints, never as raw values.

function salt(): string {
  return process.env.IDENTITY_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "dreamer";
}

export function normalise(kind: "email" | "phone" | "id" | "account", value: string): string {
  const v = value.trim().toLowerCase();
  if (kind === "phone") {
    const d = v.replace(/\D/g, "");
    return d.startsWith("234") ? `0${d.slice(3)}` : d;
  }
  if (kind === "id" || kind === "account") return v.replace(/[^a-z0-9]/g, "");
  return v;
}

export function fingerprint(kind: "email" | "phone" | "id" | "account", value: string): string {
  return createHash("sha256").update(`${salt()}:${kind}:${normalise(kind, value)}`).digest("hex");
}

export async function isBanned(items: { kind: "email" | "phone" | "id" | "account"; value: string | null | undefined }[]): Promise<boolean> {
  const hashes = items.filter((i) => i.value && i.value.trim()).map((i) => fingerprint(i.kind, i.value!));
  if (!hashes.length || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const { data } = await createAdminClient().from("banned_identities").select("hash").in("hash", hashes).limit(1);
  return Boolean(data?.length);
}

/**
 * Optional automated ID check. When DOJAH_APP_ID and DOJAH_SECRET_KEY are set,
 * a NIN is looked up and the name compared. Otherwise our team reviews the ID
 * by hand in /admin/people.
 */
export async function lookupNin(nin: string, legalName: string): Promise<{ checked: boolean; match?: boolean; ref?: string }> {
  const app = process.env.DOJAH_APP_ID;
  const key = process.env.DOJAH_SECRET_KEY;
  if (!app || !key) return { checked: false };
  try {
    const res = await fetch(`https://api.dojah.io/api/v1/kyc/nin?nin=${encodeURIComponent(nin)}`, {
      headers: { AppId: app, Authorization: key },
      cache: "no-store",
    });
    if (!res.ok) return { checked: false };
    const j = (await res.json()) as { entity?: { first_name?: string; last_name?: string } };
    const names = `${j.entity?.first_name ?? ""} ${j.entity?.last_name ?? ""}`.toLowerCase().split(/\s+/).filter(Boolean);
    const given = legalName.toLowerCase().split(/\s+/).filter(Boolean);
    const match = names.length > 0 && names.every((n) => given.includes(n));
    return { checked: true, match, ref: `dojah:${nin.slice(-4)}` };
  } catch {
    return { checked: false };
  }
}
