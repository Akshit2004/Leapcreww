import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const DURATION = 30; // 30s
const BPM = 120;
const SPB = 60 / BPM; // 0.5s per beat
const N = Math.floor(SR * DURATION);
const buf = new Float32Array(N);

const TWO_PI = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Deterministic random
let seed = 0xbeef;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 0xffffffff) * 2 - 1;
};

// Lowpass filter
let lpPrev = 0;
function applyLowpass(samples, cutoffSweep) {
  let prev = 0;
  for (let i = 0; i < samples.length; i++) {
    const p = i / samples.length;
    const hz = cutoffSweep(p);
    const dt = 1 / SR;
    const rc = 1 / (TWO_PI * hz);
    const alpha = dt / (rc + dt);
    samples[i] = prev + alpha * (samples[i] - prev);
    prev = samples[i];
  }
}

// Voices
function add(t, dur, fn, gain = 1) {
  const start = Math.floor(t * SR);
  const len = Math.floor(dur * SR);
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= N) continue;
    const s = i / SR;
    buf[idx] += fn(s, s / dur) * gain;
  }
}

// Warm sub-kick
function kick(t, gain = 0.6) {
  add(t, 0.3, (s, p) => {
    const freq = 90 * Math.exp(-22 * s) + 40;
    const env = Math.exp(-5.5 * p);
    return Math.sin(TWO_PI * freq * s) * env;
  }, gain);
}

// Subtle timekeeper tick
function tick(t, gain = 0.1) {
  add(t, 0.02, (s, p) => {
    return rand() * Math.exp(-80 * p);
  }, gain);
}

// Rhodes chords
function rhodesChord(t, dur, freqs, gain = 0.45) {
  add(t, dur, (s, p) => {
    let out = 0;
    const tremolo = 1 + 0.1 * Math.sin(TWO_PI * 5 * s); // 5Hz LFO
    const env = p < 0.15 ? p / 0.15 : Math.exp(-1.8 * (p - 0.15)); // Slow attack, sustained decay
    
    for (const f of freqs) {
      const fund = Math.sin(TWO_PI * f * s);
      const harm2 = Math.sin(TWO_PI * f * 2 * s) * 0.1;
      const harm3 = Math.sin(TWO_PI * f * 3 * s) * 0.05;
      out += (fund + harm2 + harm3) * env * tremolo;
    }
    return (out / freqs.length) * 0.8;
  }, gain);
}

// Low sub bass drone
function subDrone(t, dur, freq, gain = 0.35) {
  add(t, dur, (s, p) => {
    const env = p < 0.1 ? p / 0.1 : Math.exp(-1.2 * (p - 0.1));
    return Math.sin(TWO_PI * freq * s) * env;
  }, gain);
}

// Ominous tension drone (Act I) — a low detuned dyad that swells, no resolution.
function tensionDrone(t, dur, freq, gain = 0.3) {
  add(t, dur, (s, p) => {
    const swell = Math.min(1, p / 0.85); // long rise across the whole act
    const a = Math.sin(TWO_PI * freq * s);
    const b = Math.sin(TWO_PI * freq * 1.003 * s); // slow beating detune = unease
    const tritone = Math.sin(TWO_PI * freq * 1.414 * s) * 0.25; // the "unread" dissonance
    return (a + b + tritone) * swell;
  }, gain);
}

// Noise riser — sweeps up into the drop. Sells the dark→light release.
function riser(t, dur, gain = 0.22) {
  add(t, dur, (s, p) => {
    const hp = rand() * (0.2 + p * 0.8);      // brightening noise
    const tone = Math.sin(TWO_PI * (200 + p * p * 1400) * s) * 0.4; // rising pitch
    const env = p * p;                          // accelerating swell
    return (hp * 0.6 + tone) * env;
  }, gain);
}

// Impact — the downbeat of the drop. A kick with a bright transient on top.
function impact(t, gain = 1) {
  kick(t, 0.9 * gain);
  add(t, 0.18, (s, p) => {
    const body = Math.sin(TWO_PI * (180 * Math.exp(-30 * s) + 60) * s);
    const noise = rand() * Math.exp(-26 * p) * 0.5;
    return (body + noise) * Math.exp(-7 * p);
  }, 0.5 * gain);
}

const A_MIN = [110, 130.81, 164.81, 196.00];  // Am7
const D_MAJ = [146.83, 185.00, 220.00, 277.18]; // Dmaj7
const G_MAJ = [98.00, 146.83, 196.00, 246.94];  // Gmaj7
const C_MAJ = [130.81, 164.81, 196.00, 261.63]; // Cmaj7

const CHORDS = [A_MIN, D_MAJ, G_MAJ, C_MAJ];
const BASS_FREQS = [55.0, 73.42, 49.0, 65.41]; // A1, D2, G1, C2

