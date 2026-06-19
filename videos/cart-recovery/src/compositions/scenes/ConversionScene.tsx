import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";

export const ConversionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const checkEnter = spring({ frame: frame - 15, fps, config: { damping: 10, stiffness: 180 } });
  const checkScale = interpolate(checkEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const checkOpacity = interpolate(checkEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const orderEnter = spring({ frame: frame - 45, fps, config: { damping: 14, stiffness: 100 } });
  const orderY = interpolate(orderEnter, [0, 1], [-40, 0], { extrapolateRight: "clamp" });
  const orderOpacity = interpolate(orderEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const statEnter = spring({ frame: frame - 85, fps, config: { damping: 14, stiffness: 100 } });
  const statOpacity = interpolate(statEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const statScale = interpolate(statEnter, [0, 1], [0.75, 1], { extrapolateRight: "clamp" });

  const glowPulse = interpolate(frame % 60, [0, 30, 60], [0.45, 1, 0.45], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "#020d05",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 56,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(37,211,102,0.18) 0%, transparent 65%)",
          opacity: glowPulse,
        }}
      />

      {/* Checkmark */}
      <div
        style={{
          opacity: checkOpacity,
          transform: `scale(${checkScale})`,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "#25D366",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 100px rgba(37,211,102,0.6)",
          fontSize: 90,
          color: "#fff",
        }}
      >
        ✓
      </div>

      {/* Shopify order card */}
      <div
        style={{
          opacity: orderOpacity,
          transform: `translateY(${orderY}px)`,
          background: "#0f1f13",
          border: "2px solid #25D366",
          borderRadius: 24,
          padding: "36px 44px",
          display: "flex",
          alignItems: "center",
          gap: 28,
          width: 860,
        }}
      >
        <div style={{ fontSize: 60 }}>🟢</div>
        <div>
          <div
            style={{
              fontFamily: "sans-serif",
              fontSize: 24,
              color: "#25D366",
              fontWeight: 800,
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Shopify · New Order
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 40, fontWeight: 900, color: "#fff" }}>
            Order #5842 — Priya S.
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 30, color: "#aaa", marginTop: 8 }}>
            ₹2,160 · 3 items · recovered via WhatsApp
          </div>
        </div>
      </div>

      {/* Recovery rate */}
      <div style={{ opacity: statOpacity, transform: `scale(${statScale})`, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 160,
            fontWeight: 900,
            color: "#25D366",
            lineHeight: 1,
            letterSpacing: "-8px",
          }}
        >
          34%
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 32,
            color: "rgba(255,255,255,0.4)",
            marginTop: 12,
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}
        >
          Recovery Rate
        </div>
      </div>

      <Caption text="Customer clicks. Checks out. Cart recovered." delay={10} />
    </AbsoluteFill>
  );
};
