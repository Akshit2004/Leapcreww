import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// 1:05–1:10 | 5 seconds = 150 frames
export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoEnter = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 90 } });
  const logoScale = interpolate(logoEnter, [0, 1], [0.7, 1], { extrapolateRight: "clamp" });
  const logoOpacity = interpolate(logoEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const taglineEnter = spring({ frame: frame - 35, fps, config: { damping: 16, stiffness: 100 } });
  const taglineOpacity = interpolate(taglineEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = interpolate(taglineEnter, [0, 1], [16, 0], { extrapolateRight: "clamp" });

  const ctaEnter = spring({ frame: frame - 55, fps, config: { damping: 10, stiffness: 120 } });
  const ctaScale = interpolate(ctaEnter, [0, 1], [0.85, 1], { extrapolateRight: "clamp" });
  const ctaOpacity = interpolate(ctaEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const glowPulse = interpolate(frame % 60, [0, 30, 60], [0.5, 1, 0.5], {
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [120, 150], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "#000",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 32,
        opacity: fadeOut,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(37,211,102,0.18) 0%, transparent 65%)",
          opacity: glowPulse,
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 88,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-4px",
            lineHeight: 1,
          }}
        >
          Leap<span style={{ color: "#25D366" }}>Creww</span>
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          textAlign: "center",
          padding: "0 80px",
        }}
      >
        <div
          style={{
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 38,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.8px",
            lineHeight: 1.3,
          }}
        >
          Stop watching carts die.
        </div>
        <div
          style={{
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 38,
            fontWeight: 700,
            color: "#25D366",
            letterSpacing: "-0.8px",
            marginTop: 4,
          }}
        >
          Let the agent work.
        </div>
      </div>

      {/* CTA pill */}
      <div
        style={{
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
          background: "#25D366",
          borderRadius: 60,
          padding: "18px 56px",
          fontFamily: "sans-serif",
          fontSize: 20,
          fontWeight: 800,
          color: "#fff",
          letterSpacing: "-0.3px",
          boxShadow: "0 0 60px rgba(37,211,102,0.45)",
        }}
      >
        Try LeapCreww Free →
      </div>

      {/* Domain */}
      <div
        style={{
          opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }),
          fontFamily: "sans-serif",
          fontSize: 18,
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "2px",
        }}
      >
        leapcreww.app
      </div>
    </AbsoluteFill>
  );
};
