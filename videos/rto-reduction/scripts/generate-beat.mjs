/**
 * Procedural lofi beat generator — pure Node.js, no dependencies.
 * Outputs a stereo 44.1 kHz 16-bit WAV file.
 *
 * Design goals:
 *  - BPM 72 (slow, dreamy)
 *  - No high-pitch elements — all frequencies below 500 Hz
 *  - Instruments: kick, soft snare thud, sub-bass, warm pad chords, kalimba melody
 *  - 86 seconds (covers 79-second video with fade headroom)
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Constants ──────────────────────────────────────────────────────────────
const SR       = 44100;   // sample rate (Hz)
const CH       = 2;       // stereo
const BITS     = 16;
const BPM      = 72;
const DURATION = 86;      // seconds

const TOTAL = SR * DURATION;
const spb   = (SR * 60) / BPM;   // samples per beat
const spbar = spb * 4;            // samples per bar (4/4)

// Main float buffer (stereo interleaved)
const buf = new Float32Array(TOTAL * CH);

// ── Helpers ────────────────────────────────────────────────────────────────

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Add `value` to buffer at sample index `si`, both channels, with optional pan (-1…1) */
function write(si, value, pan = 0) {
  const i = si * CH;
  if (i < 0 || i + 1 >= buf.length) return;
  buf[i    ] += value * clamp(1 - pan * 0.6, 0, 1);
  buf[i + 1] += value * clamp(1 + pan * 0.6, 0, 1);
}

/** Pure sine wave at `freq` Hz evaluated at time `t` (seconds) */
const sin  = (freq, t)        => Math.sin(2 * Math.PI * freq * t);

/** Exponential decay envelope starting at 1.0 */
const expD = (t, halfLife)    => Math.exp(-t * Math.LN2 / halfLife);

/** Linear ramp from 0 → 1 over `attackSec` seconds */
const linA = (i, attackSamples) => Math.min(1, i / Math.max(1, attackSamples));

// ── Instruments ────────────────────────────────────────────────────────────

function kick(start, vol = 0.62) {
  const dur = Math.floor(SR * 0.28);
  for (let i = 0; i < dur; i++) {
    const t   = i / SR;
    const freq = 90 * Math.pow(32 / 90, t / 0.28);
    const env  = expD(t, 0.045) * vol;
    write(start + i, sin(freq, t) * env);
  }
}

function snare(start, vol = 0.22) {
  const dur = Math.floor(SR * 0.10);
  for (let i = 0; i < dur; i++) {
    const t   = i / SR;
    const env  = expD(t, 0.025) * vol;
    const tone = sin(175, t) * 0.65;
    const noise = ((Math.random() + Math.random() + Math.random()) / 3 * 2 - 1) * 0.35;
    write(start + i, (tone + noise) * env);
  }
}

function bass(start, freq, durSamples, vol = 0.36) {
  const fade = Math.floor(SR * 0.015);
  for (let i = 0; i < durSamples; i++) {
    const t   = i / SR;
    const env  = Math.min(linA(i, fade), linA(durSamples - i, fade));
    const v    = (sin(freq, t) * 0.70 + sin(freq * 2, t) * 0.22 + sin(freq * 3, t) * 0.08)
                 * env * vol;
    write(start + i, v);
  }
}

function pad(start, freqs, durSamples, vol = 0.13) {
  const att = Math.floor(SR * 0.50);
  const rel = Math.floor(SR * 0.60);
  for (let i = 0; i < durSamples; i++) {
    let env;
    if      (i < att)                    env = i / att;
    else if (i > durSamples - rel)       env = Math.max(0, (durSamples - i) / rel);
    else                                 env = 1;

    let v = 0;
    for (const f of freqs) {
      v += sin(f,     i / SR) * 1.00;
      v += sin(f * 2, i / SR) * 0.20;
    }
    v = (v / freqs.length) * env * vol;
    write(start + i, v, (freqs.length % 2 === 0 ? 0 : 0.05));
  }
}

