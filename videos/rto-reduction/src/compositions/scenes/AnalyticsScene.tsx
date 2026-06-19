import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";
import { RadarBackground } from "../components/RadarBackground";

// 1:12–1:20 | 8 seconds = 240 frames — RTO/NDR analytics tab
export const AnalyticsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerEnter = spring({ frame: frame - 5, fps, config: { damping: 16, stiffness: 100 } });
  const headerOpacity = interpolate(headerEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const headerY = interpolate(headerEnter, [0, 1], [24, 0], { extrapolateRight: "clamp" });

  const metrics = [
    { label: "NDR Rescue", value: "68%", color: "#25D366", delay: 20 },
    { label: "COD Confirm", value: "74%", color: "#3b82f6", delay: 35 },
    { label: "Prepaid Conv.", value: "22%", color: "#f59e0b", delay: 50 },
    { label: "RTO Prevented", value: "₹1.8L", color: "#ec4899", delay: 65 },
  ];

  const barProgress = interpolate(frame, [45, 115], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#06070a", padding: "0 44px", flexDirection: "column", gap: 28 }}>
      <RadarBackground tint="#25D366" />
      <div
        style={{
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          display: "flex",
          alignItems: "center",
          paddingTop: 90,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: 52,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            Leap<span style={{ color: "#25D366" }}>Creww</span>
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 24, color: "#444", marginTop: 6, letterSpacing: "1px" }}>
            Analytics · RTO / NDR
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(37,211,102,0.1)",
            border: "1.5px solid rgba(37,211,102,0.35)",
            borderRadius: 30,
            padding: "10px 24px",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#25D366",
              opacity: interpolate(frame % 40, [0, 20, 40], [1, 0.3, 1], { extrapolateRight: "clamp" }),
            }}
          />
          <span style={{ fontFamily: "sans-serif", fontSize: 22, color: "#25D366", fontWeight: 800 }}>LIVE</span>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {metrics.map((m) => {
          const cardEnter = spring({ frame: frame - m.delay, fps, config: { damping: 14, stiffness: 100 } });
          const co = interpolate(cardEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
          const cy = interpolate(cardEnter, [0, 1], [24, 0], { extrapolateRight: "clamp" });
          return (
            <div
              key={m.label}
              style={{
                flex: "1 1 45%",
                background: "#111",
                border: `1px solid ${m.color}25`,
                borderTop: `5px solid ${m.color}`,
                borderRadius: 14,
                padding: "22px 20px",
                opacity: co,
                transform: `translateY(${cy}px)`,
              }}
            >
              <div style={{ fontFamily: "sans-serif", fontSize: 19, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {m.label}
              </div>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 46,
                  fontWeight: 900,
                  color: m.color,
                  marginTop: 8,
                  letterSpacing: "-1px",
                  lineHeight: 1,
                }}
              >
                {m.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Funnel bars */}
      <div
        style={{
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: 14,
          padding: "26px 28px",
          opacity: interpolate(frame, [80, 97], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontSize: 25, fontWeight: 700, color: "#bbb", marginBottom: 18 }}>
          Risk Funnel
        </div>
        {[
          { label: "Flagged high-risk", pct: 100, color: "#334155" },
          { label: "Hold released (confirmed)", pct: 74, color: "#3b82f6" },
          { label: "Converted prepaid", pct: 22, color: "#f59e0b" },
          { label: "Delivered successfully", pct: 91, color: "#25D366" },
        ].map((bar) => (
          <div key={bar.label} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "sans-serif", fontSize: 21, color: "#777", fontWeight: 500 }}>{bar.label}</span>
              <span style={{ fontFamily: "sans-serif", fontSize: 21, color: "#777", fontWeight: 800 }}>{bar.pct}%</span>
            </div>
            <div style={{ background: "#1c1c1c", borderRadius: 8, height: 14, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${bar.pct * barProgress}%`,
                  background: bar.color,
                  borderRadius: 8,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <Caption
        text="Every number tracked. NDR rescue rate. COD confirmation rate. Prepaid conversions. RTO loss prevented."
        delay={12}
      />
    </AbsoluteFill>
  );
};
