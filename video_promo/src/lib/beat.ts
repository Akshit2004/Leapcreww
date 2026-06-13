export const FPS = 30;
export const BPM = 120;
export const DURATION_S = 30;

export const FPB = (FPS * 60) / BPM; // 15 frames per beat
export const FPBAR = FPB * 4; // 60 frames per bar (2s)
export const DURATION = FPS * DURATION_S; // 900 frames

// Scene timing boundaries (in frames)
export const SCENES = {
  pileup: { from: 0, dur: 150 },      // 0–5s    Act I   · Tension / Reception hold friction
  leap: { from: 150, dur: 120 },      // 5–9s    Act II  · Drop / White radial flood transition
  booking: { from: 270, dur: 360 },   // 9–21s   Act III · WhatsApp chat booking simulation
  paymentsync: { from: 630, dur: 150 },// 21–26s  Act IV  · Payment check & hospital dashboard sync
  resolve: { from: 780, dur: 120 }    // 26–30s  Act V   · Brand lockup & CTA
} as const;

export const DROP = SCENES.leap.from; // 150 (5s)
export const BREAKDOWN = SCENES.paymentsync.from; // 630 (21s)

// Sub-boundaries inside Act V (Resolve splits into coming soon card and end CTA card)
export const RESOLVE = {
  statement: { from: SCENES.resolve.from, dur: 50 }, // 780–830
  end: { from: SCENES.resolve.from + 50, dur: 70 }, // 830–900
} as const;

/** Position within the current beat, 0 (hit) → 1 (next hit). */
export const beatPhase = (frame: number) => (frame % FPB) / FPB;

/** 1 on the beat, decaying toward 0 — drives scale pulses and glows. */
export const beatPulse = (frame: number, decay = 4) =>
  Math.exp(-decay * beatPhase(frame));

/** Index of the beat the frame falls on. */
export const beatIndex = (frame: number) => Math.floor(frame / FPB);
