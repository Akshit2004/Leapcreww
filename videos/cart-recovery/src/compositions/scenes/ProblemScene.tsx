import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";

// Full-screen email inbox — no phone frame
export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const emails = [
    { from: "Nykaa", subject: "Your wishlist is waiting! 🛍️", time: "2d ago", read: false },
    { from: "Myntra", subject: "Flash sale ends tonight — 70% off", time: "2d ago", read: false },
    { from: "Ajio", subject: "You left something behind...", time: "3d ago", read: false },
    { from: "Flipkart", subject: "Complete your purchase now", time: "3d ago", read: false },
    { from: "Amazon", subject: "Items in your cart are selling fast", time: "4d ago", read: true },
    { from: "Bewakoof", subject: "Don't miss out on your cart!", time: "5d ago", read: true },
  ];

  const xMark = spring({ frame: frame - 80, fps, config: { damping: 12, stiffness: 160 } });
  const xScale = interpolate(xMark, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const xOpacity = interpolate(xMark, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#0f0f0f", flexDirection: "column" }}>
      {/* Email header bar */}
      <div
        style={{
          background: "#1a1a1a",
          padding: "80px 50px 28px",
          borderBottom: "1px solid #2a2a2a",
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ fontSize: 46 }}>📧</div>
        <span style={{ fontFamily: "sans-serif", fontSize: 42, fontWeight: 800, color: "#fff" }}>Inbox</span>
        <div
          style={{
            marginLeft: "auto",
            background: "#ef4444",
            borderRadius: 30,
            padding: "8px 24px",
            fontSize: 26,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          {emails.filter((e) => !e.read).length} unread
        </div>
      </div>

      {/* Email rows */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {emails.map((email, i) => (
          <div
            key={email.subject}
            style={{
              padding: "24px 50px",
              borderBottom: "1px solid #1e1e1e",
              display: "flex",
              alignItems: "center",
              gap: 22,
              background: email.read ? "transparent" : "rgba(59,130,246,0.07)",
              opacity: interpolate(frame, [4 + i * 7, 18 + i * 7], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              transform: `translateX(${interpolate(frame, [4 + i * 7, 18 + i * 7], [-30, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}px)`,
            }}
          >
            {/* Unread dot */}
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: email.read ? "transparent" : "#3b82f6",
                flexShrink: 0,
              }}
            />
            {/* Avatar */}
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: email.read ? "#2a2a2a" : "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                color: "#fff",
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {email.from[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 30,
                  fontWeight: email.read ? 500 : 800,
                  color: email.read ? "#555" : "#fff",
                }}
              >
                {email.from}
              </div>
              <div
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 26,
                  color: email.read ? "#444" : "#888",
                  marginTop: 4,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {email.subject}
              </div>
            </div>
            <div style={{ fontFamily: "sans-serif", fontSize: 22, color: "#444", whiteSpace: "nowrap" }}>
              {email.time}
            </div>
          </div>
        ))}
      </div>

      {/* Big ✕ stamp */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${xScale})`,
          opacity: xOpacity,
          fontSize: 260,
          color: "#ef4444",
          fontWeight: 900,
          lineHeight: 1,
          pointerEvents: "none",
        }}
      >
        ✕
      </div>

      <Caption
        text="Email reminders? Ignored. SMS? Blocked. The customer is on WhatsApp — you're not."
        delay={10}
      />
    </AbsoluteFill>
  );
};
