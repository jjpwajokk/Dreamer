"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { CATEGORIES, type Category } from "@/lib/sectors";
import { LOAD_STEPS, loadAccounts, loadExtras, loadOrganisations, loadSector, removeSamples, type LoadStep, type StepResult } from "@/lib/samples/load";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Runs one step of the sample-data loader. The page calls the steps in order. */
export async function runSampleStep(step: LoadStep, password?: string): Promise<StepResult> {
  const session = await assertAdmin();
  if (!LOAD_STEPS.includes(step)) return { ok: false, message: "Unknown step." };
  const pw = password?.trim() ? password.trim() : null;
  if (pw && pw.length < 8) return { ok: false, message: "Use a password of at least 8 characters." };
  const admin = createAdminClient();
  try {
    let result: StepResult;
    if (step === "accounts") result = await loadAccounts(admin, session.userId, pw);
    else if ((CATEGORIES as readonly string[]).includes(step)) result = await loadSector(admin, await origin(), session.userId, step as Category);
    else if (step === "organisations") result = await loadOrganisations(admin, await origin(), session.userId);
    else result = await loadExtras(admin, await origin());
    if (step === "extras" && result.ok) {
      await logAudit({ actorId: session.userId, action: "samples.loaded", entity: "samples", after: { password_set: Boolean(pw) } });
      revalidatePath("/", "layout");
    }
    return result;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setSamplePassword(password: string): Promise<StepResult> {
  const session = await assertAdmin();
  if (password.trim().length < 8) return { ok: false, message: "Use a password of at least 8 characters." };
  const result = await loadAccounts(createAdminClient(), session.userId, password.trim());
  if (result.ok) await logAudit({ actorId: session.userId, action: "samples.password_set", entity: "samples" });
  return result.ok ? { ok: true, message: "Password set on every sample account." } : result;
}

export async function removeSampleData(confirm: string): Promise<StepResult> {
  const session = await assertAdmin();
  if (confirm.trim().toUpperCase() !== "REMOVE") return { ok: false, message: 'Type REMOVE to confirm.' };
  try {
    const result = await removeSamples(createAdminClient());
    await logAudit({ actorId: session.userId, action: "samples.removed", entity: "samples", after: { message: result.message } });
    revalidatePath("/", "layout");
    return result;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Something went wrong." };
  }
}
