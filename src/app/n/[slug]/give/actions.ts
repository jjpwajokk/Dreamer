"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paystackConfigured, siteUrl } from "@/lib/config";
import { checkGift, tipKobo } from "@/lib/money";
import { initializeTransaction, newReference } from "@/lib/paystack";
import { firstError, giftSchema } from "@/lib/validation";

export type GiftResult = { url?: string; error?: string };

export async function startGift(input: {
  needId: string;
  amountKobo: number;
  tipPercent: number;
  email: string;
  name?: string;
  anonymous: boolean;
}): Promise<GiftResult> {
  const parsed = giftSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!paystackConfigured()) return { error: "Payments aren't switched on yet. Add the Paystack test keys to start giving." };

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

  const gift = checkGift(parsed.data.amountKobo, need.amount_kobo - need.raised_kobo);
  if (!gift.ok) return { error: gift.error };
  const tip = tipKobo(gift.amountKobo, parsed.data.tipPercent);
  const reference = newReference("dr");

  const { error: insertError } = await admin.from("contributions").insert({
    need_id: need.id,
    giver_id: user?.id ?? null,
    giver_email: parsed.data.email.toLowerCase(),
    giver_name: parsed.data.name || null,
    amount_kobo: gift.amountKobo,
    tip_kobo: tip,
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
      amountKobo: gift.amountKobo + tip,
      reference,
      callbackUrl: `${siteUrl()}/give/thanks?reference=${reference}`,
      metadata: {
        need_id: need.id,
        need_slug: need.slug,
        gift_kobo: gift.amountKobo,
        tip_kobo: tip,
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
