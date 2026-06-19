import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";
import { RadarBackground } from "../components/RadarBackground";
import { EventLogCard } from "../components/EventLogCard";

// 0:42–0:52 | 10 seconds = 300 frames — COD node converts to Prepaid node on a conversion funnel
export const PrepaidOfferScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const codOpacity = interpolate(frame, [10, 28], [0, 1], { extrapolateRight: "clamp" });

  const arrowProgress = interpolate(frame, [50, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const prepaidEnter = spring({ frame: frame - 95, fps, config: { damping: 12, stiffness: 140 } });
  const prepaidOpacity = interpolate(prepaidEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const prepaidScale = interpolate(prepaidEnter, [0, 1], [0.7, 1], { extrapolateRight: "clamp" });

  const badgeEnter = spring({ frame: frame - 130, fps, config: { damping: 10, stiffness: 160 } });
  const badgeScale = interpolate(badgeEnter, [0, 1], [0, 1.04], { extrapolateRight: "clamp" });
  const badgeOpacity = interpolate(badgeEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const logEnter = spring({ frame: frame - 175, fps, config: { damping: 16, stiffness: 100 } });
  const logOpacity = interpolate(logEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const logY = interpolate(logEnter, [0, 1], [24, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#06070a", alignItems: "center" }}>
      <RadarBackground tint="#3b82f6" />

      <div style={{ position: "absolute", top: 100, display: "flex", justifyContent: "center", width: "100%", opacity: timerOpacity }}>
        <div
          style={{
            background: "rgba(0,0,0,0.82)",
            border: "1.5px solid #3b82f6",
            borderRadius: 60,
            padding: "14px 36px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#3b82f6" }} />
          <span style={{ fontFamily: "sans-serif", fontSize: 24, fontWeight: 800, color: "#3b82f6", letterSpacing: "1.5px" }}>
            2 HOURS TO DECIDE
          </span>
        </div>
      </div>

      {/* Conversion funnel: COD node -> arrow -> Prepaid node */}
      <div style={{ position: "absolute", top: 480, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
        <div
          style={{
            opacity: codOpacity,
            background: "#1c1c1c",
            border: "2px solid #555",
            borderRadius: 20,
            padding: "30px 26px",
            textAlign: "center",
            width: 260,
          }}
        >
          <div style={{ fontSize: 34 }}>💰</div>
          <div style={{ fontFamily: "sans-serif", fontSize: 22, color: "#999", fontWeight: 700, marginTop: 10 }}>COD</div>
          <div style={{ fontFamily: "sans-serif", fontSize: 38, color: "#fff", fontWeight: 900, marginTop: 4 }}>₹3,200</div>
        </div>

        <svg width={110} height={40} viewBox="0 0 110 40" style={{ flexShrink: 0 }}>
          <line x1={5} y1={20} x2={5 + arrowProgress * 90} y2={20} stroke="#3b82f6" strokeWidth={4} strokeLinecap="round" />
          {arrowProgress > 0.92 && (
            <path d="M95 12 L105 20 L95 28 Z" fill="#3b82f6" />
          )}
        </svg>

        <div
          style={{
            opacity: prepaidOpacity,
            transform: `scale(${prepaidScale})`,
            background: "#0c1f14",
            border: "2px solid #25D366",
            borderRadius: 20,
            padding: "30px 26px",
            textAlign: "center",
            width: 260,
            boxShadow: "0 0 40px rgba(37,211,102,0.25)",
          }}
        >
          <div style={{ fontSize: 34 }}>💳</div>
          <div style={{ fontFamily: "sans-serif", fontSize: 22, color: "#25D366", fontWeight: 700, marginTop: 10 }}>PREPAID</div>
          <div style={{ fontFamily: "sans-serif", fontSize: 38, color: "#fff", fontWeight: 900, marginTop: 4 }}>₹3,150</div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 680,
          opacity: badgeOpacity,
          transform: `scale(${badgeScale})`,
          background: "#3b82f6",
          borderRadius: 24,
          padding: "20px 26px",
          textAlign: "center",
          boxShadow: "0 0 60px rgba(59,130,246,0.5)",
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1 }}>₹50 SAVED</div>
      </div>

      <div style={{ position: "absolute", left: 44, right: 44, bottom: 460 }}>
        <EventLogCard
          direction="out"
          channel="Razorpay"
          accent="#3b82f6"
          time="now"
          opacity={logOpacity}
          y={logY}
          text="Secure payment link sent — pay online and save ₹50. Offer expires in 2 hours. No obligation."
        />
      </div>

      <Caption
        text="Then immediately — we offer to convert. Pay online, save ₹50. Two hours to decide. No obligation."
        delay={15}
        accent="#3b82f6"
      />
    </AbsoluteFill>
  );
};
