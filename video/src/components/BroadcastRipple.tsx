import React from "react";
import { useCurrentFrame, random, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

/**
 * The campaign send — the one "wow" motion beat. A broadcast fires from the
 * source node and a wavefront radiates across a field of contact dots, lighting
 * each one as it's reached. Concentric rings ride the same front.
 *
 * Self-contained at `width`×`height`; the parent positions it in the world.
 */
export const BroadcastRipple: React.FC<{
  width: number;
  height: number;
  start?: number;
  count?: number;
  seed?: string;
}> = ({ width, height, start = 0, count = 90, seed = "cast" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - start;

  const sx = width * 0.1;
  const sy = height * 0.5;
  const maxDist = Math.hypot(width - sx, Math.max(sy, height - sy));
  const speed = maxDist / 46; // wavefront crosses the field in ~1.5s
  const front = local * speed;

  const dots = Array.from({ length: count }).map((_, i) => {
    const gx = 0.26 + random(`${seed}-x-${i}`) * 0.7;
    const gy = 0.06 + random(`${seed}-y-${i}`) * 0.88;
    const x = gx * width;
    const y = gy * height;
    const dist = Math.hypot(x - sx, y - sy);
    return { x, y, dist, r: 3 + random(`${seed}-r-${i}`) * 3 };
  });

  // Three rings, staggered, riding the front.
  const rings = [0, 10, 20].map((d) => {
    const r = (local - d) * speed;
    return { r, opacity: interpolate(r, [0, maxDist], [0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) };
  });

  const sourcePop = spring({ frame: local, fps, config: { damping: 12, mass: 0.5, stiffness: 160 } });

  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {/* expanding rings */}
      {rings.map((ring, i) =>
        ring.r > 0 && ring.opacity > 0.01 ? (
          <circle
            key={i}
            cx={sx}
            cy={sy}
            r={ring.r}
            fill="none"
            stroke={COLORS.accent}
            strokeWidth={2}
            opacity={ring.opacity}
          />
        ) : null,
      )}

      {/* contact field */}
      {dots.map((d, i) => {
        const hit = front - d.dist; // frames*speed past the dot
        const lit = interpolate(hit, [0, 14, 60], [0, 1, 0.78], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const pop = interpolate(hit, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const opacity = interpolate(lit, [0, 1], [0.16, 1]);
        const r = d.r * (1 + pop * 0.6);
        return (
          <g key={i}>
            {lit > 0.5 && (
              <line x1={sx} y1={sy} x2={d.x} y2={d.y} stroke={COLORS.accent} strokeWidth={1} opacity={(lit - 0.5) * 0.16} />
            )}
            <circle cx={d.x} cy={d.y} r={r} fill={lit > 0.4 ? COLORS.accent : COLORS.lineStrong} opacity={opacity} />
          </g>
        );
      })}

      {/* source node */}
      <circle cx={sx} cy={sy} r={14 + sourcePop * 6} fill={COLORS.accentDeep} opacity={Math.max(0, sourcePop)} />
      <circle cx={sx} cy={sy} r={26} fill="none" stroke={COLORS.accent} strokeWidth={2} opacity={Math.max(0, sourcePop) * 0.4} />
    </svg>
  );
};
