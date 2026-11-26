"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Check, Lock } from "lucide-react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { cn } from "@/lib/format";
import {
  FEE_PERCENT,
  MIN_GIFT_KOBO,
  QUICK_PICKS_KOBO,
  formatNaira,
  parseNairaToKobo,
  planGift,
  type FeeMode,
} from "@/lib/money";
import { startGift } from "./actions";

export function GiveForm({
  needId,
  name,
  place,
  remainingKobo,
  defaultEmail,
  defaultName,
}: {
  needId: string;
  name: string;
  place: string;
  remainingKobo: number;
  defaultEmail: string;
  defaultName: string;
}) {
  const picks = QUICK_PICKS_KOBO.filter((k) => k < remainingKobo).slice(0, 3);
  const [amountText, setAmountText] = useState(String((picks[1] ?? picks[0] ?? remainingKobo) / 100));
  const [feeMode, setFeeMode] = useState<FeeMode>("on_top");
  const [email, setEmail] = useState(defaultEmail);
  const [giverName, setGiverName] = useState(defaultName);
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const amountKobo = parseNairaToKobo(amountText) ?? 0;
  const result = useMemo(() => planGift(amountKobo, remainingKobo, feeMode), [amountKobo, remainingKobo, feeMode]);
  const plan = result.ok ? result.plan : null;
  const finishActive = plan?.finishes ?? false;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!result.ok) return setError(result.error);
    start(async () => {
      const res = await startGift({ needId, amountKobo, feeMode, email, name: giverName, anonymous });
      if (res.error) setError(res.error);
      else if (res.url) window.location.href = res.url;
    });
  }

  const pickClass = (active: boolean) =>
    cn(
      "tabular h-12 rounded-xl border text-[15px] font-semibold transition",
      active ? "border-brand bg-brand-soft text-brand ring-4 ring-brand/10" : "border-line bg-surface hover:border-ink/20",
    );

  return (
    <form onSubmit={submit} className="space-y-7">
      <fieldset>
        <legend className="mb-3 text-[15px] font-semibold">How much would you like to give?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {picks.map((k) => (
            <button type="button" key={k} className={pickClass(amountKobo === k && !finishActive)} onClick={() => setAmountText(String(k / 100))}>
              {formatNaira(k)}
            </button>
          ))}
          <button type="button" className={cn(pickClass(finishActive), "col-span-2 sm:col-span-1")} onClick={() => setAmountText(String(remainingKobo / 100))}>
            Finish it
          </button>
        </div>
        <div className="mt-3">
          <Field
            label="Or enter an amount"
            htmlFor="amount"
            error={amountText && !result.ok ? result.error : null}
            hint={`From ${formatNaira(MIN_GIFT_KOBO)}. ${formatNaira(remainingKobo)} still needed.`}
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">₦</span>
              <Input id="amount" inputMode="numeric" className="tabular pl-8 text-lg font-semibold" value={amountText} onChange={(e) => setAmountText(e.target.value)} />
            </div>
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-[15px] font-semibold">Who covers the {FEE_PERCENT}% platform fee?</legend>
        <p className="mb-3 text-xs text-muted">
          It pays for verifying every need, secure payments and payouts.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["on_top", "I'll add it", `${name} receives your full gift`],
              ["deducted", "Take it from my gift", "You pay exactly the amount above"],
            ] as const
          ).map(([value, title, sub]) => (
            <button
              type="button"
              key={value}
              onClick={() => setFeeMode(value)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition",
                feeMode === value ? "border-brand bg-brand-soft/60 ring-4 ring-brand/10" : "border-line bg-surface hover:border-ink/20",
              )}
              aria-pressed={feeMode === value}
            >
              <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border", feeMode === value ? "border-brand bg-brand text-white" : "border-line")}>
                {feeMode === value ? <Check className="h-3 w-3" aria-hidden /> : null}
              </span>
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-muted">{sub}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-4">
        <Field label="Email for your receipt" htmlFor="email" hint="We'll tell you when the money is paid and when there's an update.">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Your first name (optional)" htmlFor="giver-name">
          <Input id="giver-name" autoComplete="given-name" value={giverName} onChange={(e) => setGiverName(e.target.value)} maxLength={60} />
        </Field>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 rounded accent-[var(--color-brand)]" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          Give anonymously ({name} won&apos;t see your name)
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-bg">
        <div className="tabular space-y-2 p-4 text-sm">
          <div className="flex justify-between"><span className="text-muted">You pay</span><span className="font-semibold">{formatNaira(plan?.chargeKobo ?? 0)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Platform fee ({FEE_PERCENT}%)</span><span>{formatNaira(plan?.feeKobo ?? 0)}</span></div>
        </div>
        <div className="tabular flex items-center justify-between gap-3 border-t border-line bg-brand-soft/60 px-4 py-3">
          <span className="text-sm font-medium text-brand">
            {name} receives <ArrowRight className="inline h-3.5 w-3.5" aria-hidden /> paid to {place}
          </span>
          <span className="text-lg font-semibold text-brand">{formatNaira(plan?.netKobo ?? 0)}</span>
        </div>
        {plan?.finishes ? (
          <p className="border-t border-line px-4 py-2.5 text-xs text-brand">This gift completes {name}&apos;s need. Thank you!</p>
        ) : null}
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending || !result.ok}>
        <Lock className="h-4 w-4" aria-hidden /> {pending ? "Opening secure checkout…" : `Pay ${formatNaira(plan?.chargeKobo ?? 0)} securely`}
      </Button>
      <p className="text-center text-xs text-muted">Card, bank transfer or USSD · Secured by Paystack</p>
    </form>
  );
}
