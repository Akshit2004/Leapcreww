import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { EASE } from "../theme";

/**
 * A single keyframe of the virtual camera. `x`/`y` are the world-space point the
 * camera centers on the screen; `scale` is the zoom. Frames must be ascending.
 */
export type CamKey = { frame: number; x: number; y: number; scale: number };

/**
 * Virtual camera. Renders a large `world` (its children) and moves *through* it
 * by driving a single `translate/scale` transform from the current frame. This
 * is what turns a gallery of slides into one continuous control-room move.
 *
 * The transform centers world point (x, y) on the screen at `scale`:
 *   screenPos(p) = translate + p * scale  ⇒  translate = center − focus * scale
 */
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
