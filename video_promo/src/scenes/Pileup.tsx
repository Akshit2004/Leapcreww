import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from "remotion";
import { COLORS, fontFamily, fontFamilyMono, TYPE, EASE } from "../theme";
import { Background } from "../components/Background";
import { MaskLine } from "../components/Kinetic";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const TIMES = ["9:00", "10:00", "11:00", "12:00", "1:00", "2:00"];

type Appt = { day: number; row: number; name: string; at: number };

// Appointments land on the board over time — two of them collide on the
// same day/slot, visualising the double-booking chaos of manual scheduling.
const APPTS: Appt[] = [
  { day: 0, row: 0, name: "J. Patel", at: 5 },
  { day: 2, row: 2, name: "R. Khan", at: 25 },
  { day: 1, row: 1, name: "S. Iyer", at: 45 },
  { day: 2, row: 2, name: "M. Verma", at: 65 },
  { day: 4, row: 4, name: "A. Roy", at: 85 },
  { day: 0, row: 0, name: "D. Shah", at: 105 },
  { day: 3, row: 3, name: "N. Gupta", at: 125 },
];

const conflictsAt = (frame: number) => {
  let count = 0;
  for (let i = 0; i < APPTS.length; i++) {
    if (frame < APPTS[i].at) continue;
    for (let j = 0; j < i; j++) {
      if (frame >= APPTS[j].at && APPTS[j].day === APPTS[i].day && APPTS[j].row === APPTS[i].row) {
        count++;
      }
    }
  }
  return count;
};

const ApptBlock: React.FC<{ appt: Appt; conflict: boolean }> = ({ appt, conflict }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({
    frame: frame - appt.at,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 160 },
  });

  if (s <= 0) return null;

  const scale = interpolate(s, [0, 1], [0.55, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  const elapsed = frame - appt.at;
  const wobble = conflict
    ? Math.sin(elapsed * 0.9) * interpolate(elapsed, [0, 10], [7, 0], { extrapolateRight: "clamp" })
    : 0;
  const rotate = (conflict ? -4 : 0) + wobble;
  const shift = conflict ? "translate(8px, 8px)" : "translate(0px, 0px)";

  return (
    <div
      style={{
        gridColumn: appt.day + 2,
        gridRow: appt.row + 2,
        margin: 4,
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 2,
        background: conflict ? COLORS.danger : "#FFFFFF",
        color: conflict ? "#FFFFFF" : COLORS.darkBg,
        fontFamily: fontFamilyMono,
        fontWeight: 700,
        transform: `${shift} rotate(${rotate}deg) scale(${scale})`,
        opacity,
        zIndex: conflict ? 5 : 2,
        boxShadow: conflict ? `0 10px 24px ${COLORS.dangerGlow}` : "0 6px 16px rgba(0,0,0,0.35)",
      }}
    >
      <span style={{ fontSize: 12 }}>{appt.name}</span>
      <span style={{ fontSize: 10, opacity: 0.6 }}>{TIMES[appt.row]}</span>
    </div>
  );
};

const ScheduleBoard: React.FC = () => {
  const frame = useCurrentFrame();
  const conflicts = conflictsAt(frame);

  return (
    <div
      style={{
        width: 520,
        height: 560,
        background: COLORS.darkRaised,
        border: `1px solid ${COLORS.darkLineStrong}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: `1px solid ${COLORS.darkLineStrong}`,
          fontFamily: fontFamilyMono,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        <span style={{ color: COLORS.darkDim }}>This Week's Schedule</span>
        <span style={{ color: conflicts > 0 ? COLORS.danger : COLORS.darkFaint }}>
          Double-bookings: {conflicts}
        </span>
      </div>

      {/* Calendar grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "56px repeat(5, 1fr)",
          gridTemplateRows: "36px repeat(6, 1fr)",
        }}
      >
        {/* Day headers */}
        {DAYS.map((d, i) => (
          <div
            key={d}
            style={{
              gridColumn: i + 2,
              gridRow: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: fontFamilyMono,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: COLORS.darkFaint,
              borderBottom: `1px solid ${COLORS.darkLineStrong}`,
              borderLeft: `1px solid ${COLORS.darkLine}`,
            }}
          >
            {d}
          </div>
        ))}

        {/* Time labels */}
        {TIMES.map((t, i) => (
          <div
            key={t}
            style={{
              gridColumn: 1,
              gridRow: i + 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: 8,
              fontFamily: fontFamilyMono,
              fontSize: 10,
              color: COLORS.darkFaint,
              borderRight: `1px solid ${COLORS.darkLineStrong}`,
              borderTop: `1px solid ${COLORS.darkLine}`,
            }}
          >
            {t}
          </div>
        ))}

        {/* Grid cell rules */}
        {TIMES.map((_, r) =>
          DAYS.map((_, c) => (
            <div
              key={`${r}-${c}`}
              style={{
                gridColumn: c + 2,
                gridRow: r + 2,
                borderTop: `1px solid ${COLORS.darkLine}`,
                borderLeft: `1px solid ${COLORS.darkLine}`,
              }}
            />
          ))
        )}

        {/* Appointments — some collide on the same slot */}
        {APPTS.map((a, i) => {
          const conflict = APPTS.slice(0, i).some((p) => p.day === a.day && p.row === a.row);
          return <ApptBlock key={i} appt={a} conflict={conflict} />;
        })}
      </div>
    </div>
  );
};

export const Pileup: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ fontFamily, backgroundColor: COLORS.darkBg }}>
      <Background variant="dark" />

      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 120px", gap: 100 }}>
        {/* Calendar board on left */}
        <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center" }}>
          <ScheduleBoard />
        </div>

        {/* Text descriptions on right */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontFamily: fontFamilyMono,
              fontWeight: 800,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: COLORS.darkDim,
              fontSize: 12,
            }}
          >
            <MaskLine delay={6} durationIn={16}>
              <span>TRADITIONAL SCHEDULING</span>
            </MaskLine>
          </div>

          <div style={{ fontSize: TYPE.h1, lineHeight: 1.04, letterSpacing: "-0.03em", color: COLORS.darkInk, fontWeight: 800 }}>
            <MaskLine delay={28} durationIn={22}>
              <span>Booking a doctor</span>
            </MaskLine>
            <MaskLine delay={40} durationIn={22}>
              <span>should take <span style={{ color: COLORS.darkDim }}>seconds.</span></span>
            </MaskLine>
          </div>

          <div
            style={{
              fontSize: TYPE.h2,
              lineHeight: 1.06,
              color: COLORS.darkFaint,
              fontFamily: fontFamily,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              opacity: interpolate(frame, [90, 108], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...EASE.outExpo),
              }),
            }}
          >
            <MaskLine delay={92} durationIn={22}>
              <span>
                Not endless <span style={{ color: COLORS.darkDim, fontWeight: 800 }}>phone queues.</span>
              </span>
            </MaskLine>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
