import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";

// Full-screen WhatsApp — T2: 3 hours later
export const T2Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const headerOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  const msg1Opacity = interpolate(frame, [5, 22], [0, 1], { extrapolateRight: "clamp" });

  const msg2Enter = spring({ frame: frame - 40, fps, config: { damping: 16, stiffness: 100 } });
  const msg2Opacity = interpolate(msg2Enter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const msg2Y = interpolate(msg2Enter, [0, 1], [30, 0], { extrapolateRight: "clamp" });

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
            border: "1.5px solid #f59e0b",
            borderRadius: 60,
            padding: "14px 40px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#f59e0b" }} />
          <span style={{ fontFamily: "sans-serif", fontSize: 26, fontWeight: 800, color: "#f59e0b", letterSpacing: "1.5px" }}>
            3 HOURS LATER · NO REPLY
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
        {/* Previous message — faded */}
        <div style={{ opacity: msg1Opacity * 0.30, maxWidth: "82%" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: "4px 28px 28px 28px",
              padding: "22px 28px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontFamily: "sans-serif", fontSize: 30, color: "#111", lineHeight: 1.5 }}>
              Hey Priya, you left something behind 👀 Your cart is still saved — tap here...
            </div>
            <div style={{ textAlign: "right", fontFamily: "sans-serif", fontSize: 20, color: "#aaa", marginTop: 8 }}>
              3h ago · ✓✓
            </div>
          </div>
        </div>

        {/* New message */}
        <div style={{ opacity: msg2Opacity, transform: `translateY(${msg2Y}px)`, maxWidth: "82%" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: "4px 28px 28px 28px",
              padding: "26px 30px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
            }}
          >
            <div style={{ fontFamily: "sans-serif", fontSize: 34, color: "#111", lineHeight: 1.5 }}>
              Priya, just checking in — your items are going fast! 🔥
            </div>
            <div style={{ fontFamily: "sans-serif", fontSize: 34, color: "#111", lineHeight: 1.5, marginTop: 12 }}>
              Your cart is reserved for a little while longer 🛒
            </div>

            <div
              style={{
                marginTop: 20,
                background: "#25D366",
                borderRadius: 14,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontFamily: "sans-serif", fontSize: 28, color: "#fff", fontWeight: 800 }}>
                View My Cart →
              </div>
              <div style={{ fontSize: 32 }}>🛍️</div>
            </div>

            <div style={{ textAlign: "right", fontFamily: "sans-serif", fontSize: 22, color: "#aaa", marginTop: 10 }}>
              ✓✓ delivered
            </div>
          </div>
        </div>
      </div>

      <Caption text="No reply? Three hours later — we remind them. Still their exact cart. Still their link." delay={10} />
    </AbsoluteFill>
  );
};
