import React from "react";
import { Composition } from "remotion";
import { PepsiShort } from "./videos/pepsi/Short";
import { TOTAL, FPS } from "./videos/pepsi/story";

// 1080 x 1920 vertical; `npm run render` upscales x1.3333 to 1440 x 2560 (every post parameter scales with the output size).
export const Root: React.FC = () => (
  <Composition id="PepsiShort" component={PepsiShort} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
);
