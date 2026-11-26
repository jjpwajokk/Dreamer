import { test } from "node:test";
import assert from "node:assert/strict";
import { checkGift, formatNaira, parseNairaToKobo, progressPercent, remainingKobo, platformFeeKobo, giftBreakdown } from "../src/lib/money.ts";

test("formats kobo as naira", () => {
  assert.equal(formatNaira(123_450_00), "₦123,450");
  assert.equal(formatNaira(0), "₦0");
  assert.equal(formatNaira(99), "₦0");
});

test("parses naira input into kobo", () => {
  assert.equal(parseNairaToKobo("185,000"), 18_500_000);
  assert.equal(parseNairaToKobo("₦2000"), 200_000);
  assert.equal(parseNairaToKobo("10.5"), 1_050);
  assert.equal(parseNairaToKobo("abc"), null);
  assert.equal(parseNairaToKobo("-5"), null);
  assert.equal(parseNairaToKobo("1.234"), null);
});

test("gift rules: minimum ₦1,000, capped at what is still needed", () => {
  assert.deepEqual(checkGift(500_000, 10_000_000), { ok: true, amountKobo: 500_000 });
  assert.equal(checkGift(50_000, 10_000_000).ok, false);
  assert.deepEqual(checkGift(20_000_000, 3_000_000), { ok: true, amountKobo: 3_000_000 });
  assert.deepEqual(checkGift(100_000, 40_000), { ok: true, amountKobo: 40_000 }, "a small remainder can be finished");
  assert.equal(checkGift(100_000, 0).ok, false);
  assert.equal(checkGift(100_050, 10_000_000).ok, false, "whole naira only");
});

test("platform fee is a flat 5%, whole naira, no cap", () => {
  assert.equal(platformFeeKobo(1_000_000), 50_000);
  assert.equal(platformFeeKobo(123_400), 6_100);
  assert.equal(platformFeeKobo(100_000_00), 500_000, "₦100,000 gift pays ₦5,000");
  assert.equal(platformFeeKobo(1_000_000_00), 5_000_000, "no cap: ₦1,000,000 pays ₦50,000");
  assert.equal(platformFeeKobo(0), 0);
});

test("fee on top: the person receives the full gift", () => {
  assert.deepEqual(giftBreakdown(1_000_000, 50_000_000, "on_top"), { chargeKobo: 1_050_000, netKobo: 1_000_000, feeKobo: 50_000, mode: "on_top", finishes: false });
});

test("fee deducted: the giver pays the gift, the person receives less the fee", () => {
  assert.deepEqual(giftBreakdown(1_000_000, 50_000_000, "deducted"), { chargeKobo: 1_000_000, netKobo: 950_000, feeKobo: 50_000, mode: "deducted", finishes: false });
  const big = giftBreakdown(20_000_000, 50_000_000, "deducted");
  assert.equal(big.feeKobo, 1_000_000);
  assert.equal(big.netKobo, 19_000_000);
});

test("a gift larger than what is left finishes the need exactly", () => {
  for (const mode of ["on_top", "deducted"] as const) {
    const b = giftBreakdown(5_000_000, 3_000_000, mode);
    assert.equal(b.netKobo, 3_000_000);
    assert.equal(b.feeKobo, 150_000);
    assert.equal(b.chargeKobo, 3_150_000);
    assert.equal(b.finishes, true);
  }
});

test("charge always equals credited amount plus fee", () => {
  for (const g of [100_000, 123_400, 999_900, 10_000_000, 77_777_700]) {
    for (const mode of ["on_top", "deducted"] as const) {
      const b = giftBreakdown(g, 60_000_000, mode);
      assert.equal(b.chargeKobo, b.netKobo + b.feeKobo);
      assert.ok(b.feeKobo <= Math.ceil(b.netKobo / 19) + 100);
    }
  }
});

test("progress and remaining", () => {
  assert.equal(progressPercent(18_500_000, 6_200_000), 33);
  assert.equal(progressPercent(100, 500), 100);
  assert.equal(remainingKobo(100, 500), 0);
});
