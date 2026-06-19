import React from "react";
import { Composition } from "remotion";
import { RtoReduction } from "./compositions/RtoReduction";

// 79 seconds × 30fps = 2370 frames — 9:16 portrait for social
export const RemotionRoot: React.FC = () => (
  <Composition
    id="RtoReduction"
    component={RtoReduction}
    durationInFrames={2370}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{}}
  />
);
