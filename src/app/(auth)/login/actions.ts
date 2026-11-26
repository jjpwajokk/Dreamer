"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { afterSignIn } from "@/lib/after-sign-in";
import { siteUrl } from "@/lib/config";
import { RATE_LIMITED, allow } from "@/lib/rate-limit";

export type LoginState = { error?: string; sent?: string } | undefined;

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/welcome";
}

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  if (!(await allow("login-link", 5, 600))) return { error: RATE_LIMITED };
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
  });
  if (error) return { error: error.message };
  return { sent: parsed.data };
}

export async function passwordAuth(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0]!.message };
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  if (password.length < 8) return { error: "Passwords have at least 8 characters." };
  if (!(await allow("login-password", 10, 600))) return { error: RATE_LIMITED };
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();

  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({
      email: email.data,
      password,
      options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) return { error: error.message };
    if (!data.session) return { sent: email.data };
    await afterSignIn(data.user!.id, data.user!.email, name);
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.data, password });
    if (error) return { error: error.message === "Invalid login credentials" ? "That email and password don't match." : error.message };
    await afterSignIn(data.user.id, data.user.email);
  }
  redirect(next);
}
