import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { COLORS, EASE } from "../theme";

/**
 * The dark→light radial wipe on the Act I→II turn. A circle of light blooms out
 * from center and floods the frame — the cream canvas literally *is* the relief.
 * A bright accent ring rides the leading edge for one held beat of release.
 */
export const LightFlood: React.FC<{
  from?: number;
  duration?: number;
  color?: string;
}> = ({ from = 0, duration = 20, color = COLORS.bg }) => {
  const frame = useCurrentFrame();

  const p = interpolate(frame, [from, from + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...EASE.outExpo),
  });
  if (p <= 0) return null;

  // Radius in % of the diagonal — overshoots past 100 so the fill is total.
  const radius = p * 145;
  const edge = radius + interpolate(p, [0, 1], [10, 0]);

  // The accent ring is brightest mid-flood, gone by the time light has settled.
  const ringOpacity = interpolate(p, [0, 0.4, 1], [0, 0.5, 0]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${color} 0%, ${color} ${radius}%, transparent ${edge}%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent ${radius - 4}%, ${COLORS.accent} ${radius}%, transparent ${edge + 2}%)`,
          opacity: ringOpacity,
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};
