import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";

export const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export const { fontFamily: fontFamilySerif } = loadSerif("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

// Editorial Swiss System light-mode palette (HSL shift based)
export const COLORS = {
  bg: "#FAF9F5",        // Warm gallery cream canvas
  bgRaised: "#FFFFFF",  // Pure white paper surface
  ink: "#1A1A1A",       // Rich charcoal ink
  dim: "rgba(26, 26, 26, 0.65)",
  faint: "rgba(26, 26, 26, 0.35)",
  line: "rgba(26, 26, 26, 0.08)",       // Razor thin subtle lines
  lineStrong: "rgba(26, 26, 26, 0.15)", // Border dividers
  accent: "#10b981",    // Emerald green
  accentDeep: "#059669",
  accentGlow: "rgba(16, 185, 129, 0.08)",
  accentFaint: "rgba(16, 185, 129, 0.04)",

  // --- Dark "problem" palette (Act I → the night of Act IV) ---
  darkBg: "#0A0A0B",      // Near-black ink canvas
  darkRaised: "#161618",  // Lifted dark surface (cards, phone chassis)
  darkInk: "#F5F4F0",     // Off-white type on dark
  darkDim: "rgba(245, 244, 240, 0.62)",
  darkFaint: "rgba(245, 244, 240, 0.30)",
  darkLine: "rgba(245, 244, 240, 0.10)",
  darkLineStrong: "rgba(245, 244, 240, 0.18)",
  danger: "#ef4444",      // The unread counter — the antagonist
  dangerGlow: "rgba(239, 68, 68, 0.22)",
};

// Editorial typography scale
export const TYPE = {
  mega: 180,
  display: 110,
  h1: 76,
  h2: 52,
  body: 26,
  label: 18,
  micro: 14,
};

export const EASE = {
  outExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOutQuint: [0.83, 0, 0.17, 1] as [number, number, number, number],
  outBack: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
};
