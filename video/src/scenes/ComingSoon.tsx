import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import { COLORS, fontFamily, fontFamilySerif, TYPE, EASE } from "../theme";

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
  // Slowly widen letter spacing over the 2 seconds
  const letterSpacing = interpolate(frame, [0, 60], [0.05, 0.25], {
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
      {/* Structural layout outlines to make it feel architectural */}
      <div style={{
        width: 600,
        height: 1,
        background: COLORS.lineStrong,
        marginBottom: 36,
        transform: `scaleX(${entry})`,
      }} />

      <div
        style={{
          fontFamily: fontFamilySerif,
          fontStyle: "italic",
          fontSize: TYPE.h2,
          fontWeight: 400,
          color: COLORS.ink,
          transform: `scale(${scale})`,
          letterSpacing: `${letterSpacing}em`,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        A new era of conversion.
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
