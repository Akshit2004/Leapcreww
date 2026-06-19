import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, fontFamilyMono } from "../theme";

type Variant = "light" | "dark";

export const Background: React.FC<{ variant?: Variant }> = ({
  variant = "light",
}) => {
  const frame = useCurrentFrame();
  const dark = variant === "dark";

  const bg = dark ? COLORS.darkBg : COLORS.bg;
  const line = dark ? COLORS.darkLine : COLORS.line;
  const faint = dark ? COLORS.darkFaint : COLORS.faint;
  const lineStrong = dark ? COLORS.darkLineStrong : COLORS.lineStrong;

  // Swiss Grid Pattern
  const gridSize = 80;

  return (
    <AbsoluteFill style={{ backgroundColor: bg, overflow: "hidden" }}>
      {/* Structural Grid Background */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(to right, ${line} 1px, transparent 1px),
            linear-gradient(to bottom, ${line} 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          opacity: 0.5,
        }}
      />

      {/* Clean border framing for an editorial touch */}
      <AbsoluteFill
        style={{
          border: `1px solid ${lineStrong}`,
          margin: "40px",
          pointerEvents: "none",
        }}
      >
        {/* Corner crosshairs */}
        <div style={{ position: "absolute", top: -5, left: -5, width: 10, height: 10, border: `1px solid ${lineStrong}` }} />
        <div style={{ position: "absolute", top: -5, right: -5, width: 10, height: 10, border: `1px solid ${lineStrong}` }} />
        <div style={{ position: "absolute", bottom: -5, left: -5, width: 10, height: 10, border: `1px solid ${lineStrong}` }} />
        <div style={{ position: "absolute", bottom: -5, right: -5, width: 10, height: 10, border: `1px solid ${lineStrong}` }} />

        {/* Monospace structural indicators */}
        <div style={{ position: "absolute", top: -24, left: 0, fontFamily: fontFamilyMono, fontSize: 10, letterSpacing: "0.15em", color: faint }}>
          {dark ? "[SYS_ALERT // HEAL_QUEUE]" : "[SYS_SYNCED // HEAL_FLOW]"}
        </div>

        <div style={{ position: "absolute", top: -24, right: 0, fontFamily: fontFamilyMono, fontSize: 10, letterSpacing: "0.15em", color: faint }}>
          INDEX: {frame} // FPS: 30
        </div>

        <div style={{ position: "absolute", bottom: -24, left: 0, fontFamily: fontFamilyMono, fontSize: 10, letterSpacing: "0.15em", color: faint }}>
          VIEW: 1920x1080 // SCALE: 1:1
        </div>

        <div style={{ position: "absolute", bottom: -24, right: 0, fontFamily: fontFamilyMono, fontSize: 10, letterSpacing: "0.15em", color: faint }}>
          LEAPCREWW // HEALTHCARE
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
