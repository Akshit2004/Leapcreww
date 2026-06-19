import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";
import { RadarBackground } from "../components/RadarBackground";

// 0:14–0:22 | 8 seconds = 240 frames — onboarding widget + risk engine scoring
export const SilentWatcherScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerEnter = spring({ frame: frame - 5, fps, config: { damping: 16, stiffness: 100 } });
  const headerOpacity = interpolate(headerEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const headerY = interpolate(headerEnter, [0, 1], [24, 0], { extrapolateRight: "clamp" });

  const factors = [
    { label: "First-time buyer", points: 20, delay: 60 },
    { label: "Large order value", points: 15, delay: 85 },
    { label: "Duplicate sizes (M + L same item)", points: 25, delay: 110 },
  ];

  const score = Math.round(interpolate(frame, [130, 175], [0, 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const gaugeProgress = interpolate(frame, [130, 175], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#06070a", padding: "0 44px", flexDirection: "column", gap: 26 }}>
      <RadarBackground tint="#f59e0b" />
      {/* Onboarding banner */}
      <div
        style={{
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          marginTop: 90,
          background: "#111",
          border: "1.5px solid #f59e0b55",
          borderLeft: "5px solid #f59e0b",
          borderRadius: 14,
          padding: "26px 30px",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div style={{ fontSize: 40 }}>👁️</div>
        <div>
          <div style={{ fontFamily: "sans-serif", fontSize: 28, fontWeight: 900, color: "#fff" }}>
            15 high-risk orders detected
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 22, color: "#888", marginTop: 4 }}>
            before WhatsApp was even connected
          </div>
        </div>
      </div>

      {/* Risk engine card */}
      <div
        style={{
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: 16,
          padding: "30px 32px",
          opacity: interpolate(frame, [25, 42], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontSize: 24, fontWeight: 800, color: "#bbb", marginBottom: 24 }}>
          Risk Engine · Order #SHPFY-4821
        </div>

        {factors.map((f) => {
          const fEnter = spring({ frame: frame - f.delay, fps, config: { damping: 14, stiffness: 110 } });
          const fo = interpolate(fEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
          const fx = interpolate(fEnter, [0, 1], [-20, 0], { extrapolateRight: "clamp" });
          return (
            <div
              key={f.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: fo,
                transform: `translateX(${fx}px)`,
                padding: "14px 0",
                borderBottom: "1px solid #1a1a1a",
              }}
            >
              <span style={{ fontFamily: "sans-serif", fontSize: 26, color: "#ddd" }}>{f.label}</span>
              <span style={{ fontFamily: "sans-serif", fontSize: 28, color: "#f59e0b", fontWeight: 900 }}>+{f.points}</span>
            </div>
          );
        })}

        {/* Gauge */}
        <div style={{ marginTop: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontFamily: "sans-serif", fontSize: 24, color: "#777", fontWeight: 700 }}>Risk Score</span>
            <span style={{ fontFamily: "sans-serif", fontSize: 30, color: "#ef4444", fontWeight: 900 }}>
              {score} · HIGH
            </span>
          </div>
          <div style={{ background: "#1c1c1c", borderRadius: 10, height: 22, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${gaugeProgress * 100}%`,
                background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                borderRadius: 10,
              }}
            />
          </div>
        </div>
      </div>

      <Caption
        text="The moment a COD order lands, our risk engine scores it. First-time buyer? Large order? Same size twice? Score goes up."
        delay={15}
        accent="#f59e0b"
      />
    </AbsoluteFill>
  );
};
