import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
  random,
} from "remotion";
import { COLORS, fontFamily, fontFamilySerif, TYPE, EASE } from "../theme";
import { Background } from "../components/Background";
import { Counter } from "../components/Counter";
import { Typewriter, MaskLine } from "../components/Kinetic";
import { FPB, beatPulse } from "../lib/beat";

/** The thread, piling up. Newest first. */
const MESSAGES: { from: string; text: string; at: number }[] = [
  { from: "Unknown", text: "Hello?? anyone there", at: 6 },
  { from: "Cart #4821", text: "Is this in stock?", at: 26 },
  { from: "Order #207", text: "Where's my order??", at: 48 },
  { from: "New lead", text: "Do you ship to Berlin?", at: 70 },
  { from: "Cart #4830", text: "still waiting…", at: 92 },
  { from: "Order #211", text: "Hello?? refund please", at: 112 },
];

const NotifCard: React.FC<{
  from: string;
  text: string;
  at: number;
  depth: number; // 0 = newest, on top
}> = ({ from, text, at, depth }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({
    frame: frame - at,
    fps,
    config: { damping: 16, mass: 0.6, stiffness: 150 },
  });
  if (pop <= 0) return null;

  // Each older card sinks down and dims as new ones shove in above it.
  const y = depth * 86 + interpolate(pop, [0, 1], [-26, 0]);
  const opacity = interpolate(pop, [0, 1], [0, 1]) * Math.max(0.18, 1 - depth * 0.26);
  const scale = interpolate(pop, [0, 1], [0.9, 1]) * (1 - depth * 0.03);
  const isNewest = depth === 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        transform: `translateY(${y}px) scale(${scale})`,
        opacity,
        background: "rgba(28,28,32,0.92)",
        border: `1px solid ${isNewest ? COLORS.darkLineStrong : COLORS.darkLine}`,
        backdropFilter: "blur(8px)",
        borderRadius: 18,
        padding: "12px 14px",
        display: "flex",
        gap: 11,
        alignItems: "flex-start",
        boxShadow: isNewest ? "0 12px 30px rgba(0,0,0,0.45)" : "none",
        zIndex: 100 - depth,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: COLORS.accentDeep,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
        }}
      >
        💬
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.darkInk, letterSpacing: "0.01em" }}>
            {from}
          </span>
          <span style={{ fontSize: 9, color: COLORS.darkFaint }}>now</span>
        </div>
        <div style={{ fontSize: 12, color: COLORS.darkDim, marginTop: 2, lineHeight: 1.3 }}>
          {isNewest ? <Typewriter text={text} delay={at + 2} cps={46} /> : text}
        </div>
      </div>
    </div>
  );
};

const DeadPhone: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = beatPulse(frame, 6);

  // Buzz: a sharp shake on each beat + extra kick when a message lands.
  let arrivalShake = 0;
  for (const m of MESSAGES) {
    const d = frame - m.at;
    if (d >= 0 && d < 8) arrivalShake = Math.max(arrivalShake, Math.exp(-0.6 * d));
  }
  const buzz = (pulse * 0.4 + arrivalShake) * 6;
  const dx = (random(`bx-${frame}`) * 2 - 1) * buzz;
  const dy = (random(`by-${frame}`) * 2 - 1) * buzz;
  const rot = (random(`br-${frame}`) * 2 - 1) * buzz * 0.18;

  // Count visible messages so far for the lock-screen summary.
  const stack = MESSAGES.filter((m) => m.at <= frame);

  return (
    <div
      style={{
        width: 380,
        height: 770,
        transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
        background: "#050506",
        border: "11px solid #1b1b1f",
        borderRadius: 52,
        boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 60px ${COLORS.dangerGlow}`,
        position: "relative",
        overflow: "hidden",
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120,
          height: 22,
          background: "#1b1b1f",
          borderRadius: 12,
          zIndex: 200,
        }}
      />

      {/* Lock-screen clock */}
      <div style={{ textAlign: "center", marginTop: 26, marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: COLORS.darkFaint, letterSpacing: "0.08em" }}>
          Tuesday, 2:14 AM
        </div>
        <div style={{ fontSize: 72, fontWeight: 300, color: COLORS.darkInk, lineHeight: 1, letterSpacing: "-0.02em" }}>
          2:14
        </div>
      </div>

      {/* Unread summary pill */}
      <div
        style={{
          alignSelf: "center",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: COLORS.danger,
          color: "#fff",
          padding: "6px 14px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "0.02em",
          marginBottom: 16,
          boxShadow: `0 6px 20px ${COLORS.dangerGlow}`,
          transform: `scale(${1 + pulse * 0.06})`,
        }}
      >
        <Counter
          keyframes={[
            { frame: 6, value: 12 },
            { frame: 28, value: 47 },
            { frame: 60, value: 213 },
            { frame: 100, value: 642 },
            { frame: 140, value: 891 },
          ]}
        />
        <span style={{ fontWeight: 600, opacity: 0.9 }}>unread</span>
      </div>

      {/* The stack */}
      <div style={{ position: "relative", flex: 1, fontFamily }}>
        {stack
          .slice()
          .reverse()
          .map((m, i) => (
            <NotifCard key={m.at} from={m.from} text={m.text} at={m.at} depth={i} />
          ))}
      </div>
    </div>
  );
};

export const Pileup: React.FC = () => {
  const frame = useCurrentFrame();

  // The red closes in as the count climbs — pressure building toward the turn.
  const dread = interpolate(frame, [0, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Background variant="dark" />

      {/* Pressure vignette in danger red */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: `radial-gradient(120% 110% at 50% 50%, transparent 40%, rgba(239,68,68,${0.05 + dread * 0.16}) 100%)`,
        }}
      />

      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 150px", gap: 100 }}>
        {/* The phone that won't stop */}
        <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center" }}>
          <DeadPhone />
        </div>

        {/* The two type punches */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: TYPE.micro,
              fontWeight: 800,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: COLORS.danger,
              fontFamily: fontFamilySerif,
              fontStyle: "italic",
            }}
          >
            <MaskLine delay={6} durationIn={16}>
              <span>2:14 AM // still ringing</span>
            </MaskLine>
          </div>

          <div style={{ fontSize: TYPE.h1, lineHeight: 1.04, letterSpacing: "-0.03em", color: COLORS.darkInk, fontWeight: 800 }}>
            <MaskLine delay={28} durationIn={22}>
              <span>Every message</span>
            </MaskLine>
            <MaskLine delay={40} durationIn={22}>
              <span>is a <span style={{ color: COLORS.accent }}>customer.</span></span>
            </MaskLine>
          </div>

          <div
            style={{
              fontSize: TYPE.h2,
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              color: COLORS.darkDim,
              fontFamily: fontFamilySerif,
              fontStyle: "italic",
              opacity: interpolate(frame, [90, 108], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...EASE.outExpo),
              }),
            }}
          >
            <MaskLine delay={92} durationIn={22}>
              <span>
                Every missed one is a <span style={{ color: COLORS.danger, fontStyle: "normal", fontWeight: 700 }}>sale.</span>
              </span>
            </MaskLine>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
