import { ImageResponse } from "next/og";
import { createAnonClient } from "@/lib/supabase/anon";
import { supabaseConfigured } from "@/lib/config";
import { formatNaira, progressPercent } from "@/lib/money";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A verified need on Dreamer";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const need = supabaseConfigured()
    ? (await createAnonClient().from("public_needs").select("display_name, state, my_words, title, amount_kobo, raised_kobo, verified_at").eq("slug", slug).maybeSingle()).data
    : null;
  const pct = need ? progressPercent(need.amount_kobo, need.raised_kobo) : 0;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(180deg,#fdf1dc,#fbf7f0)", padding: 64, fontFamily: "Georgia, serif", color: "#1c1917" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 700 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#0e5e4e", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
              <div style={{ width: 30, height: 30, borderRadius: 30, background: "#f2a93b", marginBottom: -8 }} />
            </div>
            Dreamer
          </div>
          {need?.verified_at ? (
            <div style={{ display: "flex", background: "#e3f1ec", color: "#0e5e4e", borderRadius: 999, padding: "10px 24px", fontSize: 28, fontWeight: 700 }}>Verified</div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 62, lineHeight: 1.15, display: "flex" }}>“{need?.my_words ?? "Help a real person with a real, verified need."}”</div>
          <div style={{ fontSize: 32, color: "#6b6259", marginTop: 24, display: "flex" }}>
            {need ? `${need.display_name}, ${need.state} · ${need.title}` : "Give to verified needs in Nigeria"}
          </div>
        </div>
        {need ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 34, fontWeight: 700 }}>
              <span>{formatNaira(need.raised_kobo)} raised</span>
              <span style={{ color: "#6b6259", fontWeight: 400 }}>of {formatNaira(need.amount_kobo)}</span>
            </div>
            <div style={{ display: "flex", height: 20, borderRadius: 20, background: "rgba(0,0,0,0.1)" }}>
              <div style={{ width: `${pct}%`, height: 20, borderRadius: 20, background: "#0e5e4e" }} />
            </div>
          </div>
        ) : <div />}
      </div>
    ),
    size,
  );
}
