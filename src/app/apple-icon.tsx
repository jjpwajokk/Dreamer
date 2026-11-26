import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iPhone, and a PNG fallback for apps that ignore SVG icons. */
export default function AppleIcon() {
  const s = 180 / 64;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#0f9a72,#065a43)", display: "flex", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 17 * s, top: 27 * s, width: 30 * s, height: 15 * s, overflow: "hidden", display: "flex" }}>
          <div style={{ width: 30 * s, height: 30 * s, borderRadius: 999, background: "linear-gradient(180deg,#fde68a,#f59e0b)" }} />
        </div>
        <div style={{ position: "absolute", left: 12 * s, top: 40.25 * s, width: 40 * s, height: 3.5 * s, borderRadius: 6, background: "#ecfdf5" }} />
        <div style={{ position: "absolute", left: 20 * s, top: 47.25 * s, width: 24 * s, height: 3.5 * s, borderRadius: 6, background: "#ecfdf58c" }} />
        <div style={{ position: "absolute", left: 30.25 * s, top: 13 * s, width: 3.5 * s, height: 6 * s, borderRadius: 6, background: "#fde68a" }} />
      </div>
    ),
    size,
  );
}
