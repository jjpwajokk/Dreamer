import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { platformFeeKobo } from "@/lib/money";
import { ESCROW_DAYS, NEED_LIFETIME_DAYS } from "@/lib/config";
import type { Category } from "@/lib/sectors";
import { SAMPLE_EMAIL_SUFFIX, SAMPLE_GIVERS, SAMPLE_NEEDS, SAMPLE_ORGS, sampleEmail, type SampleKind, type SampleNeed } from "./data";

type Admin = ReturnType<typeof createAdminClient>;
const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const ahead = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const dateOnly = (days: number) => new Date(Date.now() + days * DAY + 3_600_000).toISOString().slice(0, 10);

/** Stable pseudo-random numbers so a reload produces the same picture. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export type StepResult = { ok: boolean; message: string };

export const LOAD_STEPS = ["accounts", "education", "healthcare", "housing", "livelihood", "skills", "emergency", "organisations", "extras"] as const;
export type LoadStep = (typeof LOAD_STEPS)[number];

export const STEP_LABEL: Record<LoadStep, string> = {
  accounts: "Sample accounts",
  education: "Education needs",
  healthcare: "Healthcare needs",
  housing: "Housing needs",
  livelihood: "Small business needs",
  skills: "Skills and training needs",
  emergency: "Emergency relief needs",
  organisations: "Organisations",
  extras: "Requests, reviews and queues",
};

/** Every sample account, by handle (the part of the email before the suffix). */
export async function sampleUsers(admin: Admin): Promise<Map<string, string>> {
  const { data } = await admin.from("profiles").select("user_id, email").ilike("email", `%${SAMPLE_EMAIL_SUFFIX}`).limit(500);
  const map = new Map<string, string>();
  for (const p of data ?? []) map.set((p.email as string).slice(0, -SAMPLE_EMAIL_SUFFIX.length), p.user_id as string);
  return map;
}

// ---------------------------------------------------------------------------
// Photos: generated illustrations shipped with the app in /public/samples.
// ---------------------------------------------------------------------------

