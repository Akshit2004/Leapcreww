import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, fontFamily, fontFamilySerif, TYPE } from "../theme";
import { Camera, type CamKey } from "../components/Camera";
import { DeviceFrame } from "../components/DeviceFrame";
import { BroadcastRipple } from "../components/BroadcastRipple";
import { Counter } from "../components/Counter";
import { SplitPop, MaskLine } from "../components/Kinetic";

const WORLD_W = 5760;
const WORLD_H = 1080;
const STATION_W = 1920;

/** Camera path through the three movements of the one continuous system. */
const CAM: CamKey[] = [
  { frame: 0, x: 960, y: 540, scale: 1.0 },
  { frame: 80, x: 960, y: 540, scale: 1.06 },
  { frame: 120, x: 2880, y: 540, scale: 1.0 }, // → Autopilot
  { frame: 205, x: 2880, y: 540, scale: 1.07 },
  { frame: 240, x: 4800, y: 560, scale: 0.92 }, // → Route (pull back to see the path)
  { frame: 300, x: 5060, y: 610, scale: 1.18 }, // push into the escalation
  { frame: 330, x: 5060, y: 610, scale: 1.18 },
];

const StationLabel: React.FC<{ index: string; kicker: string; delay: number }> = ({
  index,
  kicker,
  delay,
}) => (
  <div style={{ position: "absolute", top: 150, left: 210, width: 700 }}>
    <div
      style={{
        fontSize: TYPE.micro,
        fontWeight: 800,
        letterSpacing: "0.35em",
        textTransform: "uppercase",
        color: COLORS.accent,
        fontFamily: fontFamilySerif,
        fontStyle: "italic",
        marginBottom: 14,
      }}
    >
      <MaskLine delay={delay} durationIn={16}>
        <span>{index}</span>
      </MaskLine>
    </div>
    <SplitPop
      text={kicker}
      delay={delay + 4}
      stagger={1.6}
      style={{ fontSize: TYPE.h1, fontWeight: 800, letterSpacing: "-0.04em", color: COLORS.ink }}
    />
  </div>
);

/* ── Station 1 · Broadcast ─────────────────────────────────────────────── */
const BroadcastStation: React.FC<{ t0: number }> = ({ t0 }) => {
  const frame = useCurrentFrame();
  const local = frame - t0;
  const sent = local > 18;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: STATION_W, height: WORLD_H }}>
      <StationLabel index="01 — Broadcast" kicker="Fire one campaign." delay={6} />

      {/* The composer + send moment */}
      <div style={{ position: "absolute", left: 210, top: 470, width: 360, fontFamily }}>
        <MaskLine delay={20}>
          <div style={{ fontSize: TYPE.body, color: COLORS.dim, fontWeight: 500, lineHeight: 1.35 }}>
            One message reaches{" "}
            <span style={{ color: COLORS.ink, fontWeight: 800 }}>
              <Counter to={8412} delay={t0 + 18} duration={50} group damping={60} />
            </span>{" "}
            contacts — and you watch every read land.
          </div>
        </MaskLine>
      </div>

      {/* The radiating field */}
      <div style={{ position: "absolute", left: 620, top: 180, width: 1180, height: 720 }}>
        <BroadcastRipple width={1180} height={720} start={t0 + 8} count={96} seed="cast" />
        {sent && (
          <div
            style={{
              position: "absolute",
              left: 10,
              bottom: 10,
              fontFamily: "monospace",
              fontSize: 12,
              letterSpacing: "0.12em",
              color: COLORS.faint,
            }}
          >
            CAMPAIGN_SENT // DELIVERED 99.4%
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Station 2 · Autopilot (Sarah's thread) ────────────────────────────── */
const ChatBubble: React.FC<{ text: string; sender: "bot" | "user"; delay: number }> = ({
  text,
  sender,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5, stiffness: 140 } });
  if (pop <= 0) return null;
  const isUser = sender === "user";
  return (
    <div
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        background: isUser ? COLORS.accent : COLORS.bgRaised,
        border: `1px solid ${isUser ? "transparent" : COLORS.line}`,
        color: isUser ? COLORS.bgRaised : COLORS.ink,
        padding: "12px 18px",
        borderRadius: isUser ? "18px 18px 2px 18px" : "18px 18px 18px 2px",
        fontSize: 13,
        fontWeight: 500,
        maxWidth: "85%",
        transform: `translateY(${interpolate(pop, [0, 1], [15, 0])}px) scale(${interpolate(pop, [0, 1], [0.8, 1])})`,
        opacity: pop,
        boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
        lineHeight: 1.4,
      }}
    >
      {text}
    </div>
  );
};

const TypingDots: React.FC<{ start: number; end: number }> = ({ start, end }) => {
  const frame = useCurrentFrame();
  if (frame < start || frame >= end) return null;
  return (
    <div
      style={{
        alignSelf: "flex-start",
        background: COLORS.bgRaised,
        border: `1px solid ${COLORS.line}`,
        padding: "10px 16px",
        borderRadius: "18px 18px 18px 2px",
        display: "flex",
        gap: 4,
        alignItems: "center",
        height: 32,
      }}
    >
      {[0, 4, 8].map((o) => (
        <div
          key={o}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: COLORS.dim,
            opacity: interpolate((frame + o) % 15, [0, 7.5, 15], [0.2, 1, 0.2]),
          }}
        />
      ))}
    </div>
  );
};

