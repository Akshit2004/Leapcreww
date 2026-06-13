import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "LeapCrew Revenue Leak Calculator — how much is your D2C brand leaking?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          backgroundColor: "#1D211F",
          padding: "64px 72px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 6,
              color: "#D05E3C",
              textTransform: "uppercase",
              fontFamily: "monospace",
              fontWeight: 700,
            }}
          >
            Free Tool · 20 Seconds
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#FAF7F2",
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            LEAPCREW
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              lineHeight: 1.1,
              color: "#FAF7F2",
              fontWeight: 300,
              maxWidth: 980,
            }}
          >
            How much revenue is your brand leaking every month?
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "rgba(250,247,242,0.6)",
            }}
          >
            Abandoned carts + COD returns, in rupees. Drag three sliders.
          </div>
        </div>

        {/* bottom strip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div
            style={{
              display: "flex",
              gap: 28,
              fontSize: 18,
              letterSpacing: 4,
              color: "rgba(250,247,242,0.45)",
              textTransform: "uppercase",
              fontFamily: "monospace",
            }}
          >
            <span>[ Cart Recovery ]</span>
            <span>[ COD Confirm ]</span>
            <span>[ NDR Rescue ]</span>
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: "#D05E3C",
              color: "#FFFFFF",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              padding: "16px 28px",
              fontFamily: "monospace",
            }}
          >
            Calculate yours →
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
