import { test } from "node:test";
import assert from "node:assert/strict";
import { checkGift, formatNaira, parseNairaToKobo, progressPercent, remainingKobo, tipKobo } from "../src/lib/money.ts";

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

test("tips round down to whole naira and never affect the gift", () => {
  assert.equal(tipKobo(1_000_000, 5), 50_000);
  assert.equal(tipKobo(123_400, 5), 6_100);
  assert.equal(tipKobo(1_000_000, 0), 0);
});

test("progress and remaining", () => {
  assert.equal(progressPercent(18_500_000, 6_200_000), 33);
  assert.equal(progressPercent(100, 500), 100);
  assert.equal(remainingKobo(100, 500), 0);
});
