import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { afterSignIn } from "@/lib/after-sign-in";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const rawNext = url.searchParams.get("next") ?? "/welcome";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/welcome";

  const supabase = await createClient();
  let userId: string | undefined;
  let email: string | undefined;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      userId = data.user?.id;
      email = data.user?.email;
    }
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      userId = data.user?.id;
      email = data.user?.email;
    }
  }

  if (!userId) return NextResponse.redirect(new URL(`/login?error=link&next=${encodeURIComponent(next)}`, url.origin));
  if (await afterSignIn(userId, email)) return NextResponse.redirect(new URL("/account-closed", url.origin));
  return NextResponse.redirect(new URL(next, url.origin));
}