const AutopilotStation: React.FC<{ t0: number }> = ({ t0 }) => {
  const frame = useCurrentFrame();
  const local = frame - t0;
  const typing = local > 20 && local < 42;
  return (
    <div style={{ position: "absolute", left: STATION_W, top: 0, width: STATION_W, height: WORLD_H }}>
      <StationLabel index="02 — Autopilot" kicker="It replies for you." delay={t0 + 2} />

      <div style={{ position: "absolute", left: 250, top: 430, width: 360, fontFamily }}>
        <MaskLine delay={t0 + 16}>
          <div style={{ fontSize: TYPE.body, color: COLORS.dim, fontWeight: 500, lineHeight: 1.35 }}>
            Sarah taps the offer. The bot applies her code and closes the sale —{" "}
            <span style={{ color: COLORS.accent, fontWeight: 800 }}>instantly.</span>
          </div>
        </MaskLine>
      </div>

      <div style={{ position: "absolute", left: 1080, top: 170, fontFamily }}>
        <DeviceFrame
          tiltY={-7}
          tiltX={2}
          contact={{ name: "Sarah Miller", status: typing ? "typing…" : "online" }}
        >
          <ChatBubble sender="bot" text="Hi Sarah! Your cart items are running low — claim an exclusive 15% off 🛍️" delay={t0 + 4} />
          <ChatBubble sender="user" text="Claim 15% Off" delay={t0 + 16} />
          <TypingDots start={t0 + 20} end={t0 + 42} />
          <ChatBubble sender="bot" text="Code applied: LEAP15 ✓ Your checkout is ready 🤖" delay={t0 + 42} />
        </DeviceFrame>
      </div>
    </div>
  );
};

/* ── Station 3 · Route & hand-off ──────────────────────────────────────── */
const FlowNode: React.FC<{
  title: string;
  type: string;
  desc: string;
  x: number;
  y: number;
  delay: number;
  highlight?: boolean;
}> = ({ title, type, desc, x, y, delay, highlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6, stiffness: 130 } });
  if (pop <= 0) return null;
  const color = type === "trigger" ? COLORS.accent : highlight ? COLORS.danger : COLORS.ink;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 260,
        background: COLORS.bgRaised,
        border: `1.5px solid ${highlight ? COLORS.danger : COLORS.lineStrong}`,
        borderRadius: 14,
        padding: 18,
        boxShadow: highlight ? `0 14px 36px ${COLORS.dangerGlow}` : "0 10px 24px rgba(0,0,0,0.04)",
        opacity: interpolate(pop, [0, 1], [0, 1]),
        transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
        zIndex: 5,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color }}>
          {type}
        </span>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink, marginTop: 10 }}>{title}</div>
      <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 4 }}>{desc}</div>
    </div>
  );
};

const FlowLink: React.FC<{ fromX: number; fromY: number; toX: number; toY: number; delay: number; danger?: boolean }> = ({
  fromX,
  fromY,
  toX,
  toY,
  delay,
  danger,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = spring({ frame: frame - delay, fps, config: { damping: 20, mass: 0.8, stiffness: 100 } });
  if (draw <= 0) return null;
  const midX = (fromX + toX) / 2;
  const d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  const stroke = danger ? COLORS.danger : COLORS.accent;
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
      <path d={d} fill="none" stroke={COLORS.lineStrong} strokeWidth={1.5} strokeDasharray="4,4" />
      <path d={d} fill="none" stroke={stroke} strokeWidth={2.5} strokeDasharray="1400" strokeDashoffset={1400 * (1 - draw)} strokeLinecap="round" />
      {draw > 0.9 && (
        <path d={d} fill="none" stroke={stroke} strokeWidth={3} strokeDasharray="8,46" strokeDashoffset={-(frame - delay) * 2.5} strokeLinecap="round" />
      )}
    </svg>
  );
};

const RouteStation: React.FC<{ t0: number }> = ({ t0 }) => {
  return (
    <div style={{ position: "absolute", left: STATION_W * 2, top: 0, width: STATION_W, height: WORLD_H }}>
      <StationLabel index="03 — Route" kicker="Escalate only what needs you." delay={t0 + 2} />

      <FlowLink fromX={350} fromY={560} toX={520} toY={560} delay={t0 + 18} />
      <FlowLink fromX={780} fromY={560} toX={910} toY={420} delay={t0 + 34} />
      <FlowLink fromX={780} fromY={560} toX={1080} toY={700} delay={t0 + 48} danger />

      <FlowNode type="trigger" title="Button Clicked" desc="Sarah claimed LEAP15" x={90} y={505} delay={t0 + 10} />
      <FlowNode type="action" title="Apply Code & Link" desc="Auto-resolved ✓" x={520} y={505} delay={t0 + 28} />
      <FlowNode type="resolved" title="Closed by bot" desc="No human needed" x={910} y={360} delay={t0 + 44} />
      <FlowNode
        type="needs a human"
        title="“Is shipping free?”"
        desc="Routed to you → Maya"
        x={1080}
        y={640}
        delay={t0 + 58}
        highlight
      />
    </div>
  );
};

/* ── The whole continuous move ─────────────────────────────────────────── */
export const Machine: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Camera keyframes={CAM} worldWidth={WORLD_W} worldHeight={WORLD_H}>
        {/* subtle seams between stations so the world reads as one canvas */}
        <div style={{ position: "absolute", left: STATION_W, top: 120, bottom: 120, width: 1, background: COLORS.line }} />
        <div style={{ position: "absolute", left: STATION_W * 2, top: 120, bottom: 120, width: 1, background: COLORS.line }} />

        <BroadcastStation t0={0} />
        <AutopilotStation t0={120} />
        <RouteStation t0={235} />
      </Camera>
    </AbsoluteFill>
  );
};
