"use client";

import { useMemo, useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { cn as cnSafe } from "@/lib/format";
import { MIN_GIFT_KOBO, QUICK_PICKS_KOBO, TIP_PERCENT_OPTIONS, checkGift, formatNaira, parseNairaToKobo, tipKobo } from "@/lib/money";
import { startGift } from "./actions";

export function GiveForm({
  needId,
  name,
  remainingKobo,
  defaultEmail,
}: {
  needId: string;
  name: string;
  remainingKobo: number;
  defaultEmail: string;
}) {
  const picks = QUICK_PICKS_KOBO.filter((k) => k < remainingKobo);
  const [amountText, setAmountText] = useState(String((picks[1] ?? picks[0] ?? remainingKobo) / 100));
  const [tipPercent, setTipPercent] = useState<number>(5);
  const [email, setEmail] = useState(defaultEmail);
  const [giverName, setGiverName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const amountKobo = parseNairaToKobo(amountText) ?? 0;
  const check = useMemo(() => checkGift(amountKobo, remainingKobo), [amountKobo, remainingKobo]);
  const giftKobo = check.ok ? check.amountKobo : 0;
  const tip = tipKobo(giftKobo, tipPercent);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!check.ok) return setError(check.error);
    start(async () => {
      const res = await startGift({ needId, amountKobo: giftKobo, tipPercent, email, name: giverName, anonymous });
      if (res.error) setError(res.error);
      else if (res.url) window.location.href = res.url;
    });
  }

  const pickClass = (active: boolean) =>
    cnSafe(
      "h-12 rounded-xl border text-[15px] font-semibold transition",
      active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface hover:bg-bg",
    );

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">How much would you like to give?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {picks.map((k) => (
            <button type="button" key={k} className={pickClass(amountKobo === k)} onClick={() => setAmountText(String(k / 100))}>
              {formatNaira(k)}
            </button>
          ))}
          <button type="button" className={pickClass(amountKobo === remainingKobo)} onClick={() => setAmountText(String(remainingKobo / 100))}>
            Finish it · {formatNaira(remainingKobo)}
          </button>
        </div>
        <div className="mt-3">
          <Field label="Or enter an amount (₦)" htmlFor="amount" error={amountText && !check.ok ? check.error : null} hint={`From ${formatNaira(MIN_GIFT_KOBO)}. ${formatNaira(remainingKobo)} still needed.`}>
            <Input id="amount" inputMode="numeric" value={amountText} onChange={(e) => setAmountText(e.target.value)} />
          </Field>
        </div>
        {check.ok && check.amountKobo < amountKobo ? (
          <p className="mt-2 text-sm text-brand">Only {formatNaira(check.amountKobo)} is still needed, so that&apos;s what we&apos;ll charge. Thank you!</p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Add a tip for Dreamer? (optional)</legend>
        <p className="mb-2 text-xs text-muted">{name} receives 100% of your gift. Tips cover payment fees and verification calls.</p>
        <div className="grid grid-cols-3 gap-2">
          {TIP_PERCENT_OPTIONS.map((p) => (
            <button type="button" key={p} className={pickClass(tipPercent === p)} onClick={() => setTipPercent(p)}>
              {p === 0 ? "No tip" : `${p}%`}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-4">
        <Field label="Email for your receipt" htmlFor="email" hint="We'll tell you when the money reaches the school and when there's an update.">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Your first name (optional)" htmlFor="giver-name">
          <Input id="giver-name" autoComplete="given-name" value={giverName} onChange={(e) => setGiverName(e.target.value)} maxLength={60} />
        </Field>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-brand)]" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          Give anonymously ({name} won&apos;t see your name)
        </label>
      </div>

      <div className="rounded-2xl bg-bg p-4 text-sm">
        <div className="flex justify-between"><span>Gift to {name}</span><span className="font-semibold">{formatNaira(giftKobo)}</span></div>
        <div className="mt-1 flex justify-between"><span>Tip to Dreamer</span><span>{formatNaira(tip)}</span></div>
        <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-bold"><span>Total</span><span>{formatNaira(giftKobo + tip)}</span></div>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending || !check.ok}>
        <Lock className="h-4 w-4" aria-hidden /> {pending ? "Opening Paystack…" : `Give ${formatNaira(giftKobo + tip)} with Paystack`}
      </Button>
      <p className="text-center text-xs text-muted">Card, bank transfer or USSD. Secured by Paystack.</p>
    </form>
  );
}
