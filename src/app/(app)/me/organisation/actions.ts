"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession, kycDone } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NIGERIAN_STATES, slugify } from "@/lib/format";
import { ORG_TYPES } from "@/lib/sectors";
import { isBanned } from "@/lib/identity";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/config";
import { logAudit } from "@/lib/audit";
import { socialsFromForm, visibilityFromForm } from "@/lib/socials";

export type OrgResult = { ok?: boolean; error?: string; id?: string };

const schema = z.object({
  name: z.string().trim().min(2, "Enter the organisation's registered name").max(160),
  org_type: z.enum(ORG_TYPES),
  tagline: z.string().trim().max(140).optional().or(z.literal("")),
  about: z.string().trim().min(40, "Tell people about your work in at least 40 characters").max(3000),
  impact: z.string().trim().max(2000).optional().or(z.literal("")),
  people_supported: z.coerce.number().int().min(0).max(10_000_000).optional().or(z.literal("")),
  year_founded: z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional().or(z.literal("")),
  cac_number: z.string().trim().min(4, "Enter your CAC registration number (RC, BN or IT number)").max(40),
  state: z.enum(NIGERIAN_STATES, { message: "Choose a state" }),
  city: z.string().trim().min(2, "Enter the town or city").max(60),
  address: z.string().trim().min(5, "Enter the address").max(240),
  contact_name: z.string().trim().min(2, "Who should we speak to?").max(80),
  contact_phone: z.string().trim().min(7, "Enter a phone number").max(20),
  contact_email: z.string().trim().email("Enter a valid email").max(120),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  bank_code: z.string().trim().min(3, "Choose the bank"),
  bank_name: z.string().trim().max(80).optional(),
  account_number: z.string().trim().regex(/^\d{10}$/, "Account numbers have 10 digits"),
  account_name: z.string().trim().min(2, "Enter the account name").max(160),
});

function nameMatches(orgName: string, accountName: string): boolean {
  const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !["the", "and", "ltd", "limited", "foundation", "home", "initiative", "trust"].includes(w));
  const a = new Set(words(accountName));
  return words(orgName).some((w) => a.has(w));
}

export async function saveOrganisation(orgId: string | null, input: unknown): Promise<OrgResult> {
  const session = await getSession();
  if (!session || session.profile?.banned_at) return { error: "Please sign in again." };
  if (!kycDone(session)) return { error: "Please get verified first. The person managing an organisation needs to be verified too." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const d = parsed.data;
  const rawSocials = ((input as { socials?: Record<string, unknown> })?.socials ?? {}) as Record<string, unknown>;
  let socials;
  try {
    socials = socialsFromForm(rawSocials);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (d.website && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(d.website) && !/^[^\s]+\.[^\s]+$/.test(d.website)) {
    return { error: "That website address doesn't look right" };
  }
  if (!nameMatches(d.name, d.account_name)) {
    return { error: "The account must be the organisation's own official account, in its name. Personal accounts can't be used for organisations." };
  }
  if (await isBanned([{ kind: "account", value: d.account_number }])) return { error: "This account can't be used on Dreamer." };
  const values = {
    ...d,
    tagline: d.tagline || null,
    impact: d.impact || "",
    people_supported: d.people_supported === "" || d.people_supported === undefined ? null : d.people_supported,
    year_founded: d.year_founded === "" || d.year_founded === undefined ? null : d.year_founded,
    website: d.website ? (/^https?:\/\//i.test(d.website) ? d.website : `https://${d.website}`) : null,
    socials,
    socials_visibility: visibilityFromForm(rawSocials.socials_visibility),
  };
  const admin = createAdminClient();
  if (orgId) {
    const { data: org } = await admin.from("organisations").select("owner_id, status, account_number, bank_code").eq("id", orgId).maybeSingle();
    if (!org || org.owner_id !== session.userId) return { error: "Not your organisation." };
    if (org.status === "verified" && (org.account_number !== d.account_number || org.bank_code !== d.bank_code)) {
      return { error: "To change a verified organisation's bank account, contact us so we can re-check it." };
    }
    if (org.status === "suspended" || org.status === "rejected") return { error: "This organisation can't be edited. Contact us." };
    const { error } = await admin.from("organisations").update(values).eq("id", orgId);
    if (error) return { error: "Couldn't save. Please check the details." };
    revalidatePath("/me/organisation");
    return { ok: true, id: orgId };
  }
  const { data, error } = await admin
    .from("organisations")
    .insert({ ...values, owner_id: session.userId, slug: slugify(d.name), status: "draft" })
    .select("id")
    .single();
  if (error) return { error: "Couldn't create the organisation. Please check the details." };
  await logAudit({ actorId: session.userId, action: "org.created", entity: "organisation", entityId: data.id as string, after: { name: d.name } });
  revalidatePath("/me/organisation");
  return { ok: true, id: data.id as string };
}

export async function recordOrgDoc(orgId: string, kind: string, path: string, fileName: string): Promise<OrgResult> {
  const session = await getSession();
  if (!session || !path.startsWith(`${session.userId}/`)) return { error: "Please sign in again." };
  const k = z.enum(["cac_certificate", "scuml", "board_letter", "tax_id", "proof_of_address", "other"]).safeParse(kind);
  if (!k.success) return { error: "Unknown document type." };
  const admin = createAdminClient();
  const { data: org } = await admin.from("organisations").select("owner_id").eq("id", orgId).maybeSingle();
  if (org?.owner_id !== session.userId) return { error: "Not your organisation." };
  const { error } = await admin.from("verification_documents").insert({ owner_id: session.userId, org_id: orgId, kind: k.data, storage_path: path, file_name: fileName.slice(0, 120) });
  if (error) return { error: "Couldn't save the file." };
  revalidatePath("/me/organisation");
  return { ok: true };
}

export async function submitOrganisation(orgId: string): Promise<OrgResult> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const admin = createAdminClient();
  const { data: org } = await admin.from("organisations").select("owner_id, status, name").eq("id", orgId).maybeSingle();
  if (!org || org.owner_id !== session.userId) return { error: "Not your organisation." };
  if (!["draft", "needs_info"].includes(org.status as string)) return { error: "Already submitted." };
  const { count } = await admin.from("verification_documents").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("kind", "cac_certificate");
  if (!count) return { error: "Please upload your CAC certificate first." };
  await admin.from("organisations").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", orgId);
  await logAudit({ actorId: session.userId, action: "org.submitted", entity: "organisation", entityId: orgId });
  const { data: admins } = await admin.from("profiles").select("email").eq("role", "admin");
  await sendEmail({
    to: (admins ?? []).map((a) => a.email as string).filter(Boolean),
    subject: `New organisation to verify: ${org.name}`,
    text: `${org.name} submitted its details and documents for review.\n\n${siteUrl()}/admin/organisations/${orgId}`,
  });
  revalidatePath("/me/organisation");
  return { ok: true };
}
