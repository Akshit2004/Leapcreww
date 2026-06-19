import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface CaptionProps {
  text: string;
  delay?: number;
  accent?: string;
}

export const Caption: React.FC<CaptionProps> = ({ text, delay = 0, accent = "#25D366" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entered = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 100 },
  });
  const opacity = interpolate(entered, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(entered, [0, 1], [24, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 90,
        left: 0,
        right: 0,
        padding: "0 60px",
        opacity,
        transform: `translateY(${y}px)`,
        zIndex: 50,
      }}
    >
      <div
        style={{
          borderLeft: `6px solid ${accent}`,
          background: "rgba(0,0,0,0.90)",
          padding: "26px 34px",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: 42,
          fontWeight: 700,
          color: "#FFFFFF",
          lineHeight: 1.35,
          letterSpacing: "-0.5px",
        }}
      >
        {text}
      </div>
    </div>
  );
};
