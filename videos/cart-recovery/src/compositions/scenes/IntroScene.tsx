import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// 0:00–0:02 | 2 seconds = 60 frames — brand bumper before the hook
export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoEnter = spring({ frame: frame - 3, fps, config: { damping: 12, stiffness: 140 } });
  const logoScale = interpolate(logoEnter, [0, 1], [0.6, 1], { extrapolateRight: "clamp" });
  const logoOpacity = interpolate(logoEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const tagOpacity = interpolate(frame, [20, 32], [0, 1], { extrapolateRight: "clamp" });

  const glowPulse = interpolate(frame % 60, [0, 30, 60], [0.5, 1, 0.5], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "#000",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 26,
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

      <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})`, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 84,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-4px",
            lineHeight: 1,
          }}
        >
          Leap<span style={{ color: "#25D366" }}>Creww</span>
        </div>
      </div>

      <div
        style={{
          opacity: tagOpacity,
          fontFamily: "sans-serif",
          fontSize: 22,
          color: "rgba(255,255,255,0.45)",
          letterSpacing: "4px",
          textTransform: "uppercase",
        }}
      >
        Cart Recovery Agent
      </div>
    </AbsoluteFill>
  );
};
