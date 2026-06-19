import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, fontFamily, fontFamilySerif, TYPE } from "../theme";
import { Logo, LeapMark } from "../components/Logo";
import { MaskLine } from "../components/Kinetic";
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

  // The CTA arrives a beat after the lockup, and breathes on the beat.
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
      {/* Delicate border wrapping for the final screen */}
      <div
        style={{
          position: "absolute",
          inset: 60,
          border: `1px solid ${COLORS.lineStrong}`,
          borderRadius: 24,
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
        <Logo size={130} showCompany={true} />

        {/* The call to action — so the film asks for something. */}
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
              borderRadius: 999,
              fontSize: TYPE.label,
              fontWeight: 800,
              letterSpacing: "0.01em",
              boxShadow: `0 10px 30px rgba(16,185,129,${0.18 + pulse * 0.12})`,
            }}
          >
            <LeapMark size={20} />
            leapcreww.com
          </div>
          <span
            style={{
              fontFamily: fontFamilySerif,
              fontStyle: "italic",
              fontSize: TYPE.body,
              color: COLORS.dim,
            }}
          >
            Early access open
          </span>
        </div>
      </div>

      {/* Decorative details */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          fontFamily: fontFamilySerif,
          fontStyle: "italic",
          fontSize: TYPE.micro,
          color: COLORS.dim,
        }}
      >
        Designed with precision by Smritix
      </div>
    </AbsoluteFill>
  );
};
