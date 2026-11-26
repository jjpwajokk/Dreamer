import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Signed links that let a giver choose what happens to a gift when a need
// expires before it is fully funded. No login needed: the link is the proof.

function secret(): string {
  const s = process.env.CONSENT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("CONSENT_SECRET is not set");
  return s;
}

function sign(contributionId: string): string {
  return createHmac("sha256", secret()).update(`consent:${contributionId}`).digest("base64url").slice(0, 32);
}

export function consentToken(contributionId: string): string {
  return `${contributionId}.${sign(contributionId)}`;
}

/** Returns the contribution id if the token is genuine, otherwise null. */
export function readConsentToken(token: string): string | null {
  const [id, sig] = token.split(".");
  if (!id || !sig || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}
