import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import { COLORS, WA, fontFamily, TYPE } from "../theme";
import { MaskLine } from "../components/Kinetic";
import { Chevron, VideoIcon, PhoneIcon, Dots, Smiley, Attach, Camera, Mic, Reply, DoubleTick, ListIcon, CloseX } from "../components/WAIcons";

// ── Conversation script for the real appointment booking flow ───────────────
type Btn = { label: string };
type Msg = {
  kind: "msg";
  side: "in" | "out";
  text: string;
  at: number;
  buttons?: Btn[];     // quick-reply buttons
  listButton?: string; // interactive-list trigger button label
  tapAt?: number;
  tappedIndex?: number;
};
type Typing = { kind: "typing"; at: number; until: number };
type Item = Msg | Typing;

// Interactive list bottom-sheet (the WhatsApp slot picker)
const SHEET = {
  open: 214, highlight: 236, close: 256,
  title: "Book: Dr. Sharma",
  daySection: "TOMORROW, 15 JUN",
  rows: [
    { t: "10:00 AM", d: "30 min · Consultation Fee: ₹500" },
    { t: "10:30 AM", d: "30 min · Consultation Fee: ₹500" },
    { t: "11:30 AM", d: "30 min · Consultation Fee: ₹500" },
    { t: "03:00 PM", d: "30 min · Consultation Fee: ₹500" },
  ],
  pick: 0,
};

const SCRIPT: Item[] = [
  { kind: "msg", side: "out", text: "Hi", at: 12 },
  { kind: "typing", at: 30, until: 46 },
  {
    kind: "msg", side: "in",
    text: "📅 Appointment Booking\n\nWhat would you like to do?",
    at: 46,
    buttons: [{ label: "📅  Book" }, { label: "📋  My Bookings" }],
    tapAt: 78, tappedIndex: 0,
  },
  { kind: "msg", side: "out", text: "Book", at: 88 },
  { kind: "typing", at: 100, until: 116 },
  {
    kind: "msg", side: "in", text: "Which doctor would you like to see?", at: 116,
    buttons: [{ label: "Dr. Sharma · Cardiology" }, { label: "Dr. Verma · Dermatology" }, { label: "Dr. Iyer · Pediatrics" }],
    tapAt: 160, tappedIndex: 0,
  },
  { kind: "msg", side: "out", text: "Dr. Sharma — Cardiology", at: 170 },
  { kind: "typing", at: 182, until: 196 },
  { kind: "msg", side: "in", text: "Great! Pick a time for your appointment 👇", at: 196, listButton: "View Times" },
  // (bottom sheet animates here — see SHEET)
  { kind: "msg", side: "out", text: "10:00 AM — Tomorrow", at: 262 },
  { kind: "typing", at: 274, until: 290 },
  {
    kind: "msg", side: "in", text: "Booking Dr. Sharma on Tomorrow, 10:00 AM.\n\nWho is this appointment for?", at: 290,
    buttons: [{ label: "✅  Aarav Mehta" }, { label: "✏️  Someone else" }],
    tapAt: 322, tappedIndex: 0,
  },
  { kind: "msg", side: "out", text: "Aarav Mehta", at: 332 },
  { kind: "typing", at: 344, until: 358 },
  {
    kind: "msg", side: "in",
    text: "✅ Appointment Confirmed! 🎉\n\nDr. Sharma — Cardiology\n👤 Patient: Aarav Mehta\n🗓️ Tomorrow, 10:00 AM\n💳 Consultation Fee: ₹500 — pay at the venue.\n\nReply MY BOOKINGS anytime to view, reschedule, or cancel.",
    at: 358,
  },
];

const PHONE_W = 384;
const PHONE_H = 808;

