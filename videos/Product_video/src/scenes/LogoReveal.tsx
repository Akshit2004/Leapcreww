import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import { COLORS, fontFamily, fontFamilySerif, TYPE, EASE } from "../theme";
import { LeapMark } from "../components/Logo";
import { MaskLine } from "../components/Kinetic";
import { LightFlood } from "../components/LightFlood";

/**
 * Act II — The Leap. The dark of the pile-up is held for one silent beat, then a
 * light flood wipes it away (the cream canvas *is* the relief) and the mark draws
 * in. Earned by the dark before it; entered via the flood, not a flash.
 */
export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // The flood begins after a one-beat silent hold on the residual dark.
  const FLOOD_AT = 6;

  const logoSpring = spring({
    frame: frame - 26,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 120 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.85, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  const line1 = interpolate(frame, [30, 52], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...EASE.outExpo),
  });
  const line2 = interpolate(frame, [46, 68], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...EASE.outExpo),
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        backgroundColor: COLORS.darkBg, // residual dark from Act I…
      }}
    >
      {/* …wiped to light by the flood. */}
      <LightFlood from={FLOOD_AT} duration={22} color={COLORS.bg} />

      {/* Decorative vertical editorial line */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          bottom: "10%",
          left: "25%",
          width: 1,
          background: COLORS.line,
          transform: `scaleY(${line1})`,
          transformOrigin: "top center",
        }}
      />

      {/* Main Lockup Container */}
      <div style={{ display: "flex", alignItems: "center", gap: 48, zIndex: 10 }}>
        <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})` }}>
          <LeapMark size={160} glow={logoSpring} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <MaskLine delay={28} durationIn={22}>
            <div
              style={{
                fontSize: TYPE.display,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: COLORS.ink,
                lineHeight: 1,
              }}
            >
              Leap<span style={{ color: COLORS.accent }}>Creww</span>
            </div>
          </MaskLine>

          {/* Separation line */}
          <div
            style={{
              height: 1,
              width: 520,
              background: COLORS.lineStrong,
              marginTop: 20,
              marginBottom: 16,
              transform: `scaleX(${line2})`,
              transformOrigin: "left center",
            }}
          />

          <MaskLine delay={46} durationIn={22}>
            <div
              style={{
                fontSize: TYPE.h2,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                color: COLORS.dim,
                fontFamily: fontFamilySerif,
                fontStyle: "italic",
              }}
            >
              Put the thread on <span style={{ color: COLORS.ink, fontStyle: "normal", fontWeight: 700 }}>autopilot.</span>
            </div>
          </MaskLine>
        </div>
      </div>

      {/* Aesthetic border details */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: fontFamilySerif,
          fontSize: TYPE.micro,
          color: COLORS.faint,
          letterSpacing: "0.1em",
          opacity: line1,
        }}
      >
        <span>LEAPCREWW // VOL. 1</span>
        <span>by SMRITIX</span>
      </div>
    </AbsoluteFill>
  );
};
