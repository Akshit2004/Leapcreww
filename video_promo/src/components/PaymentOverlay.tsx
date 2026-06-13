import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, fontFamilyMono } from "../theme";
import { CreditCard, CheckCircle, ShieldCheck } from "lucide-react";

export const PaymentOverlay: React.FC<{
  startFrame: number;
}> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = frame - startFrame;

  // Slide up card spring
  const slideSpring = spring({
    frame: elapsed,
    fps,
    config: { damping: 15, stiffness: 100 },
    durationInFrames: 20,
  });
  const y = interpolate(slideSpring, [0, 1], [400, 0]);

  // Loading state (frames 20 to 60 of the scene)
  const isProcessing = elapsed >= 20 && elapsed < 60;
  // Success state (frames 60+ of the scene)
  const isSuccess = elapsed >= 60;

  // Spin rotation for loader
  const spin = interpolate(elapsed, [20, 60], [0, 1080], {
    extrapolateRight: "extend",
  });

  // Success check scale spring
  const checkSpring = spring({
    frame: elapsed - 60,
    fps,
    config: { damping: 10, stiffness: 120 },
    durationInFrames: 15,
  });
  const checkScale = interpolate(checkSpring, [0, 1], [0.3, 1]);
  const checkOpacity = interpolate(checkSpring, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        left: -2,
        right: -2,
        bottom: -2,
        background: COLORS.bgRaised,
        borderTop: `2px solid ${COLORS.ink}`,
        borderLeft: `2px solid ${COLORS.ink}`,
        borderRight: `2px solid ${COLORS.ink}`,
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: "Inter, sans-serif",
        zIndex: 100,
        transform: `translateY(${y}px)`,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={16} color={COLORS.ink} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: COLORS.ink, fontFamily: fontFamilyMono }}>
            SECURE PAYMENT
          </span>
        </div>
        <span style={{ fontSize: 10, color: COLORS.dim, fontWeight: 700, fontFamily: fontFamilyMono }}>RAZORPAY_SECURE</span>
      </div>

      <div style={{ borderBottom: `2px solid ${COLORS.ink}` }} />

      {!isSuccess ? (
        <>
          {/* Bill summary */}
          <div>
            <div style={{ fontSize: 11, color: COLORS.dim, fontWeight: 700, fontFamily: fontFamilyMono }}>CONSULTATION FEE</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.ink, marginTop: 4, letterSpacing: "-0.02em" }}>
              ₹100
            </div>
            <div style={{ fontSize: 12, color: COLORS.dim, marginTop: 2, fontWeight: 500 }}>
              Dr. Sharma (Cardiology)
            </div>
          </div>

          <div style={{ borderBottom: `2px solid ${COLORS.ink}` }} />

          {/* Payment Method Option */}
          <div
            style={{
              border: `2px solid ${COLORS.ink}`,
              background: COLORS.bg,
              padding: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CreditCard size={18} color={COLORS.ink} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink }}>UPI / Card Payment</div>
                <div style={{ fontSize: 10, color: COLORS.dim }}>Instant confirmation</div>
              </div>
            </div>
            <div style={{ width: 14, height: 14, border: `2px solid ${COLORS.ink}`, padding: 2, display: "flex", borderRadius: 0 }}>
              <div style={{ width: "100%", height: "100%", background: COLORS.ink }} />
            </div>
          </div>

          {/* Button or Spinner */}
          {isProcessing ? (
            <div
              style={{
                background: COLORS.bg,
                color: COLORS.ink,
                border: `2px solid ${COLORS.ink}`,
                padding: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                fontWeight: 700,
                fontSize: 13,
                fontFamily: fontFamilyMono,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: `2px solid ${COLORS.ink}`,
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  transform: `rotate(${spin}deg)`,
                }}
              />
              <span>PROCESSING...</span>
            </div>
          ) : (
            <div
              style={{
                background: COLORS.ink,
                color: COLORS.bgRaised,
                padding: "12px",
                textAlign: "center",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: fontFamilyMono,
                letterSpacing: "0.05em",
              }}
            >
              PAY_NOW [₹100]
            </div>
          )}
        </>
      ) : (
        /* Success Screen */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 0",
            gap: 12,
            transform: `scale(${checkScale})`,
            opacity: checkOpacity,
          }}
        >
          <CheckCircle size={48} color={COLORS.accent} style={{ strokeWidth: 2 }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.ink, letterSpacing: "-0.02em" }}>
              ₹100 PAID SUCCESSFULLY
            </div>
            <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 4, letterSpacing: "0.02em", fontFamily: fontFamilyMono }}>
              TXN_ID: TXN_LC90812903
            </div>
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 10,
              fontWeight: 700,
              color: COLORS.bgRaised,
              background: COLORS.accent,
              padding: "4px 12px",
              fontFamily: fontFamilyMono,
            }}
          >
            CONFIRMED
          </div>
        </div>
      )}
    </div>
  );
};
