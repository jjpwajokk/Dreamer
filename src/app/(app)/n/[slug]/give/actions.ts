"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paystackConfigured, siteUrl } from "@/lib/config";
import { planGift, type FeeMode } from "@/lib/money";
import { allow, RATE_LIMITED } from "@/lib/rate-limit";
import { initializeTransaction, newReference } from "@/lib/paystack";
import { firstError, giftSchema } from "@/lib/validation";

export type GiftResult = { url?: string; error?: string };

export async function startGift(input: {
  needId: string;
  amountKobo: number;
  feeMode: FeeMode;
  email: string;
  name?: string;
  anonymous: boolean;
}): Promise<GiftResult> {
  const parsed = giftSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!paystackConfigured()) return { error: "Giving opens very soon. Save this need and we'll be ready for you shortly." };
  if (!(await allow("gift", 10, 600))) return { error: RATE_LIMITED };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: need } = await admin
    .from("needs")
    .select("id, slug, display_name, status, amount_kobo, raised_kobo, expires_at")
    .eq("id", parsed.data.needId)
    .maybeSingle();
  if (!need || need.status !== "live" || (need.expires_at && new Date(need.expires_at) < new Date())) {
    return { error: "This need is no longer taking gifts. Thank you for wanting to help." };
  }

  const gift = planGift(parsed.data.amountKobo, need.amount_kobo - need.raised_kobo, parsed.data.feeMode);
  if (!gift.ok) return { error: gift.error };
  const { plan } = gift;
  const reference = newReference("dr");

  const { error: insertError } = await admin.from("contributions").insert({
    need_id: need.id,
    giver_id: user?.id ?? null,
    giver_email: parsed.data.email.toLowerCase(),
    giver_name: parsed.data.name || null,
    amount_kobo: plan.netKobo,
    fee_kobo: plan.feeKobo,
    fee_mode: plan.mode,
    tip_kobo: 0,
    is_anonymous: parsed.data.anonymous,
    paystack_reference: reference,
    status: "pending",
  });
  if (insertError) {
    console.error("contribution insert failed", insertError);
    return { error: "Something went wrong. Please try again." };
  }

  try {
    const tx = await initializeTransaction({
      email: parsed.data.email,
      amountKobo: plan.chargeKobo,
      reference,
      callbackUrl: `${siteUrl()}/give/thanks?reference=${reference}`,
      metadata: {
        need_id: need.id,
        need_slug: need.slug,
        gift_kobo: plan.netKobo,
        fee_kobo: plan.feeKobo,
        fee_mode: plan.mode,
        custom_fields: [{ display_name: "Gift for", variable_name: "gift_for", value: `${need.display_name} (${need.slug})` }],
      },
    });
    return { url: tx.authorization_url };
  } catch (err) {
    console.error("paystack init failed", err);
    await admin.from("contributions").update({ status: "failed" }).eq("paystack_reference", reference);
    return { error: "We couldn't reach Paystack. Please try again in a moment." };
  }
}
