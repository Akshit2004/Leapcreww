import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface WhatsAppBubbleProps {
  message: string;
  delay?: number;
  link?: string;
}

export const WhatsAppBubble: React.FC<WhatsAppBubbleProps> = ({
  message,
  delay = 0,
  link,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entered = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, stiffness: 110 },
  });
  const opacity = interpolate(entered, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(entered, [0, 1], [24, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        maxWidth: "90%",
        alignSelf: "flex-start",
        margin: "10px 16px",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "0px 20px 20px 20px",
          padding: "18px 22px",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: 22,
          color: "#111",
          lineHeight: 1.55,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        {message}
        {link && (
          <div
            style={{
              marginTop: 14,
              padding: "14px 18px",
              background: "#25D366",
              borderRadius: 12,
              color: "#fff",
              fontSize: 20,
              fontWeight: 800,
              textAlign: "center",
            }}
          >
            {link}
          </div>
        )}
        <div
          style={{
            textAlign: "right",
            fontSize: 16,
            color: "#888",
            marginTop: 6,
          }}
        >
          ✓✓
        </div>
      </div>
    </div>
  );
};
