import React from "react";
import { AbsoluteFill, useCurrentFrame, random } from "remotion";

/**
 * Deterministic film grain + vignette. The grain seed steps every frame so it
 * shimmers, but each frame is reproducible (random() is seeded).
 */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.06 }) => {
  const frame = useCurrentFrame();
  // A static-ish SVG noise tile, re-seeded per frame via baseFrequency jitter.
  const jitter = 0.62 + random(`grain-${frame % 12}`) * 0.06;
  return (
    <>
      <AbsoluteFill
        style={{
          opacity,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      >
        <svg width="100%" height="100%">
          <filter id="g">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={jitter}
              numOctaves={2}
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#g)" />
        </svg>
      </AbsoluteFill>
      {/* Cinematic vignette */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(120% 120% at 50% 42%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </>
  );
};
