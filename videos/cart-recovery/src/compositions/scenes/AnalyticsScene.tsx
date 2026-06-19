import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";

export const AnalyticsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerEnter = spring({ frame: frame - 5, fps, config: { damping: 16, stiffness: 100 } });
  const headerOpacity = interpolate(headerEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const headerY = interpolate(headerEnter, [0, 1], [24, 0], { extrapolateRight: "clamp" });

  const metrics = [
    { label: "Triggered", value: "1,247", color: "#25D366", delay: 20 },
    { label: "Revenue", value: "₹3.1L", color: "#3b82f6", delay: 35 },
    { label: "Recovery", value: "34%", color: "#f59e0b", delay: 50 },
    { label: "Avg Reply", value: "4.2m", color: "#ec4899", delay: 65 },
  ];

  const recentReplies = [
    { name: "Priya S.", message: "Just ordered! Thank you 😊", status: "recovered" },
    { name: "Rahul M.", message: "Can I change the size?", status: "replied" },
    { name: "Ananya K.", message: "SAVE10 worked! Ordered ✅", status: "recovered" },
    { name: "Vikram D.", message: "Out for delivery now?", status: "replied" },
  ];

  const barProgress = interpolate(frame, [45, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#080808", padding: "0 44px", flexDirection: "column", gap: 28 }}>
      {/* Header */}
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
            Analytics · Recovery Dashboard
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
      <div style={{ display: "flex", gap: 16 }}>
        {metrics.map((m) => {
          const cardEnter = spring({ frame: frame - m.delay, fps, config: { damping: 14, stiffness: 100 } });
          const co = interpolate(cardEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
          const cy = interpolate(cardEnter, [0, 1], [24, 0], { extrapolateRight: "clamp" });
          return (
            <div
              key={m.label}
              style={{
                flex: 1,
                background: "#111",
                border: `1px solid ${m.color}25`,
                borderTop: `5px solid ${m.color}`,
                borderRadius: 14,
                padding: "24px 20px",
                opacity: co,
                transform: `translateY(${cy}px)`,
              }}
            >
              <div style={{ fontFamily: "sans-serif", fontSize: 20, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {m.label}
              </div>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 50,
                  fontWeight: 900,
                  color: m.color,
                  marginTop: 10,
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
          opacity: interpolate(frame, [65, 82], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontSize: 26, fontWeight: 700, color: "#bbb", marginBottom: 20 }}>
          Recovery Funnel
        </div>
        {[
          { label: "Triggered", pct: 100, color: "#334155" },
          { label: "Opened", pct: 78, color: "#3b82f6" },
          { label: "Clicked", pct: 52, color: "#f59e0b" },
          { label: "Recovered", pct: 34, color: "#25D366" },
        ].map((bar) => (
          <div key={bar.label} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: "sans-serif", fontSize: 24, color: "#777", fontWeight: 500 }}>{bar.label}</span>
              <span style={{ fontFamily: "sans-serif", fontSize: 24, color: "#777", fontWeight: 800 }}>{bar.pct}%</span>
            </div>
            <div style={{ background: "#1c1c1c", borderRadius: 8, height: 16, overflow: "hidden" }}>
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

      {/* Recent replies */}
      <div
        style={{
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: 14,
          overflow: "hidden",
          opacity: interpolate(frame, [82, 100], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div
          style={{
            padding: "18px 28px",
            borderBottom: "1px solid #1a1a1a",
            fontFamily: "sans-serif",
            fontSize: 26,
            fontWeight: 700,
            color: "#bbb",
          }}
        >
          Recent Replies
        </div>
        {recentReplies.map((r, i) => {
          const rowEnter = spring({ frame: frame - (100 + i * 14), fps, config: { damping: 14, stiffness: 100 } });
          const ro = interpolate(rowEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
          return (
            <div
              key={r.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "18px 28px",
                borderBottom: "1px solid #141414",
                opacity: ro,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: r.status === "recovered" ? "#25D366" : "#3b82f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 900,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {r.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "sans-serif", fontSize: 26, fontWeight: 800, color: "#fff" }}>{r.name}</div>
                <div
                  style={{
                    fontFamily: "sans-serif",
                    fontSize: 22,
                    color: "#555",
                    marginTop: 3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.message}
                </div>
              </div>
              <div
                style={{
                  background: r.status === "recovered" ? "rgba(37,211,102,0.14)" : "rgba(59,130,246,0.14)",
                  border: `1.5px solid ${r.status === "recovered" ? "#25D36688" : "#3b82f688"}`,
                  borderRadius: 30,
                  padding: "6px 18px",
                  fontSize: 19,
                  fontWeight: 900,
                  color: r.status === "recovered" ? "#25D366" : "#3b82f6",
                  whiteSpace: "nowrap",
                }}
              >
                {r.status === "recovered" ? "RECOVERED" : "REPLIED"}
              </div>
            </div>
          );
        })}
      </div>

      <Caption
        text="Every recovery is tracked — who replied, what they said, how much revenue came back."
        delay={10}
      />
    </AbsoluteFill>
  );
};
