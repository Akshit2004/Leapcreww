import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";
import { RadarBackground, MapPin } from "../components/RadarBackground";
import { EventLogCard } from "../components/EventLogCard";

// 0:32–0:42 | 10 seconds = 300 frames — customer replies YES, the gate opens, the route resumes
export const CodConfirmScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inLogOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  const gateEnter = spring({ frame: frame - 60, fps, config: { damping: 12, stiffness: 150 } });
  const gateScale = interpolate(gateEnter, [0, 1], [1, 0], { extrapolateRight: "clamp" });
  const gateOpacity = interpolate(gateEnter, [0, 1], [1, 0], { extrapolateRight: "clamp" });

  const routeProgress = interpolate(frame, [70, 170], [0.55, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const outLogEnter = spring({ frame: frame - 130, fps, config: { damping: 16, stiffness: 100 } });
  const outLogOpacity = interpolate(outLogEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const outLogY = interpolate(outLogEnter, [0, 1], [24, 0], { extrapolateRight: "clamp" });

  const warehouse = { x: 22, y: 30 };
  const customer = { x: 64, y: 70 };
  const tipX = warehouse.x + (customer.x - warehouse.x) * routeProgress;
  const tipY = warehouse.y + (customer.y - warehouse.y) * routeProgress;

  return (
    <AbsoluteFill style={{ background: "#06070a" }}>
      <RadarBackground tint="#25D366" />

      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1={warehouse.x} y1={warehouse.y} x2={tipX} y2={tipY} stroke="#25D366" strokeWidth={0.6} strokeDasharray="2,1.5" />
      </svg>

      <MapPin xPct={warehouse.x} yPct={warehouse.y} color="#888" label="Warehouse" opacity={1} />
      <MapPin xPct={customer.x} yPct={customer.y} color="#25D366" label="Rahul M." opacity={1} pulse={frame > 170} />

      <div
        style={{
          position: "absolute",
          left: `${warehouse.x + (customer.x - warehouse.x) * 0.55}%`,
          top: `${warehouse.y + (customer.y - warehouse.y) * 0.55}%`,
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
        <EventLogCard
          direction="in"
          channel="WhatsApp"
          accent="#25D366"
          time="now"
          opacity={inLogOpacity}
          text={'"YES" — Rahul M. confirms order #SHPFY-4821'}
        />
      </div>

      <div style={{ position: "absolute", left: 44, right: 44, bottom: 460 }}>
        <EventLogCard
          direction="out"
          channel="Shopify"
          accent="#25D366"
          opacity={outLogOpacity}
          y={outLogY}
          text="✅ Fulfillment hold released — order #SHPFY-4821 moving to packing. Tracking link to follow."
        />
      </div>

      <Caption
        text="Customer replies YES — the gate opens automatically. Order ships. Real buyer confirmed."
        delay={15}
      />
    </AbsoluteFill>
  );
};