class Uploader {
  private cache = new Map<string, ArrayBuffer>();
  private admin: Admin;
  private origin: string;
  constructor(admin: Admin, origin: string) {
    this.admin = admin;
    this.origin = origin;
  }
  private async bytes(file: string) {
    const hit = this.cache.get(file);
    if (hit) return hit;
    const res = await fetch(`${this.origin}/samples/${file}.jpg`);
    if (!res.ok) throw new Error(`Couldn't load sample image ${file} (${res.status})`);
    const buf = await res.arrayBuffer();
    this.cache.set(file, buf);
    return buf;
  }
  async put(bucket: "media" | "public-media", path: string, file: string) {
    const { error } = await this.admin.storage.from(bucket).upload(path, await this.bytes(file), { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error(`Upload ${path}: ${error.message}`);
    return path;
  }
}

// ---------------------------------------------------------------------------
// Step 1: accounts
// ---------------------------------------------------------------------------

type AccountSpec = {
  handle: string;
  name: string;
  role: "beneficiary" | "giver";
  state: string;
  city: string;
  bio?: string;
  occupation?: string;
  socials?: Record<string, string>;
  socialsVisibility?: "members" | "on_request";
  kyc: "verified" | "submitted";
};

function accountSpecs(): AccountSpec[] {
  const out: AccountSpec[] = [];
  for (const needs of Object.values(SAMPLE_NEEDS)) {
    for (const n of needs) {
      out.push({
        handle: n.handle,
        name: n.name,
        role: "beneficiary",
        state: n.state,
        city: n.city,
        bio: n.bio ?? n.words,
        occupation: n.occupation,
        socials: n.kind === "verified" ? { instagram: `https://www.instagram.com/sample.${n.handle}` } : undefined,
        socialsVisibility: n.kind === "urgent" ? "on_request" : "members",
        kyc: n.kind === "submitted" ? "submitted" : "verified",
      });
    }
  }
  for (const g of SAMPLE_GIVERS) {
    out.push({ handle: g.handle, name: g.name, role: "giver", state: g.state, city: g.city, bio: g.bio, occupation: g.occupation, socials: g.socials, kyc: "verified" });
  }
  for (const o of SAMPLE_ORGS) {
    out.push({ handle: `org-${o.handle}`, name: o.contact, role: "beneficiary", state: o.state, city: o.city, bio: `Runs ${o.name}.`, kyc: "verified" });
  }
  return out;
}

export async function loadAccounts(admin: Admin, adminId: string, password: string | null): Promise<StepResult> {
  const existing = await sampleUsers(admin);
  let created = 0;
  let passwords = 0;
  for (const a of accountSpecs()) {
    let userId = existing.get(a.handle);
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: sampleEmail(a.handle),
        email_confirm: true,
        ...(password ? { password } : {}),
        user_metadata: { display_name: a.name, sample: true },
      });
      if (error || !data.user) return { ok: false, message: `Couldn't create ${a.name}: ${error?.message ?? "unknown error"}` };
      userId = data.user.id;
      created++;
    } else if (password) {
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return { ok: false, message: `Couldn't set the password for ${a.name}: ${error.message}` };
      passwords++;
    }
    const profile = {
      user_id: userId,
      email: sampleEmail(a.handle),
      display_name: a.name,
      role: a.role,
      state: a.state,
      city: a.city,
      bio: a.bio?.slice(0, 280) ?? null,
      occupation: a.occupation ?? null,
      socials: a.socials ?? {},
      socials_visibility: a.socialsVisibility ?? "members",
      kyc_status: a.kyc,
      id_type: "nin",
      id_last4: String(1000 + (a.handle.length * 791) % 9000).slice(0, 4),
      kyc_submitted_at: ago(20),
      kyc_reviewed_at: a.kyc === "verified" ? ago(18) : null,
      kyc_reviewed_by: a.kyc === "verified" ? adminId : null,
      profile_public: true,
    };
    const { error } = await admin.from("profiles").upsert(profile, { onConflict: "user_id" });
    if (error) return { ok: false, message: `Profile for ${a.name}: ${error.message}` };
  }
  const total = accountSpecs().length;
  return {
    ok: true,
    message: `${total} accounts ready (${created} new${passwords ? `, password updated on ${passwords}` : ""}).`,
  };
}

// ---------------------------------------------------------------------------
// Needs
// ---------------------------------------------------------------------------

type NeedPlan = {
  ownerId: string;
  slug: string;
  category: Category;
  relationship: string;
  minor: boolean;
  name: string;
  state: string;
  city: string;
  title: string;
  story: string;
  words: string;
  amountKobo: number;
  kind: SampleKind;
  raised?: number;
  deadlineDays?: number;
  photos: string[];
  institutionId: string;
  orgId?: string;
  update?: SampleNeed["update"];
  gallerySensitiveIndex?: number;
};

