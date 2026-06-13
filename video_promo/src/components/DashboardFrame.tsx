import React from "react";
import { COLORS, fontFamilyMono } from "../theme";

export const DashboardFrame: React.FC<{
  width?: number;
  height?: number;
  title?: string;
  children: React.ReactNode;
}> = ({ width = 840, height = 480, title = "SYS_DASHBOARD // RECEPTION_NODE", children }) => {
  return (
    <div
      style={{
        width,
        height,
        background: COLORS.bgRaised,
        border: `2px solid ${COLORS.ink}`,
        borderRadius: 0, // Sharp strict corners
        boxShadow: `24px 24px 0px 0px ${COLORS.lineStrong}`, // Harsh structural shadow
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Window Title Bar */}
      <div
        style={{
          height: 40,
          background: COLORS.bg,
          borderBottom: `2px solid ${COLORS.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
      >
        {/* Title Text */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: COLORS.ink,
            fontFamily: fontFamilyMono,
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </div>

        {/* Technical Window controls */}
        <div style={{ display: "flex", gap: 8, fontFamily: fontFamilyMono, fontSize: 12, color: COLORS.ink, fontWeight: 700 }}>
          <div style={{ padding: "0 4px", border: `1px solid ${COLORS.ink}`, cursor: "default" }}>_</div>
          <div style={{ padding: "0 4px", border: `1px solid ${COLORS.ink}`, cursor: "default" }}>□</div>
          <div style={{ padding: "0 4px", border: `1px solid ${COLORS.ink}`, cursor: "default" }}>X</div>
        </div>
      </div>

      {/* Main Window Grid */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div
          style={{
            width: 180,
            background: COLORS.bg,
            borderRight: `2px solid ${COLORS.ink}`,
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontFamily: fontFamilyMono, fontSize: 10, fontWeight: 700, color: COLORS.dim, letterSpacing: "0.15em", paddingLeft: 8, marginBottom: 8 }}>
            HEALTH ENGINE
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.bgRaised, background: COLORS.accent, padding: "8px 12px", border: `1px solid ${COLORS.ink}` }}>
            Live Queue
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.ink, padding: "8px 12px", border: `1px solid transparent` }}>
            Doctors List
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.ink, padding: "8px 12px", border: `1px solid transparent` }}>
            Flow Builder
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.ink, padding: "8px 12px", border: `1px solid transparent` }}>
            Integrations
          </div>
        </div>

        {/* Content Pane */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, overflow: "hidden", background: COLORS.bgRaised }}>
          {children}
        </div>
      </div>
    </div>
  );
};
