import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";

// Full-screen WhatsApp — T3: 24 hours + discount
export const T3Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const headerOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const msg1Opacity = interpolate(frame, [5, 22], [0, 1], { extrapolateRight: "clamp" });

  const msg2Enter = spring({ frame: frame - 35, fps, config: { damping: 16, stiffness: 100 } });
  const msg2Opacity = interpolate(msg2Enter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const msg2Y = interpolate(msg2Enter, [0, 1], [30, 0], { extrapolateRight: "clamp" });

  const discountEnter = spring({ frame: frame - 80, fps, config: { damping: 10, stiffness: 160 } });
  const discountScale = interpolate(discountEnter, [0, 1], [0, 1.04], { extrapolateRight: "clamp" });
  const discountOpacity = interpolate(discountEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#ECE5DD", flexDirection: "column" }}>
      {/* Timer badge */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 20,
          opacity: timerOpacity,
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.82)",
            border: "1.5px solid #ef4444",
            borderRadius: 60,
            padding: "14px 40px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#ef4444" }} />
          <span style={{ fontFamily: "sans-serif", fontSize: 26, fontWeight: 800, color: "#ef4444", letterSpacing: "1.5px" }}>
            24 HOURS · LAST CHANCE
          </span>
        </div>
      </div>

      {/* WhatsApp header */}
      <div
        style={{
          background: "#075E54",
          paddingTop: 130,
          paddingBottom: 24,
          paddingLeft: 36,
          paddingRight: 36,
          display: "flex",
          alignItems: "center",
          gap: 20,
          opacity: headerOpacity,
        }}
      >
        <div style={{ fontSize: 36, color: "#aaa" }}>←</div>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#25D366",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            flexShrink: 0,
          }}
        >
          🛍️
        </div>
        <div>
          <div style={{ fontFamily: "sans-serif", fontSize: 34, fontWeight: 800, color: "#fff" }}>LeapCreww Store</div>
          <div style={{ fontFamily: "sans-serif", fontSize: 24, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>online now</div>
        </div>
      </div>

      {/* Chat body */}
      <div style={{ flex: 1, padding: "24px 30px 220px", background: "#ECE5DD", overflow: "hidden", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Previous — faded */}
        <div style={{ opacity: msg1Opacity * 0.28, maxWidth: "82%" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: "4px 28px 28px 28px",
              padding: "22px 28px",
            }}
          >
            <div style={{ fontFamily: "sans-serif", fontSize: 30, color: "#111", lineHeight: 1.5 }}>
              Priya, just checking in — your items are going fast!...
            </div>
            <div style={{ textAlign: "right", fontFamily: "sans-serif", fontSize: 20, color: "#aaa", marginTop: 8 }}>
              21h ago · ✓✓
            </div>
          </div>
        </div>

        {/* Discount message */}
        <div style={{ opacity: msg2Opacity, transform: `translateY(${msg2Y}px)`, maxWidth: "82%" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: "4px 28px 28px 28px",
              padding: "26px 30px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.10)",
            }}
          >
            <div style={{ fontFamily: "sans-serif", fontSize: 34, color: "#111", lineHeight: 1.5 }}>
              Last chance, Priya! 🎁
            </div>
            <div style={{ fontFamily: "sans-serif", fontSize: 34, color: "#111", lineHeight: 1.5, marginTop: 10 }}>
              Here's something from us — use{" "}
              <span
                style={{
                  background: "#fef9c3",
                  color: "#92400e",
                  fontWeight: 900,
                  padding: "2px 10px",
                  borderRadius: 6,
                  fontSize: 36,
                }}
              >
                SAVE10
              </span>{" "}
              at checkout.
            </div>

            {/* Discount CTA */}
            <div
              style={{
                marginTop: 24,
                background: "#ef4444",
                borderRadius: 14,
                padding: "22px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontFamily: "sans-serif", fontSize: 22, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                  Limited time offer
                </div>
                <div style={{ fontFamily: "sans-serif", fontSize: 32, color: "#fff", fontWeight: 900, marginTop: 2 }}>
                  SAVE10 — Get 10% Off →
                </div>
              </div>
              <div style={{ fontSize: 40 }}>🎁</div>
            </div>

            <div style={{ textAlign: "right", fontFamily: "sans-serif", fontSize: 22, color: "#aaa", marginTop: 10 }}>
              ✓✓ delivered
            </div>
          </div>
        </div>
      </div>

      {/* Floating 10% badge */}
      <div
        style={{
          position: "absolute",
          top: 420,
          right: 36,
          zIndex: 30,
          opacity: discountOpacity,
          transform: `scale(${discountScale})`,
          background: "#ef4444",
          borderRadius: 24,
          padding: "28px 32px",
          textAlign: "center",
          boxShadow: "0 0 60px rgba(239,68,68,0.55)",
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontSize: 60, fontWeight: 900, color: "#fff", lineHeight: 1 }}>10%</div>
        <div style={{ fontFamily: "sans-serif", fontSize: 26, color: "rgba(255,255,255,0.9)", fontWeight: 700, marginTop: 4 }}>OFF</div>
      </div>

      <Caption text="Still no order? Day one — we drop a real discount. Merchant-configured. Works at checkout." delay={10} />
    </AbsoluteFill>
  );
};
