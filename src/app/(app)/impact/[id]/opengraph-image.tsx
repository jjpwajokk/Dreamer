import { ImageResponse } from "next/og";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImpact } from "@/lib/impact";
import { formatNaira } from "@/lib/money";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Dreamer impact card";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let line = "Giving to verified needs in Nigeria";
  let sub = "";
  if (z.string().uuid().safeParse(id).success && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data: profile } = await createAdminClient().from("profiles").select("user_id, display_name").eq("id", id).maybeSingle();
    if (profile) {
      const impact = await getImpact(profile.user_id);
      line = `${profile.display_name || "A Dreamer"} helped ${impact.needs.length} ${impact.needs.length === 1 ? "person" : "people"}`;
      sub = `${formatNaira(impact.totalKobo)} given, paid straight to schools and hospitals`;
    }
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#0e5e4e,#1f9d7f)", color: "white", fontFamily: "Georgia, serif" }}>
        <div style={{ fontSize: 30, letterSpacing: 6, opacity: 0.8, display: "flex" }}>DREAMER · IMPACT CARD</div>
        <div style={{ fontSize: 76, marginTop: 30, lineHeight: 1.1, display: "flex" }}>{line}</div>
        <div style={{ fontSize: 34, marginTop: 24, opacity: 0.9, display: "flex" }}>{sub}</div>
      </div>
    ),
    size,
  );
}
