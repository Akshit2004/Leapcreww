import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";
import { RadarBackground, MapPin } from "../components/RadarBackground";
import { EventLogCard } from "../components/EventLogCard";

// 0:52–1:02 | 10 seconds = 300 frames — pin gets corrected and re-geocoded, Shopify auto-updates
export const AddressFixScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const outLogOpacity = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });

  const inLogEnter = spring({ frame: frame - 70, fps, config: { damping: 16, stiffness: 120 } });
  const inLogOpacity = interpolate(inLogEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const inLogY = interpolate(inLogEnter, [0, 1], [24, 0], { extrapolateRight: "clamp" });

  // Pin nudges to its corrected position as the address re-geocodes
  const shiftProgress = interpolate(frame, [140, 175], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pinX = 50 + shiftProgress * 6;
  const pinY = 56 - shiftProgress * 4;

  const updateEnter = spring({ frame: frame - 175, fps, config: { damping: 13, stiffness: 110 } });
  const updateOpacity = interpolate(updateEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const updateY = interpolate(updateEnter, [0, 1], [30, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#06070a" }}>
      <RadarBackground tint="#25D366" />

      <MapPin xPct={pinX} yPct={pinY} color={shiftProgress > 0.5 ? "#25D366" : "#f59e0b"} label="Rahul M." opacity={1} pulse={shiftProgress > 0.5} />

      <div style={{ position: "absolute", left: 44, right: 44, top: 110, display: "flex", flexDirection: "column", gap: 16 }}>
        <EventLogCard
          direction="out"
          channel="WhatsApp"
          accent="#f59e0b"
          time="now"
          opacity={outLogOpacity}
          text="📍 Quick check before we ship — is this address correct? 42 MG Road, Sector 14, Gurugram, HR 122001"
        />
      </div>

      <div style={{ position: "absolute", left: 44, right: 44, top: 330 }}>
        <EventLogCard
          direction="in"
          channel="WhatsApp"
          accent="#25D366"
          opacity={inLogOpacity}
          y={inLogY}
          text={"No it's wrong! Correct one: 42 MG Road, Tower B, Flat 304, Sector 14, Gurugram, HR 122001"}
        />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 460,
          left: 44,
          right: 44,
          opacity: updateOpacity,
          transform: `translateY(${updateY}px)`,
          background: "#111",
          border: "1.5px solid #25D36655",
          borderLeft: "5px solid #25D366",
          borderRadius: 12,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 28 }}>🟢</span>
        <div>
          <div style={{ fontFamily: "sans-serif", fontSize: 22, fontWeight: 800, color: "#25D366" }}>
            Shopify · Shipping address updated &amp; re-geocoded
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 19, color: "#888", marginTop: 4 }}>
            #SHPFY-4821 · no manual intervention
          </div>
        </div>
      </div>

      <Caption
        text="Before dispatch — we also ping the address. Customer corrects it, we update Shopify automatically. No manual work."
        delay={15}
      />
    </AbsoluteFill>
  );
};
