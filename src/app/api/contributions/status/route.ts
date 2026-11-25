import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Read-only status for the thank-you page. The reference is a random secret. */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? "";
  if (!/^dr-[a-z0-9]+-[a-f0-9]{12}$/.test(reference)) return NextResponse.json({ error: "bad reference" }, { status: 400 });
  const admin = createAdminClient();
  const { data } = await admin
    .from("contributions")
    .select("status, amount_kobo, tip_kobo, giver_id, need:needs(slug, display_name, status)")
    .eq("paystack_reference", reference)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  const need = Array.isArray(data.need) ? data.need[0] : data.need;
  return NextResponse.json(
    {
      status: data.status,
      amount_kobo: data.amount_kobo,
      tip_kobo: data.tip_kobo,
      guest: !data.giver_id,
      need: need ? { slug: need.slug, display_name: need.display_name, status: need.status } : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
