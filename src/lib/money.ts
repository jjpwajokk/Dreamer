// All money is handled as integer kobo. ₦1 = 100 kobo.

export const KOBO_PER_NAIRA = 100;
export const MIN_GIFT_KOBO = 1_000 * KOBO_PER_NAIRA;
export const MIN_NEED_KOBO = 1_000 * KOBO_PER_NAIRA;
export const QUICK_PICKS_KOBO = [2_000, 5_000, 10_000, 20_000].map((n) => n * KOBO_PER_NAIRA);

/** Platform fee: a flat 5% of the gift, no cap. Covers verification, payment and payout costs (larger gifts need more checks). */
export const FEE_PERCENT = 5;
export type FeeMode = "on_top" | "deducted";

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

/** The platform fee on an amount: 5%, rounded down to whole naira. */
export function platformFeeKobo(baseKobo: number): number {
  if (!Number.isSafeInteger(baseKobo) || baseKobo <= 0) return 0;
  const raw = Math.floor((baseKobo * FEE_PERCENT) / 100);
  return raw - (raw % KOBO_PER_NAIRA);
}

export type GiftBreakdown = {
  /** What the giver is charged by Paystack. */
  chargeKobo: number;
  /** What is credited to the need and paid to the institution. */
  netKobo: number;
  feeKobo: number;
  mode: FeeMode;
  /** True when the gift was reduced to exactly what the need still needs. */
  finishes: boolean;
};

/**
 * Splits a gift into the charge, the platform fee and the amount credited.
 * - on_top: the person receives the full gift, the giver pays gift + fee.
 * - deducted: the giver pays the gift, the person receives gift - fee.
 * When the credited amount would pass what the need still needs, it is reduced
 * to exactly the remainder and the fee is worked out on that remainder.
 */
export function giftBreakdown(giftKobo: number, remaining: number, mode: FeeMode): GiftBreakdown {
  let net = mode === "on_top" ? giftKobo : giftKobo - platformFeeKobo(giftKobo);
  if (net >= remaining) {
    const fee = platformFeeKobo(remaining);
    return { chargeKobo: remaining + fee, netKobo: remaining, feeKobo: fee, mode, finishes: true };
  }
  net = Math.max(net, 0);
  const fee = mode === "on_top" ? platformFeeKobo(giftKobo) : giftKobo - net;
  return { chargeKobo: net + fee, netKobo: net, feeKobo: fee, mode, finishes: false };
}

export type GiftPlan = { ok: true; plan: GiftBreakdown } | { ok: false; error: string };

/** Validates what the giver typed and works out the charge, fee and credited amount. */
export function planGift(giftKobo: number, remaining: number, mode: FeeMode): GiftPlan {
  if (!Number.isSafeInteger(giftKobo) || giftKobo <= 0) return { ok: false, error: "Enter an amount." };
  if (remaining <= 0) return { ok: false, error: "This need is already fully funded." };
  if (giftKobo % KOBO_PER_NAIRA !== 0) return { ok: false, error: "Please give a whole naira amount." };
  const plan = giftBreakdown(giftKobo, remaining, mode);
  if (!plan.finishes && giftKobo < MIN_GIFT_KOBO) return { ok: false, error: `The smallest gift is ${formatNaira(MIN_GIFT_KOBO)}.` };
  return { ok: true, plan };
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

/** Gifts above this need a signed-in, ID-verified giver (anti-money-laundering). Smaller gifts stay open to guests. */
export const KYC_GIFT_THRESHOLD_KOBO = 200_000_00;
