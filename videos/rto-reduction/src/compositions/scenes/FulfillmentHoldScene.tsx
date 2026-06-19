import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";
import { RadarBackground, MapPin } from "../components/RadarBackground";
import { EventLogCard } from "../components/EventLogCard";

// 0:22–0:32 | 10 seconds = 300 frames — fulfillment route freezes at a gate, an outbound event fires
export const FulfillmentHoldScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const routeProgress = interpolate(frame, [20, 90], [0, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const gateEnter = spring({ frame: frame - 90, fps, config: { damping: 10, stiffness: 160 } });
  const gateOpacity = interpolate(gateEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const gateScale = interpolate(gateEnter, [0, 1], [0.4, 1], { extrapolateRight: "clamp" });

  const logEnter = spring({ frame: frame - 160, fps, config: { damping: 16, stiffness: 100 } });
  const logOpacity = interpolate(logEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const logY = interpolate(logEnter, [0, 1], [24, 0], { extrapolateRight: "clamp" });

  const warehouse = { x: 22, y: 30 };
  const customer = { x: 64, y: 70 };
  const midX = warehouse.x + (customer.x - warehouse.x) * routeProgress;
  const midY = warehouse.y + (customer.y - warehouse.y) * routeProgress;

  return (
    <AbsoluteFill style={{ background: "#06070a" }}>
      <RadarBackground tint="#ef4444" />

      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <line
          x1={warehouse.x}
          y1={warehouse.y}
          x2={midX}
          y2={midY}
          stroke="#ef4444"
          strokeWidth={0.6}
          strokeDasharray="2,1.5"
          opacity={interpolate(frame, [10, 25], [0, 0.9], { extrapolateRight: "clamp" })}
        />
      </svg>

      <MapPin xPct={warehouse.x} yPct={warehouse.y} color="#888" label="Warehouse" opacity={interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" })} />
      <MapPin xPct={customer.x} yPct={customer.y} color="#ef4444" label="Rahul M." opacity={interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" })} pulse />

      <div
        style={{
          position: "absolute",
          left: `${midX}%`,
          top: `${midY}%`,
          transform: `translate(-50%, -50%) scale(${gateScale})`,
          opacity: gateOpacity,
          background: "#ef4444",
          borderRadius: 10,
          padding: "10px 16px",
          fontFamily: "sans-serif",
          fontSize: 26,
        }}
      >
        ⛔
      </div>

      <div style={{ position: "absolute", left: 44, right: 44, top: 110, display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" }),
            background: "#111",
            border: "1.5px solid #ef444455",
            borderLeft: "5px solid #ef4444",
            borderRadius: 12,
            padding: "20px 24px",
          }}
        >
          <div style={{ fontFamily: "sans-serif", fontSize: 24, fontWeight: 900, color: "#fff" }}>
            #SHPFY-4821 · Rahul M.
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 20, color: "#999", marginTop: 6 }}>
            ₹3,200 · COD · fulfillment_hold: high_risk_of_fraud
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", left: 44, right: 44, bottom: 460 }}>
        <EventLogCard
          direction="out"
          channel="WhatsApp"
          accent="#ef4444"
          time="now"
          opacity={logOpacity}
          y={logY}
          text="Hi Rahul, we're preparing your order #SHPFY-4821 (₹3,200). Reply YES to confirm or NO to cancel."
        />
      </div>

      <Caption
        text="High-risk order? Fulfillment is paused instantly at the gate. Meanwhile — the customer gets a WhatsApp ping."
        delay={150}
        accent="#ef4444"
      />
    </AbsoluteFill>
  );
};
