import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const DURATION = 30; // 30s
const BPM = 124;
const SPB = 60 / BPM; // 0.5s per beat
const N = Math.floor(SR * DURATION);
const buf = new Float32Array(N);

const TWO_PI = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Deterministic random
let seed = 0xcafe;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 0xffffffff) * 2 - 1;
};

// Lowpass filter
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
    const tritone = Math.sin(TWO_PI * freq * 1.414 * s) * 0.25; // dissonance
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

// Impact — the downbeat of the drop.
function impact(t, gain = 1) {
  kick(t, 0.9 * gain);
  add(t, 0.18, (s, p) => {
    const body = Math.sin(TWO_PI * (180 * Math.exp(-30 * s) + 60) * s);
    const noise = rand() * Math.exp(-26 * p) * 0.5;
    return (body + noise) * Math.exp(-7 * p);
  }, 0.5 * gain);
}

// Closed hi-hat — crisp offbeat shimmer for the groove.
function hihat(t, gain = 0.12, decay = 60) {
  add(t, 0.06, (s, p) => {
    const noise = rand();
    const shimmer = Math.sin(TWO_PI * 8000 * s) * 0.3;
    return (noise + shimmer) * Math.exp(-decay * p);
  }, gain);
}

// Layered clap/snare backbone on beats 2 & 4.
function clap(t, gain = 0.3) {
  add(t, 0.14, (s, p) => {
    const burst = rand() * Math.exp(-34 * p);
    const tone = Math.sin(TWO_PI * 1800 * s) * Math.exp(-22 * p) * 0.2;
    return burst + tone;
  }, gain);
}

// Bright plucked arpeggio note (efficient, technical sparkle).
function pluck(t, freq, gain = 0.22) {
  add(t, 0.42, (s, p) => {
    const env = Math.exp(-6 * p);
    const tone = Math.sin(TWO_PI * freq * s) + Math.sin(TWO_PI * freq * 2 * s) * 0.18;
    return tone * env;
  }, gain);
}

// Brighter, uplifting progression: Cmaj7 – Gmaj7 – Am7 – Fmaj7 (I–V–vi–IV).
const C_MAJ = [130.81, 164.81, 196.00, 261.63]; // Cmaj7
const G_MAJ = [98.00, 146.83, 196.00, 246.94];  // Gmaj7
const A_MIN = [110, 130.81, 164.81, 196.00];    // Am7
const F_MAJ = [87.31, 130.81, 174.61, 220.00];  // Fmaj7

const CHORDS = [C_MAJ, G_MAJ, A_MIN, F_MAJ];
const BASS_FREQS = [65.41, 49.0, 55.0, 43.65];  // C2, G1, A1, F1

// Arp note pools per chord (one octave up) for the plucky topline.
const ARPS = [
  [261.63, 329.63, 392.00, 523.25], // C
  [392.00, 293.66, 493.88, 587.33], // G
  [220.00, 329.63, 440.00, 523.25], // Am
  [349.23, 261.63, 440.00, 523.25], // F
];

const DROP_T = 5;        // 5s (f150) — brand drop
const BREAKDOWN_T = 22;  // 22s (f660) — showcase breakdown

// Act I — tension. Ticking + drone
for (let beat = 0; beat < DROP_T / SPB; beat++) {
  const t = beat * SPB;
  tick(t, 0.14);
}
tensionDrone(0, DROP_T, 55, 0.32);
riser(DROP_T - 1.2, 1.2, 0.28);

// The drop
impact(DROP_T, 1);

// Act III — Groove: four-on-the-floor + claps + hats + plucky arpeggio
let chordIdx = 0;
for (let t = DROP_T; t < BREAKDOWN_T; t += SPB * 4) {
  const chord = CHORDS[chordIdx % CHORDS.length];
  const bassFreq = BASS_FREQS[chordIdx % BASS_FREQS.length];
  const arp = ARPS[chordIdx % ARPS.length];
  rhodesChord(t, SPB * 4 * 0.98, chord, 0.38);
  subDrone(t, SPB * 4 * 0.98, bassFreq, 0.36);
  for (let b = 0; b < 4; b++) {
    const bt = t + b * SPB;
    if (b % 2 === 0) kick(bt, 0.8);   // beats 1 & 3
    if (b % 2 === 1) clap(bt, 0.27);  // beats 2 & 4
    hihat(bt, 0.09);
    hihat(bt + SPB / 2, 0.13);        // accented offbeat
  }
  for (let e = 0; e < 8; e++) {
    pluck(t + e * (SPB / 2), arp[e % arp.length], 0.17);
  }
  chordIdx++;
}

// Act IV — Breakdown: pull the drums back, let the arp breathe
for (let t = BREAKDOWN_T; t < 26; t += SPB * 4) {
  const chord = CHORDS[chordIdx % CHORDS.length];
  const bassFreq = BASS_FREQS[chordIdx % BASS_FREQS.length];
  const arp = ARPS[chordIdx % ARPS.length];
  rhodesChord(t, SPB * 4 * 0.98, chord, 0.40);
  subDrone(t, SPB * 4 * 0.98, bassFreq, 0.30);
  for (let b = 0; b < 4; b++) {
    const bt = t + b * SPB;
    kick(bt, 0.45);
    hihat(bt + SPB / 2, 0.08);
  }
  for (let e = 0; e < 4; e++) pluck(t + e * SPB, arp[e % arp.length], 0.14);
  chordIdx++;
}

// Act V — Resolve: final chord rings out with a gentle arp tail
kick(26, 0.6);
rhodesChord(26, 4 * 0.98, C_MAJ, 0.52);
subDrone(26, 4 * 0.98, 65.41, 0.36);
pluck(26, 523.25, 0.18);
pluck(26.5, 659.25, 0.16);
pluck(27, 783.99, 0.13);

// Master Filter Sweep
const sweepCurve = (p) => {
  const t = p * DURATION;
  if (t < DROP_T - 1.2) return 550;
  if (t < DROP_T) {
    const k = (t - (DROP_T - 1.2)) / 1.2;
    return 550 + k * 250;
  }
  if (t < BREAKDOWN_T) return 2800;
  if (t < BREAKDOWN_T + 1.5) {
    const k = (t - BREAKDOWN_T) / 1.5;
    return 2800 - k * 1900;
  }
  if (t < 26) {
    const k = (t - (BREAKDOWN_T + 1.5)) / 4.5;
    return 900 + k * 1700;
  }
  return 2500;
};

// Soft-clip, Normalize & Filter
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

// Write 16-bit PCM WAV
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
