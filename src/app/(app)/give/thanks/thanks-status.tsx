"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card, LinkButton } from "@/components/ui";
import { formatNaira } from "@/lib/money";

type Status = {
  status: "pending" | "success" | "failed" | "refunded";
  amount_kobo: number;
  fee_kobo: number;
  fee_mode: "on_top" | "deducted" | null;
  guest: boolean;
  need: { slug: string; display_name: string; status: string } | null;
};

export function ThanksStatus({ reference }: { reference: string }) {
  const [data, setData] = useState<Status | null>(null);
  const [tries, setTries] = useState(0);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!reference) return setMissing(true);
    let stop = false;
    async function poll() {
      const res = await fetch(`/api/contributions/status?reference=${encodeURIComponent(reference)}`, { cache: "no-store" });
      if (!res.ok) {
        setMissing(true);
        return;
      }
      const json = (await res.json()) as Status;
      if (stop) return;
      setData(json);
      if (json.status === "pending") setTimeout(() => setTries((t) => t + 1), 2500);
    }
    void poll();
    return () => {
      stop = true;
    };
  }, [reference, tries]);

  if (missing) {
    return (
      <Card className="p-6 text-center">
        <p className="font-display text-xl font-semibold">We couldn&apos;t find that gift</p>
        <p className="mt-2 text-sm text-muted">If you were charged, your receipt from Paystack has a reference. Contact us with it and we&apos;ll sort it out.</p>
        <LinkButton href="/discover" className="mt-4">Back to Discover</LinkButton>
      </Card>
    );
  }

  if (!data || data.status === "pending") {
    return (
      <Card className="p-6 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" aria-hidden />
        <p className="mt-4 font-display text-xl font-semibold">Confirming your gift with Paystack…</p>
        <p className="mt-2 text-sm text-muted">
          {tries > 8
            ? "This is taking longer than usual. Bank transfers can take a few minutes. We'll email your receipt as soon as it's confirmed, so you can close this page."
            : "This usually takes a few seconds."}
        </p>
      </Card>
    );
  }

  if (data.status !== "success") {
    return (
      <Card className="p-6 text-center">
        <XCircle className="mx-auto h-10 w-10 text-danger" aria-hidden />
        <p className="mt-4 font-display text-xl font-semibold">The payment didn&apos;t go through</p>
        <p className="mt-2 text-sm text-muted">No money was taken for this gift. You can try again.</p>
        {data.need ? <LinkButton href={`/n/${data.need.slug}/give`} className="mt-4">Try again</LinkButton> : null}
      </Card>
    );
  }

  const name = data.need?.display_name ?? "them";
  return (
    <Card className="p-6 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-brand" aria-hidden />
      <p className="mt-4 font-display text-2xl font-semibold">Thank you!</p>
      <p className="mt-2 text-[15px]">
        Your {formatNaira(data.amount_kobo)} is on its way to {name}&apos;s {data.need?.status === "funded" ? "fully funded " : ""}need.
      </p>
      <p className="mt-2 text-sm text-muted">{data.fee_kobo ? `It includes a ${formatNaira(data.fee_kobo)} platform fee that keeps verification and payouts running. ` : ""}We&apos;ll email you when it&apos;s paid to the institution, and when {name} posts an update.</p>
      <div className="mt-6 flex flex-col gap-2">
        {data.guest ? (
          <LinkButton href="/login?next=/me&mode=signup">Create an account to follow {name}</LinkButton>
        ) : (
          <LinkButton href="/me">See my impact</LinkButton>
        )}
        <LinkButton href="/discover" variant="secondary">Meet someone else</LinkButton>
      </div>
    </Card>
  );
}