function melody(start, freq, durSamples, vol = 0.24, pan = 0) {
  const att     = Math.floor(SR * 0.005);
  const halfLife = 0.30;
  for (let i = 0; i < durSamples; i++) {
    const t   = i / SR;
    const env  = linA(i, att) * expD(t, halfLife) * vol;
    const v    = sin(freq,     t) * 0.60
               + sin(freq * 2, t) * 0.26
               + sin(freq * 3, t) * 0.14;
    write(start + i, v * env, pan);
  }
}

// ── Chord progression ──────────────────────────────────────────────────────
//  4-bar loop in C major:  Cmaj7 → Am7 → Fmaj7 → G7

const bassRoots = [65.41, 55.00, 87.31, 98.00];

const padChords = [
  [130.81, 164.81, 196.00, 246.94],
  [110.00, 130.81, 164.81, 196.00],
  [ 87.31, 110.00, 130.81, 164.81],
  [ 98.00, 123.47, 146.83, 174.61],
];

const melNotes = [
  [164.81, 146.83, 130.81, 164.81],
  [220.00, 196.00, 164.81, 130.81],
  [174.61, 220.00, 130.81, 164.81],
  [196.00, 220.00, 196.00, 164.81],
];

const melPan = [0.10, -0.10, 0.15, -0.05];

// ── Composition ────────────────────────────────────────────────────────────

const numBars = Math.ceil(TOTAL / spbar) + 1;

for (let bar = 0; bar < numBars; bar++) {
  const ci = bar % 4;
  const bs = Math.floor(bar * spbar);
  if (bs >= TOTAL) break;

  const padDur = Math.min(Math.floor(spbar), TOTAL - bs);
  pad(bs, padChords[ci], padDur);

  for (let beat = 0; beat < 4; beat++) {
    const beatStart = bs + Math.floor(beat * spb);
    if (beatStart >= TOTAL) break;

    if (beat === 0 || beat === 2) kick(beatStart);
    if (beat === 1 || beat === 3) snare(beatStart);

    const bassDur = Math.min(Math.floor(spb * 0.82), TOTAL - beatStart);
    bass(beatStart, bassRoots[ci], bassDur);

    const melDur = Math.min(Math.floor(spb * 1.1), TOTAL - beatStart);
    melody(beatStart, melNotes[ci][beat], melDur, 0.24, melPan[beat % 4]);
  }
}

// ── Mastering ──────────────────────────────────────────────────────────────

for (let i = 0; i < buf.length; i++) {
  buf[i] = Math.tanh(buf[i] * 1.25) * 0.80;
}

const fadeInS  = SR * 2;
const fadeOutS = SR * 4;
for (let s = 0; s < TOTAL; s++) {
  let g = 1;
  if (s < fadeInS)           g = s / fadeInS;
  if (s > TOTAL - fadeOutS)  g = (TOTAL - s) / fadeOutS;
  buf[s * CH    ] *= g;
  buf[s * CH + 1] *= g;
}

// ── WAV export ─────────────────────────────────────────────────────────────

const i16 = new Int16Array(TOTAL * CH);
for (let i = 0; i < buf.length; i++) {
  i16[i] = Math.round(clamp(buf[i], -1, 1) * 32767);
}

const dataSize = i16.byteLength;
const wav      = Buffer.alloc(44 + dataSize);

wav.write("RIFF", 0);
wav.writeUInt32LE(36 + dataSize, 4);
wav.write("WAVE", 8);
wav.write("fmt ", 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(CH, 22);
wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * CH * BITS / 8, 28);
wav.writeUInt16LE(CH * BITS / 8, 32);
wav.writeUInt16LE(BITS, 34);
wav.write("data", 36);
wav.writeUInt32LE(dataSize, 40);
Buffer.from(i16.buffer).copy(wav, 44);

const outDir = join(__dirname, "../public");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "beat.wav");
writeFileSync(outPath, wav);

const mb = (wav.length / 1024 / 1024).toFixed(1);
console.log(`✓ beat.wav  →  ${outPath}`);
console.log(`  ${DURATION}s · ${BPM} BPM · stereo 44.1 kHz 16-bit · ${mb} MB`);
console.log(`  Instruments: kick, soft-snare, sub-bass, warm-pad, kalimba melody`);
console.log(`  Chord loop: Cmaj7 → Am7 → Fmaj7 → G7`);
