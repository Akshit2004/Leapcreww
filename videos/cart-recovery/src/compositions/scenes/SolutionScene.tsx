import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";

// 0:12–0:18 | 6 seconds = 180 frames
export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoEnter = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 100 } });
  const cardEnter = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 90 } });
  const buttonEnter = spring({ frame: frame - 65, fps, config: { damping: 10, stiffness: 120 } });

  const logoScale = interpolate(logoEnter, [0, 1], [0.7, 1], { extrapolateRight: "clamp" });
  const logoOpacity = interpolate(logoEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const cardY = interpolate(cardEnter, [0, 1], [30, 0], { extrapolateRight: "clamp" });
  const cardOpacity = interpolate(cardEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const buttonScale = interpolate(buttonEnter, [0, 1], [0.8, 1], { extrapolateRight: "clamp" });
  const buttonOpacity = interpolate(buttonEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const glowPulse = interpolate(frame % 60, [0, 30, 60], [0.4, 1, 0.4], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #050505 0%, #0a1a0f 60%, #050505 100%)",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 50,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,211,102,0.12) 0%, transparent 70%)",
          opacity: glowPulse,
        }}
      />

      {/* Logo */}
      <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})`, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 68,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-3px",
          }}
        >
          Leap<span style={{ color: "#25D366" }}>Creww</span>
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 22,
            color: "rgba(255,255,255,0.4)",
            marginTop: 8,
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}
        >
          Sequences · Cart Recovery
        </div>
      </div>

      {/* Recipe card */}
      <div
        style={{
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
          width: 600,
          background: "#111",
          border: "1px solid #1e3a24",
          borderLeft: "6px solid #25D366",
          borderRadius: 16,
          padding: "32px 36px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#25D366",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              flexShrink: 0,
            }}
          >
            🛒
          </div>
          <div>
            <div style={{ fontFamily: "sans-serif", fontSize: 26, fontWeight: 800, color: "#fff" }}>
              Cart Recovery Agent
            </div>
            <div style={{ fontFamily: "sans-serif", fontSize: 19, color: "#555", marginTop: 4 }}>
              3-step WhatsApp sequence
            </div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              background: "rgba(37,211,102,0.15)",
              border: "1px solid #25D366",
              borderRadius: 24,
              padding: "5px 18px",
              fontSize: 17,
              fontWeight: 800,
              color: "#25D366",
              whiteSpace: "nowrap",
            }}
          >
            RECIPE
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {["30 min — Gentle nudge", "3 hrs — Follow-up", "24 hrs — Discount offer"].map((step, i) => (
            <div
              key={step}
              style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "sans-serif", fontSize: 21, color: "#ccc" }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "2px solid #25D366",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  color: "#25D366",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Activate button */}
      <div
        style={{
          opacity: buttonOpacity,
          transform: `scale(${buttonScale})`,
          background: "#25D366",
          borderRadius: 16,
          padding: "22px 64px",
          fontFamily: "sans-serif",
          fontSize: 26,
          fontWeight: 900,
          color: "#fff",
          letterSpacing: "-0.3px",
          boxShadow: "0 0 50px rgba(37,211,102,0.4)",
        }}
      >
        Activate Agent →
      </div>

      <Caption text="One click. The Cart Recovery Agent activates." delay={10} />
    </AbsoluteFill>
  );
};
