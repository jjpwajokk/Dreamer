import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { formatNaira } from "@/lib/money";
import { siteUrl } from "@/lib/config";
import { consentToken } from "@/lib/consent";
import { sendSms } from "@/lib/sms";

async function needSummary(needId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("public_needs").select("slug, display_name, institution_label, amount_kobo").eq("id", needId).maybeSingle();
  return data;
}

async function giverEmails(needId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("contributions").select("giver_email").eq("need_id", needId).eq("status", "success");
  return [...new Set((data ?? []).map((r) => (r.giver_email as string).toLowerCase()).filter((e) => !e.endsWith("@example.com")))];
}

async function adminEmailList(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("email").eq("role", "admin");
  return (data ?? []).map((r) => r.email as string).filter(Boolean);
}

export async function notifyGiftReceived(reference: string, funded: boolean) {
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("contributions")
    .select("need_id, giver_email, giver_name, amount_kobo, fee_kobo, tip_kobo, paid_at")
    .eq("paystack_reference", reference)
    .maybeSingle();
  if (!c) return;
  const need = await needSummary(c.need_id);
  if (!need) return;
  const url = `${siteUrl()}/n/${need.slug}`;
  await sendEmail({
    to: c.giver_email,
    subject: `Thank you for helping ${need.display_name}`,
    text: [
      `Hi${c.giver_name ? ` ${c.giver_name}` : ""},`,
      ``,
      `Your gift of ${formatNaira(c.amount_kobo)} to ${need.display_name} has been received.`,
      c.fee_kobo ? `Platform fee: ${formatNaira(c.fee_kobo)} (5%). It pays for verification, payment processing and payouts.` : ``,
      `Reference: ${reference}`,
      ``,
      `The money will be paid directly to ${need.institution_label ?? "the institution"}, never to a personal account. We'll email you when it's paid, and when ${need.display_name} posts an update.`,
      ``,
      `Follow ${need.display_name}'s story: ${url}`,
      `See everything you've given: ${siteUrl()}/me`,
    ].join("\n"),
  });
  if (funded) {
    await sendEmail({
      to: await giverEmails(c.need_id),
      subject: `${need.display_name}'s need is fully funded`,
      text: `Together, givers have raised the full ${formatNaira(need.amount_kobo)} for ${need.display_name}. Next, we pay it straight to ${need.institution_label ?? "the institution"}.\n\n${url}`,
    });
    await sendEmail({
      to: await adminEmailList(),
      subject: `Payout due: ${need.display_name}`,
      text: `${need.display_name}'s need is fully funded and ready for payout.\n\n${siteUrl()}/admin/payouts`,
    });
  }
}

export async function notifyPaidOut(needId: string) {
  const need = await needSummary(needId);
  if (!need) return;
  await sendEmail({
    to: await giverEmails(needId),
    subject: `Paid: your gift for ${need.display_name} reached ${need.institution_label ?? "the institution"}`,
    text: `Good news. The money you gave has been paid directly to ${need.institution_label ?? "the institution"} for ${need.display_name}. We've asked ${need.display_name} to share an update when they can.\n\n${siteUrl()}/n/${need.slug}`,
  });
}

export async function notifyUpdatePosted(needId: string) {
  const need = await needSummary(needId);
  if (!need) return;
  await sendEmail({
    to: await giverEmails(needId),
    subject: `${need.display_name} posted an update`,
    text: `Good news! ${need.display_name}, whom you backed, has shared some progress.\n\nRead it here: ${siteUrl()}/n/${need.slug}`,
  });
}

/**
 * A need expired before it was fully funded. Ask every giver what they want:
 * a refund, or to move the gift to someone with a similar need.
 */
export async function notifyNeedExpired(needId: string, displayName: string) {
  const admin = createAdminClient();
  const { data: gifts } = await admin
    .from("contributions")
    .select("id, giver_email, giver_name, amount_kobo")
    .eq("need_id", needId)
    .eq("status", "success")
    .is("expiry_choice", null);
  for (const g of gifts ?? []) {
    const link = `${siteUrl()}/consent/${consentToken(g.id as string)}`;
    await sendEmail({
      to: g.giver_email as string,
      subject: `${displayName}'s need closed before it was fully funded`,
      text: [
        `Hi${g.giver_name ? ` ${g.giver_name}` : ""},`,
        ``,
        `${displayName}'s need reached its 30-day limit before the full amount was raised, so we won't pay out a partial amount without your say.`,
        `Your gift of ${formatNaira(g.amount_kobo as number)} is safe. Please choose what happens to it:`,
        ``,
        `• Refund it to you, or`,
        `• Move it to another verified person with a similar need.`,
        ``,
        `Choose here (no sign-in needed): ${link}`,
        ``,
        `If we don't hear from you within 14 days, we'll refund you.`,
      ].join("\n"),
    });
  }
}

/** Tells a giver their gift was refunded because the need couldn't be verified in time. */
export async function notifyEscrowRefund(contributionId: string) {
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("contributions")
    .select("giver_email, giver_name, amount_kobo, fee_kobo, tip_kobo, need:needs(display_name)")
    .eq("id", contributionId)
    .maybeSingle();
  if (!c?.giver_email) return;
  const need = (Array.isArray(c.need) ? c.need[0] : c.need) as { display_name: string } | null;
  const total = (c.amount_kobo as number) + (c.fee_kobo as number) + (c.tip_kobo as number);
  await sendEmail({
    to: c.giver_email as string,
    subject: "Your gift has been refunded in full",
    text: [
      `Hi${c.giver_name ? ` ${c.giver_name}` : ""},`,
      ``,
      `We hold every gift safely until a need is fully verified. We couldn't complete the checks for ${need?.display_name ?? "the need you supported"} in time, so we've refunded your ${formatNaira(total)} in full, fees included.`,
      `It can take 5 to 10 working days to reach your account.`,
      ``,
      `Thank you for giving. There are many verified people on Dreamer you can still back: ${siteUrl()}/discover`,
    ].join("\n"),
  });
}

/** Reminds the person helped to post an update, 2 weeks and 3 months after payout. */
export async function remindForUpdate(needId: string, which: "2w" | "3m") {
  const admin = createAdminClient();
  const { data: need } = await admin.from("needs").select("id, display_name, created_by, contact_phone").eq("id", needId).maybeSingle();
  if (!need) return;
  let email: string | null = null;
  if (need.created_by) {
    const { data: p } = await admin.from("profiles").select("email").eq("user_id", need.created_by).maybeSingle();
    email = (p?.email as string) ?? null;
  }
  const link = `${siteUrl()}/me/needs`;
  const when = which === "2w" ? "two weeks" : "three months";
  const text =
    which === "2w"
      ? `It's been ${when} since we paid ${need.display_name}'s bill. Your givers would love to know how it's going. A short note and a photo is perfect.`
      : `It's been ${when} since ${need.display_name}'s need was met. A quick update on what has changed means a lot to the people who gave.`;
  if (email) await sendEmail({ to: email, subject: `A quick update for ${need.display_name}'s givers?`, text: `${text}\n\nPost it here: ${link}` });
  await sendSms(need.contact_phone as string | null, `Dreamer: ${text} Post at ${link}`);
}
