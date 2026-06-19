import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import { EASE } from "../theme";

/**
 * A line of text that rises out from behind a clipping mask — the staple
 * editorial reveal. `delay` shifts its local start; `from`/`to` let you reverse
 * it for exits.
 */
export const MaskLine: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  durationIn?: number;
}> = ({ children, delay = 0, style, durationIn = 18 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, mass: 0.7, stiffness: 120 },
    durationInFrames: durationIn,
  });
  const y = interpolate(reveal, [0, 1], [110, 0]);

  return (
    <div style={{ overflow: "hidden", lineHeight: 1.02, paddingBottom: "0.06em" }}>
      <div style={{ transform: `translateY(${y}%)`, ...style }}>{children}</div>
    </div>
  );
};

/**
 * Per-character pop-in with stagger — used for the wordmark and accent words.
 */
export const SplitPop: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, stagger = 2, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: "flex", overflow: "hidden", ...style }}>
      {text.split("").map((ch, i) => {
        const s = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: { damping: 14, mass: 0.6, stiffness: 160 },
        });
        const y = interpolate(s, [0, 1], [120, 0]);
        const blur = interpolate(s, [0, 1], [12, 0]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${y}%)`,
              filter: `blur(${blur}px)`,
              whiteSpace: "pre",
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/**
 * Types text out character-by-character with a blinking caret — used for the
 * incoming customer messages stacking up in Act I. Pure function of frame:
 * char count is derived from elapsed frames, never a timer.
 */
export const Typewriter: React.FC<{
  text: string;
  delay?: number;
  /** Characters per second. */
  cps?: number;
  cursor?: boolean;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, cps = 42, cursor = true, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = Math.max(0, frame - delay);
  const count = Math.floor((elapsed / fps) * cps);
  const shown = text.slice(0, count);
  const done = count >= text.length;
  const blinkOn = Math.floor(frame / (fps * 0.4)) % 2 === 0;

  return (
    <span style={style}>
      {shown}
      {cursor && (!done || blinkOn) ? (
        <span style={{ opacity: done ? (blinkOn ? 0.9 : 0) : 0.9, fontWeight: 400 }}>
          ▍
        </span>
      ) : null}
    </span>
  );
};

/**
 * A reveal that gains *weight* as it settles — light/blurred/low to heavy and
 * sharp. The headline equivalent of a word landing with conviction.
 */
export const WeightShift: React.FC<{
  children: React.ReactNode;
  delay?: number;
  fromWeight?: number;
  toWeight?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, fromWeight = 300, toWeight = 800, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, mass: 0.85, stiffness: 95 },
  });
  const weight = Math.round(interpolate(s, [0, 1], [fromWeight, toWeight]));
  const blur = interpolate(s, [0, 1], [9, 0]);
  const y = interpolate(s, [0, 1], [22, 0]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  return (
    <div
      style={{
        fontWeight: weight,
        filter: `blur(${blur}px)`,
        transform: `translateY(${y}px)`,
        opacity,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Eased word that punches in with scale + motion-blur feel. */
export const PunchIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...EASE.outExpo),
  });
  const scale = interpolate(p, [0, 1], [1.35, 1]);
  const blur = interpolate(p, [0, 1], [22, 0]);
  return (
    <div style={{ opacity: p, transform: `scale(${scale})`, filter: `blur(${blur}px)`, ...style }}>
      {children}
    </div>
  );
};
