import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, fontFamily, TYPE, fontFamilyMono } from "../theme";
import { Logo, LeapMark } from "../components/Logo";
import { beatPulse } from "../lib/beat";

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entry = spring({
    frame,
    fps,
    config: { damping: 15, mass: 0.7, stiffness: 120 },
  });

  const scale = interpolate(entry, [0, 1], [0.93, 1]);
  const opacity = interpolate(entry, [0, 1], [0, 1]);

  const cta = spring({ frame: frame - 22, fps, config: { damping: 16, mass: 0.7, stiffness: 130 } });
  const pulse = beatPulse(frame, 5);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        fontFamily,
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      {/* Strict border wrapper */}
      <div
        style={{
          position: "absolute",
          inset: 40,
          border: `2px solid ${COLORS.ink}`,
          pointerEvents: "none",
          transform: `scale(${interpolate(entry, [0, 1], [0.98, 1])})`,
          opacity: entry,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          transform: `scale(${scale})`,
        }}
      >
        <Logo size={130} showSubtitle={true} />

        {/* CTA link */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            opacity: cta,
            transform: `translateY(${interpolate(cta, [0, 1], [18, 0])}px)`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "13px 26px",
              background: COLORS.accent,
              color: COLORS.bgRaised,
              fontSize: TYPE.label,
              fontWeight: 800,
              letterSpacing: "0.01em",
              fontFamily: fontFamilyMono,
              border: `2px solid ${COLORS.ink}`,
            }}
          >
            <LeapMark size={20} />
            LEAPCREWW.COM/HEALTH
          </div>
          <span
            style={{
              fontFamily: fontFamilyMono,
              fontWeight: 700,
              letterSpacing: "0.05em",
              fontSize: 12,
              color: COLORS.ink,
              textTransform: "uppercase"
            }}
          >
            Request demo
          </span>
        </div>
      </div>

      {/* Outro footer info */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          fontFamily: fontFamilyMono,
          fontWeight: 700,
          letterSpacing: "0.15em",
          fontSize: 10,
          color: COLORS.dim,
        }}
      >
        SYS_ENGINE // v1.0 // HEALTHCARE_NODE
      </div>
    </AbsoluteFill>
  );
};