const TypingBubble: React.FC<{ item: Typing }> = ({ item }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < item.at || frame >= item.until) return null;
  const enter = spring({ frame: frame - item.at, fps, config: { damping: 16, stiffness: 140 }, durationInFrames: 8 });
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8, opacity: enter }}>
      <div style={{ background: WA.bubbleIn, borderRadius: 14, borderTopLeftRadius: 4, padding: "13px 16px", display: "flex", gap: 5, boxShadow: "0 1px 1px rgba(0,0,0,0.13)" }}>
        {[0, 1, 2].map((i) => {
          const t = (frame - item.at) % 24;
          const dy = Math.sin((t / 24) * Math.PI * 2 + i * 1.1) * 3;
          return <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: "#9AA6AC", transform: `translateY(${dy}px)` }} />;
        })}
      </div>
    </div>
  );
};

const Bubble: React.FC<{ msg: Msg }> = ({ msg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - msg.at, fps, config: { damping: 16, stiffness: 130 }, durationInFrames: 12 });
  if (enter <= 0) return null;
  const out = msg.side === "out";
  const y = interpolate(enter, [0, 1], [16, 0]);
  const lines = msg.text.split("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: out ? "flex-end" : "flex-start", marginBottom: 8, opacity: enter, transform: `translateY(${y}px)` }}>
      <div
        style={{
          position: "relative", maxWidth: "84%",
          background: out ? WA.bubbleOut : WA.bubbleIn, color: WA.ink,
          padding: "8px 11px 9px", borderRadius: 14,
          borderTopRightRadius: out ? 4 : 14, borderTopLeftRadius: out ? 14 : 4,
          fontSize: 15.5, lineHeight: 1.36, fontWeight: 400,
          boxShadow: "0 1px 1px rgba(0,0,0,0.13)", letterSpacing: "-0.01em",
        }}
      >
        {lines.map((l, i) => {
          // emphasise the first line of the confirmation / menu
          const bold = (i === 0 && (l.startsWith("✅") || l.startsWith("📅")));
          return <div key={i} style={{ fontWeight: bold ? 700 : 400, minHeight: l === "" ? 7 : undefined }}>{l}</div>;
        })}
        <span style={{ float: "right", display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 10, marginTop: 5, transform: "translateY(3px)" }}>
          <span style={{ fontSize: 11, color: WA.meta }}>10:21</span>
          {out && <DoubleTick size={16} />}
        </span>
      </div>

      {/* interactive-list trigger button (attached inside same bubble visual group) */}
      {msg.listButton && (
        <div style={{ width: "84%", marginTop: 3, background: WA.bubbleIn, borderRadius: 10, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: WA.link, fontSize: 15.5, fontWeight: 600, boxShadow: "0 1px 1px rgba(0,0,0,0.1)", opacity: enter }}>
          <ListIcon size={18} color={WA.link} /> {msg.listButton}
        </div>
      )}

      {/* quick-reply buttons */}
      {msg.buttons && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 3, width: "84%" }}>
          {msg.buttons.map((b, i) => {
            const bEnter = spring({ frame: frame - msg.at - 8 - i * 4, fps, config: { damping: 15, stiffness: 130 }, durationInFrames: 10 });
            if (bEnter <= 0) return null;
            const pressed = msg.tapAt != null && msg.tappedIndex === i && frame >= msg.tapAt;
            const press = pressed ? spring({ frame: frame - msg.tapAt!, fps, config: { damping: 11, stiffness: 200 }, durationInFrames: 10 }) : 0;
            const pScale = pressed ? interpolate(press, [0, 0.5, 1], [1, 0.95, 1]) : 1;
            return (
              <div key={i} style={{ background: pressed ? WA.link : WA.bubbleIn, color: pressed ? "#fff" : WA.link, borderRadius: 10, padding: "11px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 15, fontWeight: 500, boxShadow: "0 1px 1px rgba(0,0,0,0.1)", opacity: bEnter, transform: `scale(${pScale})` }}>
                <Reply size={15} color={pressed ? "#fff" : WA.link} /> <span>{b.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// WhatsApp interactive list bottom-sheet (slot picker)
const ListSheet: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < SHEET.open - 4 || frame > SHEET.close + 10) return null;

  const openS = spring({ frame: frame - SHEET.open, fps, config: { damping: 20, stiffness: 140 }, durationInFrames: 14 });
  const closeS = frame >= SHEET.close ? spring({ frame: frame - SHEET.close, fps, config: { damping: 22, stiffness: 150 }, durationInFrames: 12 }) : 0;
  const prog = openS - closeS; // 0 hidden → 1 open
  const ty = interpolate(prog, [0, 1], [100, 0]);
  const dim = interpolate(prog, [0, 1], [0, 0.4]);

  return (
    <AbsoluteFill style={{ zIndex: 40 }}>
      <AbsoluteFill style={{ background: "#000", opacity: dim }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "68%", background: "#FFFFFF", borderTopLeftRadius: 18, borderTopRightRadius: 18, transform: `translateY(${ty}%)`, display: "flex", flexDirection: "column", boxShadow: "0 -8px 30px rgba(0,0,0,0.18)" }}>
        {/* sheet header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 12px" }}>
          <CloseX size={22} color="#54656F" />
          <span style={{ fontSize: 17, fontWeight: 600, color: WA.ink }}>{SHEET.title}</span>
        </div>
        {/* day section */}
        <div style={{ padding: "6px 16px", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.04em", color: WA.header, background: "#F6F6F6" }}>{SHEET.daySection}</div>
        {/* rows */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {SHEET.rows.map((r, i) => {
            const picked = frame >= SHEET.highlight && i === SHEET.pick;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: "1px solid #F0F2F5", background: picked ? "rgba(0,128,105,0.08)" : "transparent" }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, border: `2px solid ${picked ? WA.header : "#C4CCD1"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {picked && <div style={{ width: 11, height: 11, borderRadius: 6, background: WA.header }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 500, color: WA.ink }}>{r.t}</div>
                  <div style={{ fontSize: 13, color: WA.meta, marginTop: 2 }}>{r.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Bottom-anchored message column — newest messages sit at the bottom and older
// ones clip off the top automatically (real WhatsApp scrolled-to-latest behavior).
const Messages: React.FC = () => {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "10px 12px 6px", overflow: "hidden", zIndex: 1 }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <span style={{ background: "#FFFFFF", color: WA.meta, fontSize: 12, fontWeight: 500, padding: "5px 12px", borderRadius: 8, boxShadow: "0 1px 1px rgba(0,0,0,0.1)" }}>TODAY</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <span style={{ background: "#FCF5D7", color: "#54656F", fontSize: 11.5, padding: "6px 12px", borderRadius: 8, textAlign: "center", maxWidth: "88%", lineHeight: 1.4 }}>🔒 Messages are end-to-end encrypted.</span>
        </div>
        {SCRIPT.map((it, i) => (it.kind === "typing" ? <TypingBubble key={i} item={it} /> : <Bubble key={i} msg={it} />))}
      </div>
    </div>
  );
};

const WhatsAppScreen: React.FC = () => (
  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: WA.chatBg, position: "relative", fontFamily }}>
    <AbsoluteFill style={{ opacity: 0.05, backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><g fill='none' stroke='%23000' stroke-width='1.4'><circle cx='14' cy='16' r='5'/><path d='M44 12h12v12'/><path d='M60 50l8 8'/><circle cx='66' cy='22' r='3'/><path d='M20 56c3-4 8-4 11 0'/><rect x='40' y='44' width='10' height='10' rx='2'/></g></svg>")`, backgroundSize: "80px 80px" }} />

    {/* status bar */}
    <div style={{ height: 26, background: WA.header, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", fontSize: 13, fontWeight: 600, zIndex: 2 }}>
      <span>10:21</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11 }}>
        <span>5G</span>
        <div style={{ width: 22, height: 11, border: "1.4px solid #fff", borderRadius: 3, padding: 1.5 }}><div style={{ width: "82%", height: "100%", background: "#fff", borderRadius: 1 }} /></div>
      </div>
    </div>

    {/* header */}
    <div style={{ height: 60, background: WA.header, color: WA.headerInk, display: "flex", alignItems: "center", padding: "0 12px", gap: 6, zIndex: 2 }}>
      <Chevron size={26} color="#fff" />
      <div style={{ width: 40, height: 40, borderRadius: 20, background: "#1FA855", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: "#fff", marginLeft: 2 }}>C</div>
      <div style={{ flex: 1, marginLeft: 8, lineHeight: 1.15 }}>
        <div style={{ fontSize: 16.5, fontWeight: 600 }}>City Care Clinic</div>
        <div style={{ fontSize: 12.5, color: WA.online }}>online</div>
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "center", paddingRight: 6 }}>
        <VideoIcon size={23} color="#fff" /><PhoneIcon size={20} color="#fff" /><Dots size={20} color="#fff" />
      </div>
    </div>

    <Messages />
    <ListSheet />

    {/* input dock */}
    <div style={{ background: WA.panelBg, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, zIndex: 2 }}>
      <div style={{ flex: 1, background: WA.inputBg, borderRadius: 22, height: 44, display: "flex", alignItems: "center", padding: "0 12px", gap: 10, boxShadow: "0 1px 1px rgba(0,0,0,0.05)" }}>
        <Smiley size={24} color="#54656F" />
        <span style={{ flex: 1, color: "#8696A0", fontSize: 16 }}>Message</span>
        <Attach size={23} color="#54656F" /><Camera size={22} color="#54656F" />
      </div>
      <div style={{ width: 44, height: 44, borderRadius: 22, background: WA.header, display: "flex", alignItems: "center", justifyContent: "center" }}><Mic size={22} color="#fff" /></div>
    </div>
  </div>
);

const Phone: React.FC = () => (
  <div style={{ width: PHONE_W, height: PHONE_H, background: "#000", borderRadius: 52, padding: 12, boxShadow: "0 50px 90px -30px rgba(0,0,0,0.45), 0 0 0 2px rgba(0,0,0,0.06)" }}>
    <div style={{ width: "100%", height: "100%", borderRadius: 42, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 112, height: 30, background: "#000", borderRadius: 16, zIndex: 50 }} />
      <WhatsAppScreen />
    </div>
  </div>
);

export const WhatsAppChat: React.FC = () => {
  const frame = useCurrentFrame();
  const entry = interpolate(frame, [0, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const phoneX = interpolate(entry, [0, 1], [-520, -360]);
  const phoneScale = interpolate(entry, [0, 1], [0.86, 1]);

  return (
    <AbsoluteFill style={{ fontFamily, backgroundColor: COLORS.bg }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", transform: `translateX(${phoneX}px) scale(${phoneScale})` }}><Phone /></div>

        <div style={{ position: "absolute", left: "54%", width: "38%", display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: TYPE.micro, fontWeight: 800, letterSpacing: "0.25em", color: COLORS.accentDeep, fontFamily: "JetBrains Mono, monospace" }}>
            <MaskLine delay={18} durationIn={16}><span>BOOK ON WHATSAPP</span></MaskLine>
          </div>
          <div style={{ fontSize: TYPE.h1, lineHeight: 1.08, fontWeight: 800, letterSpacing: "-0.03em", color: COLORS.ink }}>
            <MaskLine delay={34} durationIn={20}><span>Patients book a</span></MaskLine>
            <MaskLine delay={50} durationIn={20}><span>doctor in <span style={{ color: COLORS.accent }}>seconds.</span></span></MaskLine>
          </div>
          <p style={{ fontSize: 22, lineHeight: 1.5, color: COLORS.dim, margin: 0, maxWidth: 480, opacity: interpolate(frame, [70, 92], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            Pick a doctor, choose an open slot, confirm — no calls, no hold music. The bot handles every booking 24/7.
          </p>

          {/* live captions that track the flow */}
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10, fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 600 }}>
            {[
              { at: 116, label: "01 — Choose doctor" },
              { at: 196, label: "02 — Pick a time slot" },
              { at: 290, label: "03 — Confirm patient" },
              { at: 358, label: "04 — Booked ✓" },
            ].map((s, i) => {
              const on = frame >= s.at;
              const done = frame >= ([196, 290, 358, 9999][i]);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: on ? 1 : 0.25, transition: "opacity 0.2s", color: done ? COLORS.accent : COLORS.ink }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: on ? COLORS.accent : COLORS.lineStrong }} />
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
