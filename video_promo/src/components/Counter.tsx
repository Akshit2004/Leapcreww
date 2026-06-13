import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from "remotion";

const formatValue = (
  v: number,
  decimals: number,
  prefix: string,
  suffix: string,
  group: boolean,
) => {
  let n = decimals > 0 ? v.toFixed(decimals) : String(Math.round(v));
  if (group) {
    const [int, dec] = n.split(".");
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    n = dec ? `${grouped}.${dec}` : grouped;
  }
  return `${prefix}${n}${suffix}`;
};

export const Counter: React.FC<{
  to?: number;
  from?: number;
  delay?: number;
  duration?: number;
  keyframes?: { frame: number; value: number }[];
  decimals?: number;
  prefix?: string;
  suffix?: string;
  group?: boolean;
  damping?: number;
  style?: React.CSSProperties;
}> = ({
  to = 0,
  from = 0,
  delay = 0,
  duration,
  keyframes,
  decimals = 0,
  prefix = "",
  suffix = "",
  group = false,
  damping = 13,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let value: number;
  if (keyframes && keyframes.length > 0) {
    value = interpolate(
      frame,
      keyframes.map((k) => k.frame),
      keyframes.map((k) => k.value),
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      },
    );
  } else {
    const s = spring({
      frame: frame - delay,
      fps,
      config: { damping, mass: 0.9, stiffness: 130 },
      durationInFrames: duration,
    });
    value = from + (to - from) * s;
  }

  return (
    <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {formatValue(value, decimals, prefix, suffix, group)}
    </span>
  );
};
