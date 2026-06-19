import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

// Dot-grid + scanline backdrop for the "logistics control tower" visual language —
// keeps every dark scene on the same map-room aesthetic without a literal/inaccurate geo map.
export const RadarBackground: React.FC<{ tint?: string }> = ({ tint = "#25D366" }) => {
  const frame = useCurrentFrame();
  const sweepY = interpolate(frame % 260, [0, 260], [-300, 2200]);

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle, #20283a 1.5px, transparent 1.5px)",
          backgroundSize: "46px 46px",
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 900px 520px at 50% 0%, ${tint}1a 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: sweepY,
          height: 260,
          background: `linear-gradient(180deg, transparent, ${tint}12, transparent)`,
          pointerEvents: "none",
        }}
      />
    </>
  );
};

interface MapPinProps {
  xPct: number;
  yPct: number;
  color: string;
  label?: string;
  size?: number;
  pulse?: boolean;
  opacity: number;
  scale?: number;
}

export const MapPin: React.FC<MapPinProps> = ({ xPct, yPct, color, label, size = 18, pulse, opacity, scale = 1 }) => {
  const frame = useCurrentFrame();
  const ringOpacity = pulse ? interpolate(frame % 50, [0, 25, 50], [0.7, 0, 0.7]) : 0;
  const ringScale = pulse ? interpolate(frame % 50, [0, 50], [1, 2.4]) : 1;

  return (
    <div style={{ position: "absolute", left: `${xPct}%`, top: `${yPct}%`, opacity, transform: `translate(-50%, -50%) scale(${scale})` }}>
      {pulse && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: size,
            height: size,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            opacity: ringOpacity,
            transform: `translate(-50%, -50%) scale(${ringScale})`,
          }}
        />
      )}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 18px ${color}99`,
        }}
      />
      {label && (
        <div
          style={{
            position: "absolute",
            top: size + 10,
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            fontFamily: "sans-serif",
            fontSize: 18,
            fontWeight: 800,
            color,
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
