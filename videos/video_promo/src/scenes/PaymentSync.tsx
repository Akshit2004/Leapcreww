import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import { COLORS, fontFamily, fontFamilyMono } from "../theme";
import { DeviceFrame } from "../components/DeviceFrame";
import { PaymentOverlay } from "../components/PaymentOverlay";
import { DashboardFrame } from "../components/DashboardFrame";

export const PaymentSync: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera animation: from close-up on phone to wide split screen (phone on left, desktop on right)
  const cameraSpring = spring({
    frame: frame - 60, // starts panning after payment completes at frame 60
    fps,
    config: { damping: 20, mass: 1, stiffness: 100 },
    durationInFrames: 30,
  });

  const phoneX = interpolate(cameraSpring, [0, 1], [-280, -420]);
  const phoneScale = interpolate(cameraSpring, [0, 1], [1, 0.78]);
  const phoneTiltX = interpolate(cameraSpring, [0, 1], [12, 5]);
  const phoneTiltY = interpolate(cameraSpring, [0, 1], [-8, 15]);

  const dashX = interpolate(cameraSpring, [0, 1], [1200, 120]);
  const dashScale = interpolate(cameraSpring, [0, 1], [0.65, 0.82]);
  const dashOpacity = interpolate(cameraSpring, [0, 1], [0, 1]);

  // Dash dynamic sync row pop-in
  const syncProgress = spring({
    frame: frame - 80, // row animates in after the pan begins
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 125 },
    durationInFrames: 18,
  });

  const syncHeight = interpolate(syncProgress, [0, 1], [0, 48]);
  const syncOpacity = interpolate(syncProgress, [0, 1], [0, 1]);
  const syncBg = interpolate(syncProgress, [0, 0.5, 1], [0, 1, 0]); // flashes blue then fades to default row bg

  const syncRowBgColor = syncBg > 0 
    ? `rgba(0, 85, 255, ${interpolate(syncBg, [0, 1], [0, 0.12])})` 
    : COLORS.bgRaised;

  return (
    <AbsoluteFill style={{ fontFamily, backgroundColor: "transparent" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        
        {/* Mobile Phone (showing payment success) */}
        <div
          style={{
            transform: `translateX(${phoneX}px) scale(${phoneScale})`,
            position: "absolute",
            zIndex: 10,
          }}
        >
          <DeviceFrame
            width={340}
            height={680}
            tiltX={phoneTiltX}
            tiltY={phoneTiltY}
            contact={{ name: "City Care Appointments", status: "Payment Gateway" }}
          >
            {/* Background WhatsApp screen */}
            <div style={{ flex: 1, background: COLORS.bg, opacity: 0.8 }} />
            
            {/* Sliding payment overlay */}
            <PaymentOverlay startFrame={0} />
          </DeviceFrame>
        </div>

        {/* Desktop CRM/Dashboard Frame (sliding from right) */}
        <div
          style={{
            transform: `translateX(${dashX}px) scale(${dashScale})`,
            opacity: dashOpacity,
            position: "absolute",
            transformOrigin: "left center",
          }}
        >
          <DashboardFrame width={840} height={480}>
            {/* Title description inside dashboard */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: COLORS.ink, letterSpacing: "-0.02em" }}>
                  Active Appointments
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 10, color: COLORS.ink, fontWeight: 700, fontFamily: fontFamilyMono, letterSpacing: "0.05em" }}>
                  REALTIME SYNCHRONIZATION WITH CLINIC WAITING LIST
                </p>
              </div>
              <div style={{ background: COLORS.accent, color: COLORS.bgRaised, fontSize: 10, fontWeight: 700, padding: "4px 10px", fontFamily: fontFamilyMono, border: `2px solid ${COLORS.ink}` }}>
                [CONNECTED]
              </div>
            </div>

            {/* Appointment Table */}
            <div style={{ flex: 1, border: `2px solid ${COLORS.ink}`, borderRadius: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {/* Table Header */}
              <div
                style={{
                  display: "flex",
                  background: COLORS.bg,
                  borderBottom: `2px solid ${COLORS.ink}`,
                  padding: "10px 16px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: COLORS.ink,
                  fontFamily: fontFamilyMono,
                  letterSpacing: "0.05em",
                }}
              >
                <div style={{ width: "15%" }}>TIME</div>
                <div style={{ width: "25%" }}>PATIENT</div>
                <div style={{ width: "20%" }}>SPECIALTY</div>
                <div style={{ width: "20%" }}>DOCTOR</div>
                <div style={{ width: "20%", textAlign: "right" }}>STATUS</div>
              </div>

              {/* Table Rows */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Synced dynamic row (Gaurav Jiju) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: syncHeight,
                    opacity: syncOpacity,
                    padding: syncHeight > 0 ? "0 16px" : 0,
                    background: syncRowBgColor,
                    borderBottom: syncHeight > 0 ? `1px solid ${COLORS.lineStrong}` : "none",
                    fontSize: 11,
                    fontWeight: 700,
                    color: COLORS.ink,
                    overflow: "hidden",
                    willChange: "height, opacity, background",
                  }}
                >
                  <div style={{ width: "15%", fontFamily: fontFamilyMono }}>10:00 AM</div>
                  <div style={{ width: "25%" }}>Gaurav Jiju</div>
                  <div style={{ width: "20%", color: COLORS.accent }}>Cardiology</div>
                  <div style={{ width: "20%" }}>Dr. Sharma</div>
                  <div style={{ width: "20%", display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 9, background: COLORS.accent, color: COLORS.bgRaised, padding: "2px 8px", fontWeight: 700, fontFamily: fontFamilyMono }}>
                      PAID & CONFIRMED
                    </span>
                  </div>
                </div>

                {/* Patient 1 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: 48,
                    padding: "0 16px",
                    borderBottom: `1px solid ${COLORS.lineStrong}`,
                    fontSize: 11,
                    color: COLORS.ink,
                    fontWeight: 500,
                  }}
                >
                  <div style={{ width: "15%", fontFamily: fontFamilyMono }}>09:30 AM</div>
                  <div style={{ width: "25%" }}>Rohan Gupta</div>
                  <div style={{ width: "20%", color: COLORS.dim }}>Pediatrics</div>
                  <div style={{ width: "20%" }}>Dr. Verma</div>
                  <div style={{ width: "20%", display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 9, background: COLORS.ink, color: COLORS.bgRaised, padding: "2px 8px", fontWeight: 700, fontFamily: fontFamilyMono }}>
                      PAID
                    </span>
                  </div>
                </div>

                {/* Patient 2 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: 48,
                    padding: "0 16px",
                    borderBottom: `1px solid ${COLORS.lineStrong}`,
                    fontSize: 11,
                    color: COLORS.ink,
                    fontWeight: 500,
                  }}
                >
                  <div style={{ width: "15%", fontFamily: fontFamilyMono }}>09:45 AM</div>
                  <div style={{ width: "25%" }}>Sunita Sen</div>
                  <div style={{ width: "20%", color: COLORS.dim }}>General Medicine</div>
                  <div style={{ width: "20%" }}>Dr. Patel</div>
                  <div style={{ width: "20%", display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 9, background: COLORS.ink, color: COLORS.bgRaised, padding: "2px 8px", fontWeight: 700, fontFamily: fontFamilyMono }}>
                      PAID
                    </span>
                  </div>
                </div>

                {/* Patient 3 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: 48,
                    padding: "0 16px",
                    fontSize: 11,
                    color: COLORS.ink,
                    fontWeight: 500,
                  }}
                >
                  <div style={{ width: "15%", fontFamily: fontFamilyMono }}>10:15 AM</div>
                  <div style={{ width: "25%" }}>Vikram Malhotra</div>
                  <div style={{ width: "20%", color: COLORS.dim }}>Orthopedics</div>
                  <div style={{ width: "20%" }}>Dr. Joshi</div>
                  <div style={{ width: "20%", display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 9, background: COLORS.bg, border: `1px solid ${COLORS.ink}`, color: COLORS.dim, padding: "2px 8px", fontWeight: 700, fontFamily: fontFamilyMono }}>
                      PENDING
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </DashboardFrame>
        </div>

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
