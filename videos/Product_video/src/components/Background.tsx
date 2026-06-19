import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../theme";
import { beatPulse } from "../lib/beat";

type Variant = "light" | "dark";

/**
 * Creative editorial backdrop: soft ambient lighting, the structural HUD frame,
 * and a subtle beat-reactive wash. `variant` carries the narrative arc — the
 * dark "problem" canvas of Act I/IV vs. the light relief of the rest.
 */
export const Background: React.FC<{ accent?: boolean; variant?: Variant }> = ({
  accent = true,
  variant = "light",
}) => {
  const frame = useCurrentFrame();
  const pulse = beatPulse(frame, 5);
  const dark = variant === "dark";

  const bg = dark ? COLORS.darkBg : COLORS.bg;
  const raised = dark ? COLORS.darkRaised : COLORS.bgRaised;
  const lineStrong = dark ? COLORS.darkLineStrong : COLORS.lineStrong;
  const faint = dark ? COLORS.darkFaint : COLORS.faint;
  // In the dark acts the beat glow is the danger red (the unread counter);
  // in the light acts it's the calm emerald accent.
  const glowColor = dark ? COLORS.danger : COLORS.accent;

  const drift = (frame * 0.5) % 360;
  const glowOpacity = interpolate(pulse, [0, 1], dark ? [0.04, 0.16] : [0.05, 0.2]);

  return (
    <AbsoluteFill style={{ backgroundColor: bg, overflow: "hidden" }}>
      {/* Base ambient gradient */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 0%, ${raised} 0%, transparent 60%)`,
          opacity: dark ? 0.5 : 1,
        }}
      />

      {/* Slow-moving soft gradient wash */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(${drift}deg, rgba(0,0,0,0.02) 0%, transparent 40%, rgba(0,0,0,0.01) 100%)`,
          opacity: 0.8,
        }}
      />

      {/* Beat-reactive glow */}
      {accent && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 50%, ${glowColor} 0%, transparent 50%)`,
            opacity: glowOpacity,
            transform: `scale(${1 + pulse * 0.1}) translateY(${pulse * -10}px)`,
            filter: "blur(60px)",
          }}
        />
      )}

      {/* Clean border framing for an editorial touch */}
      <AbsoluteFill
        style={{
          border: `1px solid ${lineStrong}`,
          margin: "40px",
          pointerEvents: "none",
        }}
      >
        {/* Corner crosshairs */}
        <span style={{ position: "absolute", top: -8, left: -4, color: faint, fontSize: 14 }}>+</span>
        <span style={{ position: "absolute", top: -8, right: -4, color: faint, fontSize: 14 }}>+</span>
        <span style={{ position: "absolute", bottom: -8, left: -4, color: faint, fontSize: 14 }}>+</span>
        <span style={{ position: "absolute", bottom: -8, right: -4, color: faint, fontSize: 14 }}>+</span>

        {/* Monospace structural indicators */}
        <div style={{ position: "absolute", top: -24, left: 0, fontFamily: "monospace", fontSize: 10, letterSpacing: "0.15em", color: faint }}>
          {dark ? "[SYS_OVERLOAD // CH_WhatsApp]" : "[SYS_ACTIVE // CH_WhatsApp]"}
        </div>

        <div style={{ position: "absolute", top: -24, right: 0, fontFamily: "monospace", fontSize: 10, letterSpacing: "0.15em", color: faint }}>
          INDEX: {frame} // FPS: 30
        </div>

        <div style={{ position: "absolute", bottom: -24, left: 0, fontFamily: "monospace", fontSize: 10, letterSpacing: "0.15em", color: faint }}>
          VIEW: 1920x1080 // SCALE: 1:1
        </div>

        <div style={{ position: "absolute", bottom: -24, right: 0, fontFamily: "monospace", fontSize: 10, letterSpacing: "0.15em", color: faint }}>
          DEC_BUILD // SMRITIX
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