async function makeInstitution(
  admin: Admin,
  ownerId: string,
  adminId: string,
  p: { name: string; type: string; state: string; city: string; verified: boolean; orgId?: string },
  rand: () => number,
) {
  const { data, error } = await admin
    .from("institutions")
    .insert({
      name: p.name,
      type: p.type,
      state: p.state,
      address: `${p.city}, ${p.state} State`,
      contact_name: p.type === "organisation" ? "Accounts officer" : "Accounts office",
      contact_phone: `0800 000 ${String(Math.floor(rand() * 9000) + 1000)}`,
      bank_code: "058",
      bank_name: "Guaranty Trust Bank",
      account_number: String(Math.floor(rand() * 9_000_000_000) + 1_000_000_000),
      account_name: p.name.toUpperCase(),
      verified_at: p.verified ? ago(15) : null,
      verified_by: p.verified ? adminId : null,
      account_resolved_at: p.verified ? ago(15) : null,
      created_by: ownerId,
      org_id: p.orgId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Payee ${p.name}: ${error.message}`);
  return data.id as string;
}

async function makeNeed(admin: Admin, up: Uploader, adminId: string, givers: { id: string | null; name: string; email: string; anon: boolean }[], plan: NeedPlan) {
  const rand = seeded(plan.slug);
  const live = plan.kind !== "submitted";
  const verified = plan.kind === "verified" || plan.kind === "urgent" || plan.kind === "completed";
  const completed = plan.kind === "completed";
  const publishedDays = completed ? 40 + Math.floor(rand() * 20) : 2 + Math.floor(rand() * 18);
  const deadlineDays = plan.deadlineDays;

  const { data: need, error } = await admin
    .from("needs")
    .insert({
      slug: plan.slug,
      beneficiary_id: plan.relationship === "self" ? plan.ownerId : null,
      created_by: plan.ownerId,
      relationship: plan.relationship,
      category: plan.category,
      title: plan.title,
      story: plan.story,
      my_words: plan.words,
      display_name: plan.name,
      state: plan.state,
      city: plan.city,
      is_minor: plan.minor,
      contact_phone: `0800 111 ${String(Math.floor(rand() * 9000) + 1000)}`,
      consent_at: ago(publishedDays + 2),
      amount_kobo: plan.amountKobo,
      raised_kobo: 0,
      institution_id: plan.institutionId,
      org_id: plan.orgId ?? null,
      status: plan.kind === "submitted" ? "submitted" : "live",
      verified_at: verified ? ago(Math.max(publishedDays - 1, 0)) : null,
      verified_by: verified ? adminId : null,
      verification_note: verified ? "Sample data: bill confirmed with the payee by phone; payee account name matches." : null,
      submitted_at: ago(live ? publishedDays + 2 : 1),
      published_at: live ? ago(publishedDays) : null,
      expires_at: live ? ahead(NEED_LIFETIME_DAYS - publishedDays) : null,
      escrow_deadline: plan.kind === "escrow" ? ahead(ESCROW_DAYS - publishedDays) : null,
      is_urgent: plan.kind === "urgent" || Boolean(deadlineDays && deadlineDays <= 10),
      deadline: deadlineDays ? dateOnly(deadlineDays) : null,
      payout_to: "institution",
      // No reminder or expiry emails for sample data.
      reminded_2w_at: completed ? ago(1) : null,
      reminded_3m_at: completed ? ago(1) : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Need "${plan.title}": ${error.message}`);
  const needId = need.id as string;

  // Verification checklist: all passed when verified; partial while checks are in progress.
  const checks = ["identity", "amount", "institution", "account", "story"] as const;
  const passedCount = verified ? 5 : plan.kind === "escrow" ? 2 : 1;
  await admin.from("verification_checks").insert(
    checks.map((c, i) => ({ need_id: needId, check: c, passed: i < passedCount, note: i < passedCount ? "Sample data" : null, admin_id: i < passedCount ? adminId : null })),
  );

  // Photos: cover (public bucket, shown as the round avatar) and gallery (private bucket).
  if (plan.photos.length) {
    const cover = await up.put("public-media", `${plan.ownerId}/sample-cover-${needId}.jpg`, plan.photos[0]);
    await admin.from("needs").update({ cover_photo_path: cover }).eq("id", needId);
    const rows = await Promise.all(
      plan.photos.slice(0, 5).map(async (file, i) => ({
        owner_id: plan.ownerId,
        need_id: needId,
        purpose: "need",
        storage_path: await up.put("media", `${plan.ownerId}/sample-${needId}-${i}.jpg`, file),
        caption: null,
        is_sensitive: plan.gallerySensitiveIndex === i,
        visibility: i === 2 ? "on_request" : "public",
        moderation: plan.kind === "submitted" ? "pending" : "approved",
        moderation_source: plan.kind === "submitted" ? null : "human",
        reviewed_by: plan.kind === "submitted" ? null : adminId,
        reviewed_at: plan.kind === "submitted" ? null : ago(publishedDays),
        sort: i,
      })),
    );
    const { error: mErr } = await admin.from("media").insert(rows);
    if (mErr) throw new Error(`Photos for "${plan.title}": ${mErr.message}`);
  }

  if (!live) return;

  // Gifts from the sample givers (and a few guests).
  const target = completed ? plan.amountKobo : Math.floor((plan.amountKobo * (plan.raised ?? 0.3)) / 100_000) * 100_000;
  let left = target;
  const gifts: Record<string, unknown>[] = [];
  let k = 0;
  while (left >= 100_000) {
    const g = givers[Math.floor(rand() * givers.length)];
    const share = k >= 4 ? left : Math.min(left, Math.max(100_000, Math.floor((left * (0.3 + rand() * 0.5)) / 100_000) * 100_000));
    const onTop = rand() > 0.3;
    const fee = platformFeeKobo(share);
    gifts.push({
      need_id: needId,
      giver_id: g.id,
      giver_email: g.email,
      giver_name: g.name,
      amount_kobo: share,
      fee_kobo: fee,
      fee_mode: onTop ? "on_top" : "deducted",
      tip_kobo: 0,
      is_anonymous: g.anon || rand() > 0.85,
      paystack_reference: `sample-${needId.slice(0, 8)}-${k}`,
      status: "success",
      channel: "sample",
      paid_at: ago(Math.max(publishedDays - k - 1, 0) + rand()),
    });
    left -= share;
    k++;
  }
  if (gifts.length) {
    const { error: gErr } = await admin.from("contributions").insert(gifts);
    if (gErr) throw new Error(`Gifts for "${plan.title}": ${gErr.message}`);
  }
  const raised = target - left;

  if (!completed) {
    // Fully given needs wait in "Payouts due" for an admin.
    const full = raised >= plan.amountKobo;
    await admin.from("needs").update(full ? { raised_kobo: raised, status: "funded", funded_at: ago(1) } : { raised_kobo: raised }).eq("id", needId);
    return;
  }

  // Finished needs: funded, paid to the payee, with a progress update and receipt.
  const { error: fErr } = await admin
    .from("needs")
    .update({ raised_kobo: raised, status: "completed", funded_at: ago(publishedDays - 10), paid_out_at: ago(publishedDays - 12), completed_at: ago(publishedDays - 12) })
    .eq("id", needId);
  if (fErr) throw new Error(`Completing "${plan.title}": ${fErr.message}`);
  const { error: pErr } = await admin.from("payouts").insert({
    need_id: needId,
    institution_id: plan.institutionId,
    amount_kobo: raised,
    method: "manual",
    reference: `sample-payout-${needId.slice(0, 8)}`,
    manual_reference: "Sample bank transfer",
    status: "success",
    initiated_by: adminId,
    completed_at: ago(publishedDays - 12),
  });
  if (pErr) throw new Error(`Payout for "${plan.title}": ${pErr.message}`);
  if (plan.update) {
    const photoPaths = await Promise.all(plan.update.photos.map((f, i) => up.put("public-media", `${plan.ownerId}/sample-update-${needId}-${i}.jpg`, f)));
    const receipt = await up.put("media", `${plan.ownerId}/receipts/sample-${needId}.jpg`, plan.update.receipt);
    const { error: uErr } = await admin.from("updates").insert({
      need_id: needId,
      author_id: plan.ownerId,
      body: plan.update.body,
      milestone: plan.update.milestone,
      photo_paths: photoPaths,
      receipt_paths: [receipt],
      receipts_public: true,
      status: "approved",
      approved_by: adminId,
      approved_at: ago(publishedDays - 14),
    });
    if (uErr) throw new Error(`Update for "${plan.title}": ${uErr.message}`);
  }
}

async function giverPool(users: Map<string, string>) {
  const pool = SAMPLE_GIVERS.map((g) => ({ id: users.get(g.handle) ?? null, name: g.name, email: sampleEmail(g.handle), anon: Boolean(g.anonymousSome) }));
  // A couple of guests who gave without an account.
  pool.push({ id: null, name: "Guest giver", email: sampleEmail("guest-1"), anon: true });
  pool.push({ id: null, name: "Kemi", email: sampleEmail("guest-2"), anon: false });
  return pool;
}

export async function loadSector(admin: Admin, origin: string, adminId: string, category: Category): Promise<StepResult> {
  const users = await sampleUsers(admin);
  if (!users.size) return { ok: false, message: "Create the sample accounts first." };
  const up = new Uploader(admin, origin);
  const givers = await giverPool(users);
  let added = 0;
  for (const [i, n] of SAMPLE_NEEDS[category].entries()) {
    const slug = `${n.handle}-sample`;
    const { data: exists } = await admin.from("needs").select("id").eq("slug", slug).maybeSingle();
    if (exists) continue;
    const ownerId = users.get(n.handle);
    if (!ownerId) return { ok: false, message: `Missing account for ${n.name}. Run the accounts step again.` };
    const rand = seeded(slug);
    const payeeVerified = n.kind === "verified" || n.kind === "urgent" || n.kind === "completed";
    const institutionId = await makeInstitution(admin, ownerId, adminId, { name: n.payee.name, type: n.payee.type, state: n.state, city: n.city, verified: payeeVerified }, rand);
    await makeNeed(admin, up, adminId, givers, {
      ownerId,
      slug,
      category,
      relationship: n.relationship,
      minor: Boolean(n.minor),
      name: n.name,
      state: n.state,
      city: n.city,
      title: n.title,
      story: n.story,
      words: n.words,
      amountKobo: n.amount * 100,
      kind: n.kind,
      raised: n.raised,
      deadlineDays: n.deadlineDays,
      photos: n.photos,
      institutionId,
      update: n.update,
      gallerySensitiveIndex: category === "healthcare" && i === 0 ? 1 : undefined,
    });
    added++;
  }
  return { ok: true, message: added ? `${added} needs added.` : "Already loaded." };
}

// ---------------------------------------------------------------------------
// Organisations
// ---------------------------------------------------------------------------

export async function loadOrganisations(admin: Admin, origin: string, adminId: string): Promise<StepResult> {
  const users = await sampleUsers(admin);
  const up = new Uploader(admin, origin);
  const givers = await giverPool(users);
  let added = 0;
  for (const o of SAMPLE_ORGS) {
    const slug = `${o.handle}-sample`;
    const { data: exists } = await admin.from("organisations").select("id").eq("slug", slug).maybeSingle();
    if (exists) continue;
    const ownerId = users.get(`org-${o.handle}`);
    if (!ownerId) return { ok: false, message: `Missing account for ${o.name}. Run the accounts step again.` };
    const rand = seeded(slug);
    const account = String(Math.floor(rand() * 9_000_000_000) + 1_000_000_000);
    const { data: org, error } = await admin
      .from("organisations")
      .insert({
        slug,
        owner_id: ownerId,
        name: o.name,
        org_type: o.type,
        tagline: o.tagline,
        about: o.about,
        impact: o.impact,
        people_supported: o.people,
        year_founded: o.founded,
        cac_number: `CAC/IT/SAMPLE-${account.slice(0, 5)}`,
        state: o.state,
        city: o.city,
        address: `${o.city}, ${o.state} State`,
        contact_name: o.contact,
        contact_phone: `0800 222 ${account.slice(-4)}`,
        contact_email: sampleEmail(`org-${o.handle}`),
        website: o.website ?? null,
        socials: o.socials,
        socials_visibility: "members",
        bank_code: "058",
        bank_name: "Guaranty Trust Bank",
        account_number: account,
        account_name: o.name.toUpperCase(),
        account_resolved_at: o.verified ? ago(30) : null,
        status: o.verified ? "verified" : "submitted",
        submitted_at: ago(o.verified ? 35 : 2),
        verified_at: o.verified ? ago(30) : null,
        verified_by: o.verified ? adminId : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`${o.name}: ${error.message}`);
    const orgId = org.id as string;

    const rows = await Promise.all(
      o.photos.map(async (p, i) => ({
        owner_id: ownerId,
        org_id: orgId,
        purpose: "org",
        storage_path: await up.put("media", `${ownerId}/sample-org-${orgId}-${i}.jpg`, p.file),
        caption: p.caption,
        is_sensitive: Boolean(p.sensitive),
        visibility: p.onRequest ? "on_request" : "public",
        moderation: o.verified ? "approved" : "pending",
        moderation_source: o.verified ? "human" : null,
        reviewed_by: o.verified ? adminId : null,
        reviewed_at: o.verified ? ago(29) : null,
        sort: i,
      })),
    );
    if (rows.length) {
      const { error: mErr } = await admin.from("media").insert(rows);
      if (mErr) throw new Error(`Photos for ${o.name}: ${mErr.message}`);
    }

    if (o.needs.length) {
      const institutionId = await makeInstitution(admin, ownerId, adminId, { name: o.name, type: "organisation", state: o.state, city: o.city, verified: o.verified, orgId }, rand);
      for (const [i, n] of o.needs.entries()) {
        await makeNeed(admin, up, adminId, givers, {
          ownerId,
          slug: `${o.handle}-${i + 1}-sample`,
          category: n.category,
          relationship: "organisation",
          minor: false,
          name: o.name.slice(0, 40),
          state: o.state,
          city: o.city,
          title: n.title,
          story: n.story,
          words: n.words,
          amountKobo: n.amount * 100,
          kind: n.kind,
          raised: n.raised,
          deadlineDays: n.deadlineDays,
          photos: n.photos,
          institutionId,
          orgId,
          update:
            n.kind === "completed"
              ? { body: "All the registrations are done and the girls are preparing for their papers. Thank you for standing with them. The school's receipt is attached.", milestone: "fees_paid", photos: ["pr-thanks", "ed-exam"], receipt: "rc-school" }
              : undefined,
        });
      }
    }
    added++;
  }
  return { ok: true, message: added ? `${added} organisations added.` : "Already loaded." };
}

// ---------------------------------------------------------------------------
// Extras: things that fill the review queues and the "requests" pages.
// ---------------------------------------------------------------------------

export async function loadExtras(admin: Admin, origin: string): Promise<StepResult> {
  const users = await sampleUsers(admin);
  const up = new Uploader(admin, origin);
  const giver = (h: string) => users.get(h)!;
  const notes: string[] = [];

  // Requests to see "on request" photos and socials.
  const { data: hope } = await admin.from("organisations").select("id, owner_id").eq("slug", "hope-home-sample").maybeSingle();
  const { data: funmi } = await admin.from("needs").select("id, created_by").eq("slug", "funmi-sample").maybeSingle();
  const reqs: Record<string, unknown>[] = [];
  if (hope) {
    reqs.push({ requester_id: giver("tunde"), owner_id: hope.owner_id, org_id: hope.id, message: "I'd love to see the health day photos before I give.", status: "pending" });
    reqs.push({ requester_id: giver("nkechi"), owner_id: hope.owner_id, org_id: hope.id, message: "Happy to help with the clinic day.", status: "approved", decided_at: ago(1) });
  }
  if (funmi) {
    reqs.push({ requester_id: giver("femi"), owner_id: funmi.created_by, need_id: funmi.id, message: "Would love to connect.", status: "pending" });
  }
  reqs.push({ requester_id: giver("sade"), owner_id: users.get("kunle"), message: "Hi Kunle, I studied engineering too. Happy to mentor.", status: "pending" });
  let added = 0;
  for (const r of reqs) {
    const { error } = await admin.from("media_requests").insert(r);
    if (error && !error.message.includes("duplicate")) throw new Error(`Request: ${error.message}`);
    if (!error) added++;
  }
  if (added) notes.push(`${added} connection requests`);

  // A progress update waiting for review, on a live need.
  const { data: adaeze } = await admin.from("needs").select("id, created_by").eq("slug", "adaeze-sample").maybeSingle();
  if (adaeze) {
    const { count } = await admin.from("updates").select("id", { count: "exact", head: true }).eq("need_id", adaeze.id);
    if (!count) {
      const photo = await up.put("public-media", `${adaeze.created_by}/sample-update-${adaeze.id}-0.jpg`, "ed-books");
      await admin.from("updates").insert({ need_id: adaeze.id, author_id: adaeze.created_by, body: "Adaeze got her new chemistry and maths textbooks this week and is already ahead on her reading. Thank you to everyone who has given so far.", milestone: "progress", photo_paths: [photo], status: "pending" });
      notes.push("1 update to review");
    }
  }

  // A photo waiting for moderation on a live need.
  const { data: kunle } = await admin.from("needs").select("id, created_by").eq("slug", "kunle-sample").maybeSingle();
  if (kunle) {
    const { count } = await admin.from("media").select("id", { count: "exact", head: true }).eq("need_id", kunle.id).eq("moderation", "pending");
    if (!count) {
      const path = await up.put("media", `${kunle.created_by}/sample-${kunle.id}-pending.jpg`, "ed-classroom");
      await admin.from("media").insert({ owner_id: kunle.created_by, need_id: kunle.id, purpose: "need", storage_path: path, caption: "My study group", visibility: "public", moderation: "pending", sort: 9 });
      notes.push("1 photo to review");
    }
  }

  // Saved needs for a giver.
  const { data: live } = await admin.from("needs").select("id").like("slug", "%-sample").eq("status", "live").limit(4);
  for (const n of live ?? []) await admin.from("saved_needs").upsert({ user_id: giver("tunde"), need_id: n.id }, { onConflict: "user_id,need_id", ignoreDuplicates: true });

  return { ok: true, message: notes.join(", ") || "Already loaded." };
}

// ---------------------------------------------------------------------------
// Remove everything
// ---------------------------------------------------------------------------

export async function removeSamples(admin: Admin): Promise<StepResult> {
  const users = await sampleUsers(admin);
  const ids = [...users.values()];
  const { data: needs } = await admin.from("needs").select("id, cover_photo_path").or(`slug.like.%-sample,created_by.in.(${ids.join(",") || "00000000-0000-0000-0000-000000000000"})`);
  const needIds = (needs ?? []).map((n) => n.id as string);

  // Files first, while we can still find them.
  const mediaPaths: string[] = [];
  const publicPaths: string[] = (needs ?? []).map((n) => n.cover_photo_path as string | null).filter((p): p is string => Boolean(p));
  if (ids.length) {
    const { data: media } = await admin.from("media").select("storage_path").in("owner_id", ids);
    mediaPaths.push(...(media ?? []).map((m) => m.storage_path as string));
  }
  if (needIds.length) {
    const { data: ups } = await admin.from("updates").select("photo_paths, receipt_paths").in("need_id", needIds);
    for (const u of ups ?? []) {
      publicPaths.push(...((u.photo_paths as string[]) ?? []));
      mediaPaths.push(...((u.receipt_paths as string[]) ?? []));
    }
  }
  for (let i = 0; i < mediaPaths.length; i += 100) await admin.storage.from("media").remove(mediaPaths.slice(i, i + 100));
  for (let i = 0; i < publicPaths.length; i += 100) await admin.storage.from("public-media").remove(publicPaths.slice(i, i + 100));

  if (needIds.length) {
    await admin.from("payouts").delete().in("need_id", needIds);
    await admin.from("contributions").update({ redirected_to: null }).in("redirected_to", needIds);
    await admin.from("contributions").delete().in("need_id", needIds);
    const { error } = await admin.from("needs").delete().in("id", needIds);
    if (error) return { ok: false, message: `Couldn't remove needs: ${error.message}` };
  }
  await admin.from("contributions").delete().ilike("giver_email", `%${SAMPLE_EMAIL_SUFFIX}`).like("paystack_reference", "sample-%");
  if (ids.length) {
    await admin.from("institutions").delete().in("created_by", ids);
    await admin.from("organisations").delete().in("owner_id", ids);
    for (const id of ids) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return { ok: false, message: `Couldn't remove an account: ${error.message}` };
    }
  }
  return { ok: true, message: `Removed ${ids.length} accounts, ${needIds.length} needs and ${mediaPaths.length + publicPaths.length} photos.` };
}

export async function sampleSummary(admin: Admin) {
  const users = await sampleUsers(admin);
  const [{ count: needs }, { count: orgs }] = await Promise.all([
    admin.from("needs").select("id", { count: "exact", head: true }).like("slug", "%-sample"),
    admin.from("organisations").select("id", { count: "exact", head: true }).like("slug", "%-sample"),
  ]);
  return { accounts: users.size, needs: needs ?? 0, orgs: orgs ?? 0 };
}
