export const SITE_NAME = "Dreamer";
export const TAGLINE = "Help a real person with a real, verified need, and watch it change their life.";

export const NEED_LIFETIME_DAYS = 30;

export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return (fromEnv || "http://localhost:3000").replace(/\/$/, "");
}

export function healthcareEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HEALTHCARE_ENABLED === "true";
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
