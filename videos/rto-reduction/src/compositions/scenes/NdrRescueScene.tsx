import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";
import { RadarBackground, MapPin } from "../components/RadarBackground";
import { EventLogCard } from "../components/EventLogCard";

// 1:02–1:12 | 10 seconds = 300 frames — failed attempt marker on the route, AI reads the Hinglish reply, route reschedules
export const NdrRescueScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bannerOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  const inLogEnter = spring({ frame: frame - 50, fps, config: { damping: 16, stiffness: 130 } });
  const inLogOpacity = interpolate(inLogEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const inLogY = interpolate(inLogEnter, [0, 1], [24, 0], { extrapolateRight: "clamp" });

  const aiEnter = spring({ frame: frame - 110, fps, config: { damping: 14, stiffness: 110 } });
  const aiOpacity = interpolate(aiEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const aiY = interpolate(aiEnter, [0, 1], [24, 0], { extrapolateRight: "clamp" });

  const tagEnter = spring({ frame: frame - 170, fps, config: { damping: 10, stiffness: 160 } });
  const tagScale = interpolate(tagEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const tagOpacity = interpolate(tagEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const routeEnter = spring({ frame: frame - 220, fps, config: { damping: 14, stiffness: 100 } });
  const rerouteOpacity = interpolate(routeEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const courier = { x: 22, y: 30 };
  const customer = { x: 64, y: 70 };

  return (
    <AbsoluteFill style={{ background: "#06070a" }}>
      <RadarBackground tint="#ef4444" />

      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1={courier.x} y1={courier.y} x2={customer.x} y2={customer.y} stroke="#ef4444" strokeWidth={0.5} strokeDasharray="2,1.5" opacity={0.6} />
        {routeEnter > 0 && (
          <line
            x1={courier.x}
            y1={courier.y}
            x2={courier.x + (customer.x - courier.x) * Math.min(routeEnter, 1)}
            y2={courier.y + (customer.y - courier.y) * Math.min(routeEnter, 1)}
            stroke="#25D366"
            strokeWidth={0.6}
            opacity={rerouteOpacity}
          />
        )}
      </svg>

      <MapPin xPct={courier.x} yPct={courier.y} color="#888" label="Warehouse" opacity={1} />
      <MapPin xPct={customer.x} yPct={customer.y} color="#ef4444" label="Rahul M." opacity={1} />

      <div
        style={{
          position: "absolute",
          left: `${(courier.x + customer.x) / 2}%`,
          top: `${(courier.y + customer.y) / 2}%`,
          transform: "translate(-50%, -50%)",
          fontSize: 30,
        }}
      >
        ✕
      </div>

      <div style={{ position: "absolute", top: 90, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: bannerOpacity }}>
        <div
          style={{
            background: "rgba(0,0,0,0.82)",
            border: "1.5px solid #ef4444",
            borderRadius: 60,
            padding: "14px 36px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#ef4444" }} />
          <span style={{ fontFamily: "sans-serif", fontSize: 24, fontWeight: 800, color: "#ef4444", letterSpacing: "1px" }}>
            DELIVERY ATTEMPT FAILED · NDR
          </span>
        </div>
      </div>

      <div style={{ position: "absolute", left: 44, right: 44, top: 180 }}>
        <EventLogCard
          direction="in"
          channel="WhatsApp"
          accent="#25D366"
          opacity={inLogOpacity}
          y={inLogY}
          text={'"Kal subah aana" — Rahul M. replies'}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 44,
          right: 44,
          top: 320,
          opacity: aiOpacity,
          transform: `translateY(${aiY}px)`,
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: 16,
          padding: "24px 26px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 26 }}>🤖</span>
          <span style={{ fontFamily: "sans-serif", fontSize: 22, fontWeight: 800, color: "#bbb" }}>AI Intent Analyst</span>
        </div>
        <div style={{ fontFamily: "sans-serif", fontSize: 22, color: "#888", marginBottom: 14 }}>Reading reply in Hinglish...</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: "sans-serif", fontSize: 24, color: "#ccc" }}>Intent →</span>
          <div
            style={{
              opacity: tagOpacity,
              transform: `scale(${tagScale})`,
              background: "#25D366",
              borderRadius: 10,
              padding: "8px 20px",
              fontFamily: "sans-serif",
              fontSize: 24,
              fontWeight: 900,
              color: "#fff",
            }}
          >
            RESCHEDULE
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", left: 44, right: 44, bottom: 460, opacity: rerouteOpacity }}>
        <EventLogCard
          direction="out"
          channel="Logistics"
          accent="#25D366"
          text="✅ Re-attempt scheduled — tomorrow AM. Courier route updated automatically."
          opacity={1}
        />
      </div>

      <Caption
        text="Delivery failed? Our AI reads the reply — even in Hinglish. 'Kal subah aana' means reschedule. It understands that."
        delay={15}
      />
    </AbsoluteFill>
  );
};
