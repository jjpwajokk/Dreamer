"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const swipeSchema = z.object({ needId: z.string().uuid(), action: z.enum(["pass", "give", "save", "open"]) });

export async function recordSwipe(needId: string, action: "pass" | "give" | "save" | "open") {
  const parsed = swipeSchema.safeParse({ needId, action });
  if (!parsed.success || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const anonId = (await cookies()).get("dreamer_anon")?.value ?? null;
  if (!user && !anonId) return;
  await createAdminClient()
    .from("swipes")
    .insert({ need_id: parsed.data.needId, action: parsed.data.action, user_id: user?.id ?? null, anon_id: user ? null : anonId });
}

export async function toggleSave(needId: string): Promise<{ saved?: boolean; needsLogin?: boolean }> {
  if (!z.string().uuid().safeParse(needId).success) return {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { needsLogin: true };
  const { data: existing } = await supabase.from("saved_needs").select("id").eq("need_id", needId).maybeSingle();
  if (existing) {
    await supabase.from("saved_needs").delete().eq("id", existing.id);
    return { saved: false };
  }
  await supabase.from("saved_needs").insert({ need_id: needId, user_id: user.id });
  await recordSwipe(needId, "save");
  return { saved: true };
}
