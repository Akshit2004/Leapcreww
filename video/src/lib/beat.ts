/**
 * Beat grid — the single source of truth that keeps the visuals locked to
 * make-beat.mjs. Same BPM, same scene boundaries.
 */
export const FPS = 30;
export const BPM = 120;
export const DURATION_S = 30;

export const FPB = (FPS * 60) / BPM; // frames per beat = 15
export const FPBAR = FPB * 4; // 60
export const DURATION = FPS * DURATION_S; // 900

// Scene boundaries in frames — the five-act arc (mirror make-beat.mjs sections).
// Color carries the arc: pileup is dark, the leap floods to light, the rest is light.
export const SCENES = {
  pileup: { from: 0, dur: 150 }, // 0–5s    Act I  · The Pile-Up   (dark / tension)
  leap: { from: 150, dur: 120 }, // 5–9s    Act II · The Leap      (light flood / turn)
  machine: { from: 270, dur: 330 }, // 9–20s   Act III· The Machine   (one control-room move)
  payoff: { from: 600, dur: 150 }, // 20–25s  Act IV · The Payoff    (night / self-climbing proof)
  resolve: { from: 750, dur: 150 }, // 25–30s  Act V  · Resolve       (brand + CTA)
} as const;

// The single biggest beat in the film: the dark→light flood on the turn.
export const DROP = SCENES.leap.from; // 150 / 5s
// Act IV breakdown — the music opens back up for the payoff.
export const BREAKDOWN = SCENES.payoff.from; // 600 / 20s

// Sub-boundaries inside Act V (Resolve splits into a statement card then the lockup).
export const RESOLVE = {
  coming: { from: SCENES.resolve.from, dur: 60 }, // 750–752... 750–810 / 25–27s
  end: { from: SCENES.resolve.from + 60, dur: 90 }, // 810–900 / 27–30s
} as const;

/** Position within the current beat, 0 (hit) → 1 (next hit). */
export const beatPhase = (frame: number) => (frame % FPB) / FPB;

/** 1 on the beat, decaying toward 0 — drives glow / scale pulses. */
export const beatPulse = (frame: number, decay = 4) =>
  Math.exp(-decay * beatPhase(frame));

/** Index of the beat the frame falls on. */
export const beatIndex = (frame: number) => Math.floor(frame / FPB);

/** Frames since the start of a scene's containing sequence. */
export const sceneFrames = (s: keyof typeof SCENES) => SCENES[s];
