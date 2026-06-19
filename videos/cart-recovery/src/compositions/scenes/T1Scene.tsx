import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";

// Full-screen WhatsApp UI — no phone frame, fully readable at canvas scale
export const T1Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const notifEnter = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 120 } });
  const notifY = interpolate(notifEnter, [0, 1], [-100, 0], { extrapolateRight: "clamp" });
  const notifOpacity = interpolate(notifEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const headerEnter = spring({ frame: frame - 18, fps, config: { damping: 16, stiffness: 90 } });
  const headerOpacity = interpolate(headerEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const msg1Enter = spring({ frame: frame - 45, fps, config: { damping: 16, stiffness: 100 } });
  const msg1Opacity = interpolate(msg1Enter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const msg1Y = interpolate(msg1Enter, [0, 1], [30, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#ECE5DD", flexDirection: "column" }}>
      {/* Timer badge pinned at very top */}
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
            border: "1.5px solid #25D366",
            borderRadius: 60,
            padding: "14px 40px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#25D366" }} />
          <span style={{ fontFamily: "sans-serif", fontSize: 26, fontWeight: 800, color: "#25D366", letterSpacing: "1.5px" }}>
            30 MIN AFTER ABANDONMENT
          </span>
        </div>
      </div>

      {/* Lock-screen notification banner */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 40,
          right: 40,
          zIndex: 30,
          opacity: notifOpacity,
          transform: `translateY(${notifY}px)`,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(20px)",
          borderRadius: 24,
          padding: "24px 28px",
          boxShadow: "0 20px 70px rgba(0,0,0,0.18)",
          display: "flex",
          gap: 20,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "#25D366",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            flexShrink: 0,
          }}
        >
          💬
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "sans-serif", fontSize: 24, fontWeight: 800, color: "#111" }}>
            WhatsApp · LeapCreww Store
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 22, color: "#555", marginTop: 5, lineHeight: 1.4 }}>
            Hey Priya, you left something behind 👀 Tap to complete your order...
          </div>
        </div>
        <div style={{ fontFamily: "sans-serif", fontSize: 20, color: "#aaa" }}>now</div>
      </div>

      {/* WhatsApp chat header */}
      <div
        style={{
          background: "#075E54",
          paddingTop: 320,
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
          <div style={{ fontFamily: "sans-serif", fontSize: 34, fontWeight: 800, color: "#fff" }}>
            LeapCreww Store
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 24, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
            online now
          </div>
        </div>
      </div>

      {/* Chat body */}
      <div style={{ flex: 1, padding: "32px 30px 220px", background: "#ECE5DD", overflow: "hidden" }}>
        {/* Message bubble */}
        <div
          style={{
            opacity: msg1Opacity,
            transform: `translateY(${msg1Y}px)`,
            maxWidth: "82%",
            marginTop: 10,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "4px 28px 28px 28px",
              padding: "26px 30px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
            }}
          >
            <div style={{ fontFamily: "sans-serif", fontSize: 34, color: "#111", lineHeight: 1.5 }}>
              Hey Priya, you left something behind 👀
            </div>
            <div style={{ fontFamily: "sans-serif", fontSize: 34, color: "#111", lineHeight: 1.5, marginTop: 12 }}>
              Your cart is still saved — tap here to complete your order:
            </div>

            {/* CTA link */}
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
              <div>
                <div style={{ fontFamily: "sans-serif", fontSize: 22, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
                  Complete order
                </div>
                <div style={{ fontFamily: "sans-serif", fontSize: 28, color: "#fff", fontWeight: 800, marginTop: 2 }}>
                  Complete My Order →
                </div>
              </div>
              <div style={{ fontSize: 32 }}>🛒</div>
            </div>

            <div style={{ textAlign: "right", fontFamily: "sans-serif", fontSize: 22, color: "#aaa", marginTop: 10 }}>
              ✓✓ delivered
            </div>
          </div>
        </div>
      </div>

      <Caption text="30 minutes after abandonment — a gentle nudge. Direct link back to their cart. No pressure." delay={8} />
    </AbsoluteFill>
  );
};
