import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

/**
 * A premium phone chassis with a subtle perspective tilt + idle float, so the
 * product mock reads as a real device sitting in the world rather than a flat
 * card. `tiltX`/`tiltY` let the parent lean it toward the camera; a small
 * frame-driven drift keeps it alive.
 */
export const DeviceFrame: React.FC<{
  width?: number;
  height?: number;
  tiltX?: number;
  tiltY?: number;
  contact?: { name: string; status: string };
  children: React.ReactNode;
}> = ({ width = 320, height = 660, tiltX = 0, tiltY = 0, contact, children }) => {
  const frame = useCurrentFrame();

  // Gentle living idle — a slow lean and float.
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
          background: "#EFEAE2",
          border: "10px solid #15151a",
          borderRadius: 44,
          boxShadow: "0 40px 90px rgba(0,0,0,0.14), 0 6px 18px rgba(0,0,0,0.06)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: "absolute",
            top: 6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 104,
            height: 18,
            background: "#15151a",
            borderRadius: 10,
            zIndex: 50,
          }}
        />

        {/* Status bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 24px 6px",
            fontSize: 10,
            color: "#15151a",
            fontWeight: 700,
            zIndex: 10,
          }}
        >
          <span>9:41</span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span>5G</span>
            <div style={{ width: 14, height: 8, border: "1px solid #15151a", borderRadius: 2, padding: 1 }}>
              <div style={{ width: "100%", height: "100%", background: "#15151a" }} />
            </div>
          </div>
        </div>

        {/* Optional WhatsApp-style header */}
        {contact && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              background: COLORS.bgRaised,
              borderBottom: `1px solid ${COLORS.line}`,
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: COLORS.accentDeep,
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
              <div style={{ fontSize: 9, color: COLORS.accentDeep, fontWeight: 600 }}>{contact.status}</div>
            </div>
          </div>
        )}

        {/* Chat / content area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: 16, overflow: "hidden" }}>
          {children}
        </div>
      </div>
    </div>
  );
};
