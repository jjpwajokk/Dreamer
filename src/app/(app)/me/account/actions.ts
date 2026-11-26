"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NIGERIAN_STATES } from "@/lib/format";

const schema = z.object({
  display_name: z.string().trim().min(1, "Enter a name").max(40),
  full_name: z.string().trim().max(100).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  state: z.enum(NIGERIAN_STATES).optional().or(z.literal("")),
});

export async function saveProfile(_prev: { ok?: boolean; error?: string } | undefined, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      full_name: parsed.data.full_name || null,
      phone: parsed.data.phone || null,
      state: parsed.data.state || null,
    })
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/me");
  return { ok: true };
}
