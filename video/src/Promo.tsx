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
import { Machine } from "./scenes/Machine";
import { Payoff } from "./scenes/Payoff";
import { ComingSoon } from "./scenes/ComingSoon";
import { EndCard } from "./scenes/EndCard";

/**
 * One strong impact flash — the drop. The dark→light flood (in LogoReveal) is the
 * transition; this accent hit lands on the downbeat that triggers it.
 */
const DropFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const d = frame - DROP;
  if (d < 0 || d > 12) return null;
  const a = interpolate(d, [0, 12], [0.8, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", background: COLORS.accent, opacity: a }} />
  );
};

/** Small persistent wordmark bug — only over the light "Machine" act. */
const CornerBug: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [SCENES.machine.from, SCENES.machine.from + 16, SCENES.payoff.from - 12, SCENES.payoff.from],
    [0, 0.6, 0.6, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
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
        zIndex: 40,
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

      {/* Persistent cinematic backdrop (dark acts paint their own on top) */}
      <Background />

      {/* Act I — The Pile-Up */}
      <Sequence from={SCENES.pileup.from} durationInFrames={SCENES.pileup.dur} name="I · Pile-Up">
        <Pileup />
      </Sequence>

      {/* Act II — The Leap (dark→light flood) */}
      <Sequence from={SCENES.leap.from} durationInFrames={SCENES.leap.dur} name="II · Leap">
        <LogoReveal />
      </Sequence>

      {/* Act III — The Machine (one continuous camera move) */}
      <Sequence from={SCENES.machine.from} durationInFrames={SCENES.machine.dur} name="III · Machine">
        <Machine />
      </Sequence>

      {/* Act IV — The Payoff (night) */}
      <Sequence from={SCENES.payoff.from} durationInFrames={SCENES.payoff.dur} name="IV · Payoff">
        <Payoff />
      </Sequence>

      {/* Act V — Resolve (statement → brand + CTA) */}
      <Sequence from={RESOLVE.coming.from} durationInFrames={RESOLVE.coming.dur} name="V · ComingSoon">
        <ComingSoon />
      </Sequence>
      <Sequence from={RESOLVE.end.from} durationInFrames={RESOLVE.end.dur} name="V · EndCard">
        <EndCard />
      </Sequence>

      <CornerBug />
      <DropFlash />
      <Grain />
    </AbsoluteFill>
  );
};
