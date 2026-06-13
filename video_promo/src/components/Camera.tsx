import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { EASE } from "../theme";

export type CamKey = { frame: number; x: number; y: number; scale: number };

export const Camera: React.FC<{
  keyframes: CamKey[];
  worldWidth: number;
  worldHeight: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ keyframes, worldWidth, worldHeight, children, style }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const frames = keyframes.map((k) => k.frame);
  const ease = Easing.bezier(...EASE.inOutQuint);
  const opts = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  } as const;

  const x = interpolate(frame, frames, keyframes.map((k) => k.x), opts);
  const y = interpolate(frame, frames, keyframes.map((k) => k.y), opts);
  const scale = interpolate(frame, frames, keyframes.map((k) => k.scale), opts);

  const tx = width / 2 - x * scale;
  const ty = height / 2 - y * scale;

  return (
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      <div
        style={{
          position: "absolute",
          width: worldWidth,
          height: worldHeight,
          transformOrigin: "0 0",
          transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
