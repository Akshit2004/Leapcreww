import React from "react";
import { COLORS, fontFamily } from "../theme";

/** The "leap" mark — an upward chevron stack rendered as SVG. */
export const LeapMark: React.FC<{ size?: number; glow?: number }> = ({
  size = 64,
  glow = 0,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    style={{ filter: glow ? `drop-shadow(0 0 ${glow * 26}px ${COLORS.accentGlow})` : undefined }}
  >
    <path
      d="M50 8 L92 50 L74 50 L50 26 L26 50 L8 50 Z"
      fill={COLORS.accent}
    />
    <path
      d="M50 44 L84 78 L66 78 L50 62 L34 78 L16 78 Z"
      fill={COLORS.accent}
      opacity={0.55}
    />
  </svg>
);

/**
 * Static LeapCreww lockup with the "by SMRITIX" company endorsement.
 * Used on the end card and as a corner bug.
 */
export const Logo: React.FC<{
  size?: number;
  showCompany?: boolean;
  glow?: number;
}> = ({ size = 84, showCompany = true, glow = 0 }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.28,
        fontFamily,
      }}
    >
      <LeapMark size={size * 1.05} glow={glow} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <div
          style={{
            fontSize: size,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: COLORS.ink,
          }}
        >
          Leap<span style={{ color: COLORS.accent }}>Creww</span>
        </div>
        {showCompany && (
          <div
            style={{
              marginTop: size * 0.22,
              fontSize: size * 0.32, // Upgraded size for prominence
              fontWeight: 700,
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              color: COLORS.dim,
            }}
          >
            by Smritix
          </div>
        )}
      </div>
    </div>
  );
};
