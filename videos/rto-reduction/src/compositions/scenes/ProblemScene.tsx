import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";
import { RadarBackground } from "../components/RadarBackground";

// 0:06–0:14 | 8 seconds = 240 frames — RTO label + warehouse restocking + cost ticker
export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stampEnter = spring({ frame: frame - 10, fps, config: { damping: 10, stiffness: 140 } });
  const stampScale = interpolate(stampEnter, [0, 1], [1.4, 1], { extrapolateRight: "clamp" });
  const stampOpacity = interpolate(stampEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const stampRotate = interpolate(stampEnter, [0, 1], [-18, -8], { extrapolateRight: "clamp" });

  const costRows = [
    { label: "Packing", value: 40, delay: 70 },
    { label: "Courier (to & fro)", value: 180, delay: 95 },
    { label: "Restocking time", value: 80, delay: 120 },
  ];

  const totalCount = Math.round(interpolate(frame, [130, 170], [0, 300], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  return (
    <AbsoluteFill style={{ background: "#06070a", flexDirection: "column" }}>
      <RadarBackground tint="#ef4444" />
      {/* Top half — package with RTO stamp */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderBottom: "1px solid #222",
        }}
      >
        <div
          style={{
            width: 360,
            height: 280,
            background: "linear-gradient(155deg, #8a5a2e 0%, #6b4423 100%)",
            borderRadius: 10,
            position: "relative",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 14, background: "rgba(0,0,0,0.2)", transform: "translateX(-50%)" }} />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) scale(${stampScale}) rotate(${stampRotate}deg)`,
              opacity: stampOpacity,
              border: "6px solid #ef4444",
              borderRadius: 12,
              padding: "14px 24px",
              background: "rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ fontFamily: "sans-serif", fontSize: 38, fontWeight: 900, color: "#ef4444", letterSpacing: "1px", textAlign: "center" }}>
              RTO
            </div>
            <div style={{ fontFamily: "sans-serif", fontSize: 16, fontWeight: 800, color: "#ef4444", letterSpacing: "2px", textAlign: "center" }}>
              RETURN TO ORIGIN
            </div>
          </div>
        </div>
      </div>

      {/* Bottom half — cost breakdown */}
      <div style={{ flex: 1, padding: "44px 50px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 26,
            color: "#666",
            letterSpacing: "1px",
            textTransform: "uppercase",
            opacity: interpolate(frame, [50, 65], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          One fake order costs you
        </div>

        {costRows.map((row) => {
          const rowEnter = spring({ frame: frame - row.delay, fps, config: { damping: 14, stiffness: 110 } });
          const ro = interpolate(rowEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
          const rx = interpolate(rowEnter, [0, 1], [-24, 0], { extrapolateRight: "clamp" });
          return (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: ro,
                transform: `translateX(${rx}px)`,
                borderBottom: "1px solid #222",
                paddingBottom: 14,
              }}
            >
              <span style={{ fontFamily: "sans-serif", fontSize: 30, color: "#ccc", fontWeight: 600 }}>{row.label}</span>
              <span style={{ fontFamily: "sans-serif", fontSize: 32, color: "#fff", fontWeight: 800 }}>₹{row.value}</span>
            </div>
          );
        })}

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            opacity: interpolate(frame, [125, 140], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <span style={{ fontFamily: "sans-serif", fontSize: 34, color: "#fff", fontWeight: 900 }}>TOTAL</span>
          <span style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 64, color: "#ef4444", fontWeight: 900, letterSpacing: "-2px" }}>
            ₹{totalCount}
          </span>
        </div>

        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 24,
            color: "#666",
            marginTop: 4,
            opacity: interpolate(frame, [150, 165], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          — before you've made a rupee
        </div>
      </div>

      <Caption
        text="Packing costs. Courier fees. Restocking time. One fake order costs you ₹300 minimum — before you've made a rupee."
        delay={20}
        accent="#ef4444"
      />
    </AbsoluteFill>
  );
};
