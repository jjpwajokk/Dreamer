import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { formatNaira } from "@/lib/money";
import { siteUrl } from "@/lib/config";

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
    .select("need_id, giver_email, giver_name, amount_kobo, tip_kobo, paid_at")
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
      `Your gift of ${formatNaira(c.amount_kobo)} to ${need.display_name} has been received.${c.tip_kobo ? ` Thank you also for the ${formatNaira(c.tip_kobo)} tip to Dreamer.` : ""}`,
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
    subject: `Paid: ${need.display_name}'s fees reached ${need.institution_label ?? "the institution"}`,
    text: `Good news. The money you gave has been paid directly to ${need.institution_label ?? "the institution"} for ${need.display_name}. We've asked ${need.display_name} to share an update when they can.\n\n${siteUrl()}/n/${need.slug}`,
  });
}

export async function notifyUpdatePosted(needId: string) {
  const need = await needSummary(needId);
  if (!need) return;
  await sendEmail({
    to: await giverEmails(needId),
    subject: `${need.display_name} posted an update`,
    text: `${need.display_name}, whom you helped, has shared what changed.\n\nRead it here: ${siteUrl()}/n/${need.slug}`,
  });
}
