import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import { COLORS, fontFamily, TYPE } from "../theme";
import { DeviceFrame } from "../components/DeviceFrame";
import { MaskLine } from "../components/Kinetic";

interface ChatMsg {
  sender: "patient" | "bot";
  text: string;
  buttons?: string[];
  activeButton?: number; // index of button tapped by user
  frame: number;
}

const CHAT_FLOW: ChatMsg[] = [
  {
    sender: "patient",
    text: "Hi, need to book a consultation.",
    frame: 20,
  },
  {
    sender: "bot",
    text: "Hi! Welcome to City Care Hospital. Select a department to begin:",
    buttons: ["Cardiology", "Pediatrics", "Medicine"],
    activeButton: 0,
    frame: 55,
  },
  {
    sender: "patient",
    text: "Cardiology",
    frame: 105,
  },
  {
    sender: "bot",
    text: "Available Cardiologists. Select a specialist:",
    buttons: ["Dr. Sharma", "Dr. Verma"],
    activeButton: 0,
    frame: 140,
  },
  {
    sender: "patient",
    text: "Dr. Sharma",
    frame: 190,
  },
  {
    sender: "bot",
    text: "Available Slots for tomorrow. Select a time:",
    buttons: ["10:00 AM", "11:30 AM", "3:00 PM"],
    activeButton: 0,
    frame: 225,
  },
  {
    sender: "patient",
    text: "10:00 AM",
    frame: 275,
  },
  {
    sender: "bot",
    text: "Slot selected: Dr. Sharma at 10:00 AM tomorrow. Click below to pay the ₹100 fee and confirm.",
    buttons: ["Pay Consultation Fee"],
    frame: 310,
  }
];

const Bubble: React.FC<{ msg: ChatMsg; index: number }> = ({ msg, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isPatient = msg.sender === "patient";

  const entry = spring({
    frame: frame - msg.frame,
    fps,
    config: { damping: 15, stiffness: 120 },
    durationInFrames: 15,
  });
  if (entry <= 0) return null;

  const y = interpolate(entry, [0, 1], [24, 0]);
  const opacity = interpolate(entry, [0, 1], [0, 1]);
  const scale = interpolate(entry, [0, 1], [0.92, 1]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isPatient ? "flex-end" : "flex-start",
        transform: `translateY(${y}px) scale(${scale})`,
        opacity,
        marginBottom: 8,
      }}
    >
      {/* Name tag */}
      <span style={{ fontSize: 9, color: COLORS.dim, fontWeight: 700, marginBottom: 4, paddingLeft: 4, paddingRight: 4, fontFamily: "JetBrains Mono, monospace" }}>
        {isPatient ? "PATIENT" : "CITY_CARE_BOT"}
      </span>

      {/* Bubble text */}
      <div
        style={{
          maxWidth: "85%",
          background: isPatient ? COLORS.ink : COLORS.bgRaised,
          color: isPatient ? COLORS.bgRaised : COLORS.ink,
          padding: "12px 14px",
          borderRadius: 0,
          border: isPatient ? "none" : `2px solid ${COLORS.ink}`,
          fontSize: 11,
          lineHeight: 1.4,
          fontWeight: 500,
          boxShadow: "0 2px 8px rgba(0,0,0,0.01)",
        }}
      >
        {msg.text}
      </div>

      {/* Interactive buttons */}
      {msg.buttons && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 8,
            maxWidth: "90%",
          }}
        >
          {msg.buttons.map((btn, btnIdx) => {
            const isTapped = msg.activeButton === btnIdx;
            
            // Animation for buttons appearing slightly after the text bubble
            const btnEntry = spring({
              frame: frame - msg.frame - 8 - btnIdx * 3,
              fps,
              config: { damping: 14, stiffness: 130 },
            });
            if (btnEntry <= 0) return null;
            
            // Tap feedback animation (shrink then expand on click)
            const tapTriggerFrame = msg.frame + 35; // approximate tap frame
            const hasBeenTapped = frame > tapTriggerFrame;
            const clickProgress = spring({
              frame: frame - tapTriggerFrame,
              fps,
              config: { damping: 12, stiffness: 180 },
              durationInFrames: 10,
            });
            
            const btnScale = isTapped && hasBeenTapped
              ? interpolate(clickProgress, [0, 0.5, 1], [1, 0.9, 1.05])
              : 1;

            const btnBg = isTapped && hasBeenTapped ? COLORS.accentDeep : COLORS.bgRaised;
            const btnColor = isTapped && hasBeenTapped ? COLORS.bgRaised : COLORS.accentDeep;
            const btnBorder = isTapped && hasBeenTapped ? "transparent" : `1px solid ${COLORS.accent}`;

            return (
              <div
                key={btn}
                style={{
                  background: btnBg,
                  color: btnColor,
                  border: btnBorder,
                  borderRadius: 0,
                  padding: "8px 14px",
                  fontSize: 10,
                  fontWeight: 700,
                  transform: `scale(${btnEntry * btnScale})`,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  transition: "background 0.1s, color 0.1s",
                }}
              >
                {btn}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const BookingFlow: React.FC = () => {
  const frame = useCurrentFrame();

  // Slide device frame onto the screen
  const entryProgress = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const phoneX = interpolate(entryProgress, [0, 1], [-600, -280]);
  const phoneScale = interpolate(entryProgress, [0, 1], [0.8, 1]);

  // Autoscroll chat logic: shift content up as messages pile up
  const scrollOffset = interpolate(
    frame,
    [100, 120, 185, 205, 270, 290, 310, 330],
    [0, -70, -70, -170, -170, -290, -290, -360],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ fontFamily, backgroundColor: COLORS.bg }}>
      {/* Outer Scene Grid Frame */}
      <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        
        {/* Tilted phone mockup carrying WhatsApp */}
        <div
          style={{
            transform: `translateX(${phoneX}px) scale(${phoneScale})`,
            position: "absolute",
          }}
        >
          <DeviceFrame
            width={340}
            height={680}
            tiltX={12}
            tiltY={-8}
            contact={{ name: "City Care Appointments", status: "Verified Assistant" }}
          >
            {/* Messages container */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                transform: `translateY(${scrollOffset}px)`,
                willChange: "transform",
              }}
            >
              {CHAT_FLOW.map((msg, index) => (
                <Bubble key={index} msg={msg} index={index} />
              ))}
            </div>
          </DeviceFrame>
        </div>

        {/* Narrative side notes */}
        <div
          style={{
            position: "absolute",
            left: "58%",
            width: "36%",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: TYPE.micro,
              fontWeight: 800,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: COLORS.accentDeep,
            }}
          >
            <MaskLine delay={20} durationIn={16}>
              <span style={{ fontFamily: "JetBrains Mono, monospace" }}>LEAPCREWW BOT // AI-ASSISTED</span>
            </MaskLine>
          </div>

          <div
            style={{
              fontSize: TYPE.h2,
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: COLORS.ink,
            }}
          >
            <MaskLine delay={45} durationIn={20}>
              <span>Interactive Quick-Replies.</span>
            </MaskLine>
            <MaskLine delay={65} durationIn={20}>
              <span>Instant slot selection.</span>
            </MaskLine>
          </div>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.5,
              color: COLORS.dim,
              margin: 0,
              opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }),
            }}
          >
            A friendly automated flow lets patients pick departments, choose doctors, and schedule consultations without human agent delay.
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
