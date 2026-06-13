import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, fontFamily, TYPE } from "../theme";

export const ComingSoon: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entry = spring({
    frame,
    fps,
    config: { damping: 18, mass: 0.8, stiffness: 100 },
  });

  const scale = interpolate(entry, [0, 1], [0.95, 1]);
  const opacity = interpolate(entry, [0, 1], [0, 1]);
  const letterSpacing = interpolate(frame, [0, 60], [0.05, 0.22], {
    extrapolateRight: "clamp",
  });

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
      <div style={{
        width: 600,
        height: 1,
        background: COLORS.lineStrong,
        marginBottom: 36,
        transform: `scaleX(${entry})`,
      }} />

      <div
        style={{
          fontFamily: fontFamily,
          fontSize: TYPE.h2,
          fontWeight: 400,
          color: COLORS.ink,
          transform: `scale(${scale})`,
          letterSpacing: `${letterSpacing}em`,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        The future of patient care.
      </div>

      <div style={{
        width: 600,
        height: 1,
        background: COLORS.lineStrong,
        marginTop: 36,
        transform: `scaleX(${entry})`,
      }} />
    </AbsoluteFill>
  );
};
