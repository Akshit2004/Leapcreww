import React from "react";
import { Composition } from "remotion";
import { CartRecovery } from "./compositions/CartRecovery";

// 70 seconds × 30fps = 2100 frames — 9:16 portrait for social
export const RemotionRoot: React.FC = () => (
  <Composition
    id="CartRecovery"
    component={CartRecovery}
    durationInFrames={1980}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{}}
  />
);
