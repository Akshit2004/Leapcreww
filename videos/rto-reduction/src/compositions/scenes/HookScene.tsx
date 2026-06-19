import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";
import { RadarBackground, MapPin } from "../components/RadarBackground";

// 0:00–0:06 | 6 seconds = 180 frames — control tower boots up, three live orders drop onto the map, one flags red
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerEnter = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 80 } });
  const headerOpacity = interpolate(headerEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const pinOpacity = (delay: number) =>
    interpolate(spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 120 } }), [0, 1], [0, 1], {
      extrapolateRight: "clamp",
    });
  const pinScale = (delay: number) =>
    interpolate(spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 120 } }), [0, 1], [0.3, 1], {
      extrapolateRight: "clamp",
    });

  const cardEnter = spring({ frame: frame - 95, fps, config: { damping: 14, stiffness: 110 } });
  const cardOpacity = interpolate(cardEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const cardY = interpolate(cardEnter, [0, 1], [24, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#06070a" }}>
      <RadarBackground tint="#ef4444" />

      <div
        style={{
          opacity: headerOpacity,
          position: "absolute",
          top: 90,
          left: 44,
          right: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "0.5px" }}>
          LIVE ORDER MAP
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#25D366",
              opacity: interpolate(frame % 40, [0, 20, 40], [1, 0.3, 1], { extrapolateRight: "clamp" }),
            }}
          />
          <span style={{ fontFamily: "sans-serif", fontSize: 20, color: "#25D366", fontWeight: 800 }}>LIVE</span>
        </div>
      </div>

      <MapPin xPct={28} yPct={42} color="#3b82f6" label="Ananya K." opacity={pinOpacity(20)} scale={pinScale(20)} />
      <MapPin xPct={68} yPct={55} color="#3b82f6" label="Vikram D." opacity={pinOpacity(45)} scale={pinScale(45)} />
      <MapPin xPct={46} yPct={68} color="#ef4444" label="Rahul M." opacity={pinOpacity(75)} scale={pinScale(75)} pulse />

      <div
        style={{
          position: "absolute",
          left: "46%",
          top: "68%",
          transform: "translate(-50%, 30px)",
          opacity: cardOpacity,
          marginTop: cardY,
          background: "rgba(0,0,0,0.85)",
          border: "1.5px solid #ef4444",
          borderRadius: 12,
          padding: "16px 22px",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontSize: 22, fontWeight: 900, color: "#ef4444", letterSpacing: "0.5px" }}>
          ⚠ #SHPFY-4821 · ₹3,200 · COD
        </div>
        <div style={{ fontFamily: "sans-serif", fontSize: 18, color: "#ccc", marginTop: 4 }}>
          flagged WF-HIGH-RISK
        </div>
      </div>

      <Caption
        text="30% of COD orders in India never get delivered. Someone ordered, never paid, you ate the return shipping."
        delay={15}
        accent="#ef4444"
      />
    </AbsoluteFill>
  );
};
