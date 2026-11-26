import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Dreamer: give to real, verified needs";

/** The link preview image for the whole site (WhatsApp, X, LinkedIn, iMessage...). */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#ecfdf5",
          backgroundColor: "#04100d",
          backgroundImage: "linear-gradient(135deg, #04100d 0%, #052a20 55%, #0b6b4f 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Mark size={104} />
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2 }}>Dreamer</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, maxWidth: 980 }}>Back real, verified dreams.</div>
          <div style={{ fontSize: 34, color: "#a7f3d0", maxWidth: 980, lineHeight: 1.3 }}>
            School fees, health, rent, small businesses and more, across Nigeria. Gifts are held in escrow until final checks, then paid directly to the payee.
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 26, color: "#d1fae5" }}>
          {["Verified needs", "Held in escrow", "Paid directly to the payee"].map((t) => (
            <div key={t} style={{ display: "flex", border: "2px solid #10b98155", borderRadius: 999, padding: "10px 22px" }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

function Mark({ size }: { size: number }) {
  const s = size / 64;
  return (
    <div style={{ width: size, height: size, borderRadius: 18 * s, background: "linear-gradient(135deg,#0f9a72,#065a43)", display: "flex", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 17 * s, top: 27 * s, width: 30 * s, height: 15 * s, overflow: "hidden", display: "flex" }}>
        <div style={{ width: 30 * s, height: 30 * s, borderRadius: 999, background: "linear-gradient(180deg,#fde68a,#f59e0b)" }} />
      </div>
      <div style={{ position: "absolute", left: 12 * s, top: 40.25 * s, width: 40 * s, height: 3.5 * s, borderRadius: 4, background: "#ecfdf5" }} />
      <div style={{ position: "absolute", left: 20 * s, top: 47.25 * s, width: 24 * s, height: 3.5 * s, borderRadius: 4, background: "#ecfdf58c" }} />
      <div style={{ position: "absolute", left: 30.25 * s, top: 13 * s, width: 3.5 * s, height: 6 * s, borderRadius: 4, background: "#fde68a" }} />
    </div>
  );
}
