export const SITE_NAME = "Dreamer";
export const TAGLINE = "Help a real person with a real, verified need, and watch it change their life.";

export const NEED_LIFETIME_DAYS = 30;

export function siteUrl(): string {
  // Prefer the stable production address: per-deployment URLs (VERCEL_URL)
  // can be private, which breaks link previews on WhatsApp and elsewhere.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : "");
  return (fromEnv || "http://localhost:3000").replace(/\/$/, "");
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_SECRET_KEY.startsWith("sk_"));
}

export function paystackIsLive(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_"));
}
