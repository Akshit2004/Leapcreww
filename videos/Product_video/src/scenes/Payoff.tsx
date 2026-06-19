import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { COLORS, fontFamily, fontFamilySerif, TYPE, EASE } from "../theme";
import { Background } from "../components/Background";
import { Counter } from "../components/Counter";
import { MaskLine } from "../components/Kinetic";

const Stat: React.FC<{
  label: string;
  delay: number;
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  group?: boolean;
  accent?: boolean;
}> = ({ label, delay, to, prefix, suffix, decimals, group, accent }) => {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [delay - 6, delay + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...EASE.outExpo),
  });
  return (
    <div style={{ opacity: appear, transform: `translateY(${interpolate(appear, [0, 1], [16, 0])}px)` }}>
      <div
        style={{
          fontSize: TYPE.display,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          color: accent ? COLORS.accent : COLORS.darkInk,
          lineHeight: 1,
        }}
      >
        <Counter to={to} delay={delay} prefix={prefix} suffix={suffix} decimals={decimals} group={group} damping={11} />
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: TYPE.micro,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: COLORS.darkDim,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  const moonGlow = interpolate(frame, [0, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Background variant="dark" accent={false} />

      {/* Cool night wash */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: "radial-gradient(120% 90% at 80% 12%, rgba(99,102,241,0.10) 0%, transparent 55%)",
        }}
      />

      {/* DO NOT DISTURB */}
      <div
        style={{
          position: "absolute",
          top: 110,
          left: 210,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px",
          border: `1px solid ${COLORS.darkLineStrong}`,
          borderRadius: 999,
          color: COLORS.darkDim,
          fontSize: TYPE.micro,
          fontWeight: 700,
          letterSpacing: "0.16em",
        }}
      >
        <span style={{ fontSize: 14 }}>🌙</span> DO NOT DISTURB · 3:47 AM
      </div>

      {/* Crescent moon */}
      <svg style={{ position: "absolute", top: 130, right: 220, filter: `drop-shadow(0 0 ${20 * moonGlow}px rgba(245,244,240,0.4))` }} width={90} height={90} viewBox="0 0 100 100">
        <path d="M65 50a35 35 0 1 1-23-33 28 28 0 0 0 23 33z" fill={COLORS.darkInk} opacity={0.92} />
      </svg>

      {/* Headline */}
      <div style={{ position: "absolute", top: 250, left: 210 }}>
        <div style={{ fontSize: TYPE.h1, fontFamily: fontFamilySerif, color: COLORS.darkInk, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          <MaskLine delay={8} durationIn={22}>
            <span style={{ fontStyle: "italic" }}>While you sleep,</span>
          </MaskLine>
          <MaskLine delay={20} durationIn={22}>
            <span>
              Leap<span style={{ color: COLORS.accent }}>Creww</span> works.
            </span>
          </MaskLine>
        </div>
      </div>

      {/* The numbers climbing by themselves */}
      <div
        style={{
          position: "absolute",
          left: 210,
          right: 210,
          top: 560,
          display: "flex",
          justifyContent: "space-between",
          gap: 40,
        }}
      >
        <Stat label="Messages answered" delay={36} to={891} group accent />
        <Stat label="Read rate" delay={48} to={89.7} decimals={1} suffix="%" />
        <Stat label="Revenue recovered" delay={60} to={42} prefix="+" suffix="%" />
        <Stat label="Hours saved this week" delay={72} to={37} />
      </div>

      {/* Sleeping horizon silhouette */}
      <svg style={{ position: "absolute", bottom: 60, left: 60, right: 60, width: "auto" }} height={120} viewBox="0 0 1800 120" preserveAspectRatio="none">
        <path d="M0 120 L0 78 Q 220 64 420 70 Q 560 74 690 52 Q 760 40 860 50 L1800 78 L1800 120 Z" fill="rgba(245,244,240,0.05)" />
      </svg>
    </AbsoluteFill>
  );
};