// --- Arrangement keyed to the five-act structure ---
//   Act I  (0–5s)   The Pile-Up : tense, muffled, no kick — a rising drone + riser.
//   DROP   (5s)     The Leap     : impact; the groove ignites.
//   Act III(9–20s)  The Machine  : full groove, kicks + chords every bar.
//   Act IV (20–25s) The Payoff   : breakdown — kick drops out, pads breathe, lift.
//   Act V  (25–30s) Resolve      : the chord lands and rings out.

const DROP_T = 5;       // f150
const BREAKDOWN_T = 20; // f600

// Act I — tension. A timekeeper that never stops + a swelling dissonant drone.
for (let beat = 0; beat < DROP_T / SPB; beat++) {
  const t = beat * SPB;
  tick(t, 0.12); // the antagonist: the clock that keeps climbing
}
tensionDrone(0, DROP_T, 55, 0.3);             // A1 low unease across the whole act
riser(DROP_T - 1.2, 1.2, 0.26);              // sweep up into the drop

// The drop — dark breaks to light.
impact(DROP_T, 1);

// Groove — chord changes every bar (2s), anchored to the drop so the downbeat lands at 5s.
let chordIdx = 0;
for (let t = DROP_T; t < BREAKDOWN_T; t += SPB * 4) {
  const chord = CHORDS[chordIdx % CHORDS.length];
  const bassFreq = BASS_FREQS[chordIdx % BASS_FREQS.length];
  kick(t, 0.78);
  rhodesChord(t, SPB * 4 * 0.98, chord, 0.46);
  subDrone(t, SPB * 4 * 0.98, bassFreq, 0.36);
  chordIdx++;
}
// Keep the timekeeper through the groove too.
for (let beat = DROP_T / SPB; beat < BREAKDOWN_T / SPB; beat++) {
  tick(beat * SPB, 0.08);
}

// Act IV — breakdown. The kick drops out; the pads hold and breathe over the payoff.
for (let t = BREAKDOWN_T; t < 26; t += SPB * 4) {
  const chord = CHORDS[chordIdx % CHORDS.length];
  const bassFreq = BASS_FREQS[chordIdx % BASS_FREQS.length];
  rhodesChord(t, SPB * 4 * 0.98, chord, 0.4);
  subDrone(t, SPB * 4 * 0.98, bassFreq, 0.3);
  chordIdx++;
}

// Act V — resolve. One last gentle kick and a chord that rings out to the end.
kick(26, 0.55);
rhodesChord(26, 4 * 0.98, C_MAJ, 0.5);   // home chord
subDrone(26, 4 * 0.98, 65.41, 0.34);     // C2

// Master Filter Sweep — muffled in tension, slams open on the drop, dips for the
// breakdown, lifts for the resolve.
const sweepCurve = (p) => {
  const t = p * DURATION;
  if (t < DROP_T - 1.2) return 600;                 // Act I: muffled, claustrophobic
  if (t < DROP_T) {
    const k = (t - (DROP_T - 1.2)) / 1.2;
    return 600 + k * 200;                           // brief choke right before the drop
  }
  if (t < BREAKDOWN_T) return 2600;                 // Act III: wide open groove
  if (t < BREAKDOWN_T + 1.5) {
    const k = (t - BREAKDOWN_T) / 1.5;
    return 2600 - k * 1800;                         // breakdown: pull the light back
  }
  if (t < 26) {
    const k = (t - (BREAKDOWN_T + 1.5)) / 4.5;
    return 800 + k * 1600;                          // slow lift through the payoff
  }
  return 2400;                                       // resolve: open, settled
};

// Soft-clip, Normalize & Lowpass
let peak = 0;
for (let i = 0; i < N; i++) {
  buf[i] = Math.tanh(buf[i] * 0.95);
  const a = Math.abs(buf[i]);
  if (a > peak) peak = a;
}

const norm = peak > 0 ? 0.92 / peak : 1;
for (let i = 0; i < N; i++) {
  buf[i] *= norm;
}

applyLowpass(buf, sweepCurve);

// Fade edges
const fade = Math.floor(0.05 * SR);
for (let i = 0; i < N; i++) {
  let g = 1;
  if (i < fade) g *= i / fade;
  if (i > N - fade) g *= (N - i) / fade;
  buf[i] *= g;
}

// Write 16-bit PCM mono WAV
function writeWav(samples) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const out = Buffer.alloc(44 + dataSize);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + dataSize, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * bytesPerSample, 28);
  out.writeUInt16LE(bytesPerSample, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = clamp(samples[i], -1, 1);
    out.writeInt16LE((v < 0 ? v * 0x8000 : v * 0x7fff) | 0, 44 + i * 2);
  }
  return out;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../public/beat.wav");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, writeWav(buf));
console.log(`Wrote ${outPath} (${(buf.length / SR).toFixed(1)}s @ ${BPM} BPM)`);
