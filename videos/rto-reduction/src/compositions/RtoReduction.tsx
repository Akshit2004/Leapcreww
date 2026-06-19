import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { HookScene } from "./scenes/HookScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { SilentWatcherScene } from "./scenes/SilentWatcherScene";
import { FulfillmentHoldScene } from "./scenes/FulfillmentHoldScene";
import { CodConfirmScene } from "./scenes/CodConfirmScene";
import { PrepaidOfferScene } from "./scenes/PrepaidOfferScene";
import { AddressFixScene } from "./scenes/AddressFixScene";
import { NdrRescueScene } from "./scenes/NdrRescueScene";
import { AnalyticsScene } from "./scenes/AnalyticsScene";
import { CtaScene } from "./scenes/CtaScene";

// Scene durations (30fps):
// Hook 180 + Problem 240 + SilentWatcher 240 + FulfillmentHold 300 + CodConfirm 300
// + PrepaidOffer 300 + AddressFix 300 + NdrRescue 300 + Analytics 240 + CTA 150 = 2550
// 9 transitions × 20 frames = -180
// Total = 2370 frames ≈ 79 seconds

const TRANSITION = linearTiming({ durationInFrames: 20 });

export const RtoReduction: React.FC = () => {
  const frame = useCurrentFrame();

  const musicVolume = interpolate(
    frame,
    [0, 30, 2340, 2370],
    [0, 0.35, 0.35, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Audio src={staticFile("beat.wav")} volume={musicVolume} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={180} name="Hook">
          <HookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={240} name="Problem">
          <ProblemScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={240} name="SilentWatcher">
          <SilentWatcherScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={300} name="FulfillmentHold">
          <FulfillmentHoldScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={300} name="CodConfirm">
          <CodConfirmScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={300} name="PrepaidOffer">
          <PrepaidOfferScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={300} name="AddressFix">
          <AddressFixScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={300} name="NdrRescue">
          <NdrRescueScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={TRANSITION} />

        <TransitionSeries.Sequence durationInFrames={240} name="Analytics">
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
