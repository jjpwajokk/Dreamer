import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { readConsentToken } from "@/lib/consent";
import { formatNaira } from "@/lib/money";
import { Card, LinkButton } from "@/components/ui";
import { ChoiceForm } from "./choice-form";

export const metadata: Metadata = { title: "Your gift", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ConsentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = readConsentToken(token);
  const admin = createAdminClient();
  const { data: c } = id
    ? await admin.from("contributions").select("status, amount_kobo, expiry_choice, need:needs(display_name, status)").eq("id", id).maybeSingle()
    : { data: null };
  const need = (Array.isArray(c?.need) ? c?.need[0] : c?.need) as { display_name: string; status: string } | null | undefined;

  let body: React.ReactNode;
  if (!c || !need) {
    body = (
      <>
        <h1 className="font-display text-2xl">This link isn&apos;t valid</h1>
        <p className="mt-2 text-sm text-muted">Please use the link in the email we sent you, or contact us with your payment reference.</p>
        <LinkButton href="/" variant="secondary" className="mt-6">Go to Dreamer</LinkButton>
      </>
    );
  } else if (c.status === "refunded" || c.status === "redirected") {
    body = (
      <>
        <h1 className="font-display text-2xl">All settled</h1>
        <p className="mt-2 text-sm text-muted">
          Your {formatNaira(c.amount_kobo)} gift has been {c.status === "refunded" ? "refunded to you" : "moved to another verified person"}. Thank you for giving.
        </p>
        <LinkButton href="/discover" className="mt-6">Meet someone new</LinkButton>
      </>
    );
  } else {
    body = (
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Your gift</p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">What should happen to your {formatNaira(c.amount_kobo)}?</h1>
        <p className="mt-2 text-[15px] text-muted">
          {need.display_name}&apos;s need closed before it was fully funded. We don&apos;t pay out part of a bill without your say, so your gift is safe and waiting.
        </p>
        <div className="mt-6">
          <ChoiceForm token={token} current={(c.expiry_choice as "refund" | "redirect" | null) ?? null} />
        </div>
        <p className="mt-4 text-xs text-muted">If we don&apos;t hear from you within 14 days of our email, we refund you.</p>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-14 sm:py-20">
      <Card className="p-6 sm:p-8">{body}</Card>
    </div>
  );
}
