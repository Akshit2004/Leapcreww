import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { IntroScene } from "./scenes/IntroScene";
import { HookScene } from "./scenes/HookScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { SolutionScene } from "./scenes/SolutionScene";
import { T1Scene } from "./scenes/T1Scene";
import { T2Scene } from "./scenes/T2Scene";
import { T3Scene } from "./scenes/T3Scene";
import { ConversionScene } from "./scenes/ConversionScene";
import { AnalyticsScene } from "./scenes/AnalyticsScene";
import { CtaScene } from "./scenes/CtaScene";

// Scene durations (30fps):
// Intro 60 + Hook 150 + Problem 210 + Solution 180 + T1 300 + T2 300 + T3 300
// + Conversion 210 + Analytics 300 + CTA 150 = 2160
// 9 transitions × 20 frames = -180
// Total = 1980 frames ≈ 66 seconds

const TRANSITION = linearTiming({ durationInFrames: 20 });

export const CartRecovery: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade music in over first 30 frames, out over last 30 frames
  const musicVolume = interpolate(
    frame,
    [0, 30, 1950, 1980],
    [0, 0.35, 0.35, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/*
        Drop a royalty-free lofi/chill beat as `public/beat.mp3`.
        Recommended: search "lofi chill beat no copyright" on Pixabay or
        YouTube Audio Library and download an instrumental track.
        Keep it low volume (0.35) so it sits under voiceover.
      */}
      <Audio src={staticFile("beat.wav")} volume={musicVolume} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={60} name="Intro">
          <IntroScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={150} name="Hook">
          <HookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={210} name="Problem">
          <ProblemScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={180} name="Solution">
          <SolutionScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={300} name="T1-30min">
          <T1Scene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={300} name="T2-3hrs">
          <T2Scene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={300} name="T3-24hrs">
          <T3Scene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={210} name="Conversion">
          <ConversionScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={300} name="Analytics">
          <AnalyticsScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={150} name="CTA">
          <CtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
