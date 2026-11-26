"use server";

import { createClient } from "@/lib/supabase/server";
import { firstError, reportSchema } from "@/lib/validation";

export type ReportState = { ok?: boolean; error?: string } | undefined;

export async function reportNeed(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const parsed = reportSchema.safeParse({
    needId: formData.get("needId"),
    reason: formData.get("reason"),
    email: formData.get("email") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("reports").insert({
    need_id: parsed.data.needId,
    reason: parsed.data.reason,
    reporter_id: user?.id ?? null,
    reporter_email: parsed.data.email || user?.email || null,
    status: "open",
  });
  if (error) return { error: "We couldn't send that. Please try again." };
  return { ok: true };
}
