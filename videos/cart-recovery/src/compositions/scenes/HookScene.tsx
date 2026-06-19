import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";

// Full-screen Shopify checkout mockup — no phone wrapper, all text at canvas scale
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const screenEnter = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 80 } });
  const screenOpacity = interpolate(screenEnter, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const screenY = interpolate(screenEnter, [0, 1], [40, 0], { extrapolateRight: "clamp" });

  const amountOpacity = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: "clamp" });

  const cartPulse = spring({ frame: frame - 30, fps, config: { damping: 8, stiffness: 60 } });
  const cartScale = interpolate(cartPulse, [0, 1], [0.92, 1], { extrapolateRight: "clamp" });

  const items = [
    { name: "Linen Blazer – Beige", price: "₹1,200", color: "#d4c4a8" },
    { name: "Slim Trouser – Navy", price: "₹800", color: "#2c3e6b" },
    { name: "Cotton Shirt – White", price: "₹400", color: "#e4e4e4" },
  ];

  return (
    <AbsoluteFill style={{ background: "#f0f0f0" }}>
      {/* Full-screen checkout UI */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
          opacity: screenOpacity,
          transform: `translateY(${screenY}px)`,
        }}
      >
        {/* Status bar */}
        <div style={{ background: "#fff", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
          <span style={{ fontFamily: "sans-serif", fontSize: 26, fontWeight: 700, color: "#111" }}>9:41</span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 28, height: 16, borderRadius: 3, border: "2px solid #111", position: "relative" }}>
              <div style={{ position: "absolute", left: 2, top: 2, bottom: 2, width: "70%", background: "#111", borderRadius: 1 }} />
            </div>
          </div>
        </div>

        {/* Checkout header */}
        <div
          style={{
            background: "#fff",
            borderBottom: "1.5px solid #e8e8e8",
            padding: "28px 44px 24px",
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div style={{ fontSize: 40, color: "#555" }}>←</div>
          <div>
            <div style={{ fontFamily: "sans-serif", fontSize: 40, fontWeight: 900, color: "#111" }}>Checkout</div>
            <div style={{ fontFamily: "sans-serif", fontSize: 26, color: "#888", marginTop: 2 }}>3 items in your bag</div>
          </div>
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, padding: "24px 36px", display: "flex", flexDirection: "column", gap: 18 }}>
          {items.map((item, i) => (
            <div
              key={item.name}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "24px 28px",
                display: "flex",
                alignItems: "center",
                gap: 24,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                opacity: interpolate(frame, [8 + i * 10, 26 + i * 10], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `translateX(${interpolate(frame, [8 + i * 10, 26 + i * 10], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 12,
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "sans-serif", fontSize: 34, fontWeight: 700, color: "#111", lineHeight: 1.25 }}>
                  {item.name}
                </div>
                <div style={{ fontFamily: "sans-serif", fontSize: 30, color: "#888", marginTop: 8, fontWeight: 600 }}>
                  {item.price}
                </div>
              </div>
              <div style={{ fontFamily: "sans-serif", fontSize: 34, color: "#ccc" }}>›</div>
            </div>
          ))}
        </div>

        {/* Total + button */}
        <div
          style={{
            background: "#fff",
            borderTop: "1.5px solid #e8e8e8",
            padding: "28px 40px 290px",
            opacity: amountOpacity,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "sans-serif",
              fontSize: 36,
              fontWeight: 800,
              color: "#111",
              marginBottom: 24,
            }}
          >
            <span>Total</span>
            <span>₹2,400</span>
          </div>
          <div
            style={{
              background: "#111",
              borderRadius: 16,
              padding: "28px",
              textAlign: "center",
              fontFamily: "sans-serif",
              fontSize: 32,
              fontWeight: 800,
              color: "#fff",
              transform: `scale(${cartScale})`,
            }}
          >
            Place Order
          </div>
        </div>
      </div>

      {/* Abandoned — red pulse dot overlay */}
      <div
        style={{
          position: "absolute",
          top: 220,
          right: 50,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(0,0,0,0.75)",
          borderRadius: 40,
          padding: "10px 22px",
          opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#ef4444",
            opacity: interpolate(frame % 30, [0, 15, 30], [1, 0.25, 1], { extrapolateRight: "clamp" }),
          }}
        />
        <span style={{ fontFamily: "sans-serif", fontSize: 22, fontWeight: 700, color: "#fff" }}>ABANDONED</span>
      </div>

      <Caption text="₹2,400 worth of products. Cart abandoned. Most brands just watch it die." delay={15} />
    </AbsoluteFill>
  );
};
