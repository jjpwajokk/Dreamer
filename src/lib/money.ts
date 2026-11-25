// All money is handled as integer kobo. ₦1 = 100 kobo.

export const KOBO_PER_NAIRA = 100;
export const MIN_GIFT_KOBO = 1_000 * KOBO_PER_NAIRA;
export const MIN_NEED_KOBO = 1_000 * KOBO_PER_NAIRA;
export const NEED_CAP_KOBO = {
  education: 500_000 * KOBO_PER_NAIRA,
  healthcare: 1_500_000 * KOBO_PER_NAIRA,
} as const;
export const QUICK_PICKS_KOBO = [2_000, 5_000, 10_000].map((n) => n * KOBO_PER_NAIRA);
export const TIP_PERCENT_OPTIONS = [0, 5, 10] as const;

const nairaFormatter = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

/** 1234500 -> "₦12,345" */
export function formatNaira(kobo: number | bigint | null | undefined): string {
  const value = Number(kobo ?? 0) / KOBO_PER_NAIRA;
  return `₦${nairaFormatter.format(Math.floor(value))}`;
}

/** Parses "12,345", "₦12345" or "12345.50" into kobo. Returns null if invalid. */
export function parseNairaToKobo(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const cleaned = String(input).replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const kobo = Number(whole) * KOBO_PER_NAIRA + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(kobo) ? kobo : null;
}

export function remainingKobo(amountKobo: number, raisedKobo: number): number {
  return Math.max(amountKobo - raisedKobo, 0);
}

export function progressPercent(amountKobo: number, raisedKobo: number): number {
  if (amountKobo <= 0) return 0;
  return Math.min(100, Math.floor((raisedKobo / amountKobo) * 100));
}

/** Optional tip on top of a gift, rounded down to whole naira. */
export function tipKobo(giftKobo: number, percent: number): number {
  if (percent <= 0) return 0;
  const raw = Math.floor((giftKobo * percent) / 100);
  return raw - (raw % KOBO_PER_NAIRA);
}

export type GiftCheck =
  | { ok: true; amountKobo: number }
  | { ok: false; error: string };

/**
 * Validates a gift against what the need still needs. A gift larger than the
 * remaining amount is reduced to "finish it", so a need is never overfunded
 * by a single gift. A remaining balance below the ₦1,000 minimum can still be
 * finished exactly.
 */
export function checkGift(giftKobo: number, remaining: number): GiftCheck {
  if (!Number.isSafeInteger(giftKobo) || giftKobo <= 0) return { ok: false, error: "Enter an amount." };
  if (remaining <= 0) return { ok: false, error: "This need is already fully funded." };
  if (giftKobo >= remaining) return { ok: true, amountKobo: remaining };
  if (giftKobo < MIN_GIFT_KOBO) return { ok: false, error: `The smallest gift is ${formatNaira(MIN_GIFT_KOBO)}.` };
  if (giftKobo % KOBO_PER_NAIRA !== 0) return { ok: false, error: "Please give a whole naira amount." };
  return { ok: true, amountKobo: giftKobo };
}
