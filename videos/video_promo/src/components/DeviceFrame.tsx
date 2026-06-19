import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

export const DeviceFrame: React.FC<{
  width?: number;
  height?: number;
  tiltX?: number;
  tiltY?: number;
  contact?: { name: string; status: string };
  children: React.ReactNode;
}> = ({ width = 320, height = 660, tiltX = 0, tiltY = 0, contact, children }) => {
  const frame = useCurrentFrame();

  // Gentle floating and tilting movement to keep the visual alive
  const driftX = Math.sin(frame / 48) * 1.2;
  const driftY = Math.cos(frame / 60) * 1.2;
  const floatY = Math.sin(frame / 40) * 5;

  return (
    <div style={{ perspective: 1600 }}>
      <div
        style={{
          width,
          height,
          transform: `translateY(${floatY}px) rotateX(${tiltX + driftY}deg) rotateY(${tiltY + driftX}deg)`,
          transformStyle: "preserve-3d",
          background: COLORS.bgRaised,
          border: `2px solid ${COLORS.ink}`, // Sharp strict border
          borderRadius: 32, // Phone physical curve
          boxShadow: `16px 16px 0px 0px ${COLORS.lineStrong}`, // Harsh structural shadow
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Phone Notch */}
        <div
          style={{
            position: "absolute",
            top: 6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 104,
            height: 18,
            background: COLORS.ink,
            borderRadius: 10,
            zIndex: 50,
          }}
        />

        {/* Status Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 24px 6px",
            fontSize: 10,
            color: COLORS.ink,
            fontWeight: 700,
            zIndex: 10,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <span>9:41</span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span>5G</span>
            <div style={{ width: 14, height: 8, border: `1px solid ${COLORS.ink}`, borderRadius: 2, padding: 1 }}>
              <div style={{ width: "100%", height: "100%", background: COLORS.ink }} />
            </div>
          </div>
        </div>

        {/* WhatsApp Chat Header */}
        {contact && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              background: COLORS.bgRaised,
              borderBottom: `1px solid ${COLORS.lineStrong}`,
              zIndex: 10,
              fontFamily: "Inter, sans-serif",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 0, // Sharp square avatar
                background: COLORS.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color: COLORS.bgRaised,
                fontWeight: 700,
              }}
            >
              {contact.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>{contact.name}</div>
              <div style={{ fontSize: 9, color: COLORS.accent, fontWeight: 600, letterSpacing: "0.05em" }}>{contact.status.toUpperCase()}</div>
            </div>
          </div>
        )}

        {/* Inner Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: 16, overflow: "hidden", position: "relative" }}>
          {children}
        </div>
      </div>
    </div>
  );
};
