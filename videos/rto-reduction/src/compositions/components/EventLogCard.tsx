import React from "react";

// Terminal-style event entry — the control-tower equivalent of a chat bubble,
// used wherever the old template showed a WhatsApp message screen.
interface EventLogCardProps {
  direction: "out" | "in" | "system";
  channel: string;
  text: string;
  time?: string;
  accent?: string;
  opacity: number;
  y?: number;
}

export const EventLogCard: React.FC<EventLogCardProps> = ({ direction, channel, text, time, accent = "#25D366", opacity, y = 0 }) => {
  const arrow = direction === "out" ? "→" : direction === "in" ? "←" : "•";
  const dirLabel = direction === "out" ? "OUTBOUND" : direction === "in" ? "INBOUND" : "SYSTEM";

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        background: "#111",
        border: "1px solid #1e1e1e",
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        padding: "20px 24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: "sans-serif", fontSize: 18, fontWeight: 900, color: accent, letterSpacing: "1px" }}>
          {arrow} {dirLabel}
        </span>
        <span style={{ fontFamily: "sans-serif", fontSize: 18, color: "#555" }}>· {channel}</span>
        {time && <span style={{ fontFamily: "sans-serif", fontSize: 16, color: "#444", marginLeft: "auto" }}>{time}</span>}
      </div>
      <div style={{ fontFamily: "sans-serif", fontSize: 26, color: "#e5e5e5", lineHeight: 1.45 }}>{text}</div>
    </div>
  );
};
