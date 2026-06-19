import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface PhoneMockupProps {
  children: React.ReactNode;
  delay?: number;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ children, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entered = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.9 },
  });
  const scale = interpolate(entered, [0, 1], [0.88, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(entered, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ opacity, transform: `scale(${scale})` }}>
      <div
        style={{
          width: 520,
          height: 1040,
          background: "#0d0d0d",
          borderRadius: 60,
          border: "3px solid #2a2a2a",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 48px 130px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Dynamic Island */}
        <div
          style={{
            position: "absolute",
            top: 18,
            left: "50%",
            transform: "translateX(-50%)",
            width: 140,
            height: 38,
            background: "#000",
            borderRadius: 24,
            zIndex: 20,
          }}
        />
        <div style={{ width: "100%", height: "100%" }}>{children}</div>
      </div>
    </div>
  );
};
