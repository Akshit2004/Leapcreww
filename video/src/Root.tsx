import React from "react";
import { Composition } from "remotion";
import { Promo } from "./Promo";
import { DURATION, FPS } from "./lib/beat";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Promo"
      component={Promo}
      durationInFrames={DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
