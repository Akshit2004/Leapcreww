import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from "remotion";
import { COLORS, fontFamily, fontFamilyMono, TYPE } from "../theme";
import { MaskLine } from "../components/Kinetic";

type Screen = { file: string; eyebrow: string; title: string };

const SCREENS: Screen[] = [
  { file: "app/appt-slots.png", eyebrow: "BOOKING CONSOLE", title: "Open slots, set in seconds." },
  { file: "app/appt-bookings.png", eyebrow: "EVERY BOOKING", title: "Synced to your dashboard." },
];

const SEG = 60; // frames per screen (one bar)
const WIN_W = 1240;
const WIN_H = 800;

const BrowserChrome: React.FC = () => (
  <div style={{ height: 46, background: "#F1F1F0", borderBottom: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 16 }}>
    <div style={{ display: "flex", gap: 9 }}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
        <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
      ))}
    </div>
    <div style={{ flex: 1, maxWidth: 460, margin: "0 auto", height: 28, background: "#FFFFFF", border: `1px solid ${COLORS.line}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: fontFamilyMono, fontSize: 13, color: COLORS.dim }}>
      <span style={{ color: "#1FA855" }}>🔒</span> app.leapcreww.com
    </div>
    <div style={{ width: 44 }} />
  </div>
);

const ScreenLayer: React.FC<{ screen: Screen; index: number }> = ({ screen, index }) => {
  const frame = useCurrentFrame();
  const start = index * SEG;
  const local = frame - start;
  // crossfade in/out around bar boundaries
  const opIn = interpolate(local, [-8, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opOut = interpolate(local, [SEG - 8, SEG + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = Math.min(opIn, opOut);
  if (opacity <= 0) return null;

  const y = interpolate(local, [-8, 6], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // slow Ken Burns drift while on screen
  const kb = interpolate(local, [0, SEG], [1.0, 1.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const kbY = interpolate(local, [0, SEG], [0, -18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", width: WIN_W, height: WIN_H, opacity, transform: `translateY(${y}px)`, zIndex: index, borderRadius: 16, overflow: "hidden", border: `1px solid ${COLORS.line}`, boxShadow: "0 50px 100px -40px rgba(0,0,0,0.45)" }}>
      <BrowserChrome />
      <div style={{ width: "100%", height: WIN_H - 46, overflow: "hidden", background: "#fff" }}>
        <Img src={staticFile(screen.file)} style={{ width: "100%", display: "block", transform: `scale(${kb}) translateY(${kbY}px)`, transformOrigin: "top center" }} />
      </div>
    </div>
  );
};

export const PlatformShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = Math.min(Math.floor(frame / SEG), SCREENS.length - 1);
  const cur = SCREENS[active];

  // caption re-keys per screen so MaskLine re-animates on each switch
  const localCap = frame - active * SEG;

  const intro = spring({ frame, fps, config: { damping: 20, stiffness: 90 }, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ fontFamily, backgroundColor: COLORS.bg }}>
      {/* section eyebrow */}
      <div style={{ position: "absolute", top: 64, left: 96, fontFamily: fontFamilyMono, fontSize: TYPE.micro, fontWeight: 800, letterSpacing: "0.25em", color: COLORS.accentDeep, opacity: intro }}>
        BOOKINGS DASHBOARD — IN YOUR APP
      </div>

      {/* browser hero */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: WIN_W, height: WIN_H, transform: `scale(${interpolate(intro, [0, 1], [0.95, 1])})` }}>
          {SCREENS.map((s, i) => <ScreenLayer key={i} screen={s} index={i} />)}
        </div>
      </AbsoluteFill>

      {/* caption strip */}
      <div style={{ position: "absolute", left: 96, bottom: 70, right: 96, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div key={active} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontFamily: fontFamilyMono, fontSize: TYPE.micro, fontWeight: 800, letterSpacing: "0.22em", color: COLORS.accent }}>
            {localCap >= 0 && <MaskLine delay={4} durationIn={14}><span>{cur.eyebrow}</span></MaskLine>}
          </div>
          <div style={{ fontSize: TYPE.h2, fontWeight: 800, letterSpacing: "-0.025em", color: COLORS.ink, lineHeight: 1.05 }}>
            <MaskLine delay={8} durationIn={18}><span>{cur.title}</span></MaskLine>
          </div>
        </div>

        {/* progress dots */}
        <div style={{ display: "flex", gap: 10, paddingBottom: 8 }}>
          {SCREENS.map((_, i) => (
            <div key={i} style={{ width: i === active ? 30 : 10, height: 10, borderRadius: 5, background: i === active ? COLORS.accent : COLORS.lineStrong, transition: "all 0.2s" }} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
