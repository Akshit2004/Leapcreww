import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { COLORS, fontFamily, TYPE } from "./theme";
import { SCENES, RESOLVE, DROP } from "./lib/beat";
import { Background } from "./components/Background";
import { Grain } from "./components/Grain";
import { LeapMark } from "./components/Logo";
import { Pileup } from "./scenes/Pileup";
import { LogoReveal } from "./scenes/LogoReveal";
import { BookingFlow } from "./scenes/BookingFlow";
import { PaymentSync } from "./scenes/PaymentSync";
import { ComingSoon } from "./scenes/ComingSoon";
import { EndCard } from "./scenes/EndCard";

/**
 * DropFlash: Renders a brief bright flash overlay on the downbeat of the drop (frame 150)
 */
const DropFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const d = frame - DROP;
  if (d < 0 || d > 12) return null;
  const a = interpolate(d, [0, 12], [0.8, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", background: COLORS.accent, opacity: a, zIndex: 99 }} />
  );
};

/**
 * CornerBug: Renders a small brand watermark in the corner during the interactive screens (Acts III & IV)
 */
const CornerBug: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [SCENES.booking.from, SCENES.booking.from + 16, SCENES.paymentsync.from + SCENES.paymentsync.dur - 16, SCENES.paymentsync.from + SCENES.paymentsync.dur],
    [0, 0.65, 0.65, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        right: 64,
        bottom: 56,
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity,
        fontFamily,
        zIndex: 1000,
      }}
    >
      <LeapMark size={26} />
      <span style={{ fontSize: TYPE.micro, fontWeight: 700, letterSpacing: "0.04em", color: COLORS.ink }}>
        Leap<span style={{ color: COLORS.accent }}>Creww</span>
      </span>
    </div>
  );
};

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Audio src={staticFile("beat.wav")} />

      {/* Dynamic background behind scenes */}
      <Background />

      {/* Act I — The Friction */}
      <Sequence from={SCENES.pileup.from} durationInFrames={SCENES.pileup.dur} name="I · Friction">
        <Pileup />
      </Sequence>

      {/* Act II — The Turn */}
      <Sequence from={SCENES.leap.from} durationInFrames={SCENES.leap.dur} name="II · Leap">
        <LogoReveal />
      </Sequence>

      {/* Act III — The Chat Booking Flow */}
      <Sequence from={SCENES.booking.from} durationInFrames={SCENES.booking.dur} name="III · Booking Flow">
        <BookingFlow />
      </Sequence>

      {/* Act IV — Payment & live reception sync */}
      <Sequence from={SCENES.paymentsync.from} durationInFrames={SCENES.paymentsync.dur} name="IV · Payment & Sync">
        <PaymentSync />
      </Sequence>

      {/* Act V — Resolve & Call To Action */}
      <Sequence from={RESOLVE.statement.from} durationInFrames={RESOLVE.statement.dur} name="V · Coming Soon">
        <ComingSoon />
      </Sequence>
      <Sequence from={RESOLVE.end.from} durationInFrames={RESOLVE.end.dur} name="V · End Card">
        <EndCard />
      </Sequence>

      <CornerBug />
      <DropFlash />
      <Grain />
    </AbsoluteFill>
  );
};
