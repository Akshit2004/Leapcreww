import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const { fontFamily } = loadInter("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export const { fontFamily: fontFamilyMono } = loadMono("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

// Playbook 2: Swiss System (Rationalist & Technical)
export const COLORS = {
  bg: "#F8F9FA",        // Light cool gray canvas
  bgRaised: "#FFFFFF",  // Pure white paper surface
  ink: "#000000",       // Pitch black ink
  dim: "rgba(0, 0, 0, 0.65)",
  faint: "rgba(0, 0, 0, 0.35)",
  line: "#E5E5E5",      // Crisp structural lines
  lineStrong: "#CCCCCC", // Stronger borders
  
  // High-visibility Blue Accent
  accent: "#0055FF",    
  accentDeep: "#0033CC",
  accentGlow: "rgba(0, 85, 255, 0.08)",
  accentFaint: "rgba(0, 85, 255, 0.04)",

  // --- Dark "Friction" Palette (Act I) ---
  // We keep a dark chaotic grid for Act I to contrast the perfect white grid later.
  darkBg: "#000000",      // Pure black canvas
  darkRaised: "#111111",  // Lifted dark surface 
  darkInk: "#FFFFFF",     // Pure white type on dark
  darkDim: "rgba(255, 255, 255, 0.65)",
  darkFaint: "rgba(255, 255, 255, 0.30)",
  darkLine: "#222222",
  darkLineStrong: "#333333",
  danger: "#FF0000",      // Pure vibrant red (unread queues/hold alerts)
  dangerGlow: "rgba(255, 0, 0, 0.22)",
};

// Structural typography scale (Multiples of 8 where possible)
export const TYPE = {
  mega: 160,
  display: 112,
  h1: 80,
  h2: 48,
  body: 24,
  label: 16,
  micro: 12,
};

// Precise, technical easing
export const EASE = {
  outExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOutQuint: [0.83, 0, 0.17, 1] as [number, number, number, number],
  outBack: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
};
