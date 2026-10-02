import React from "react";
import { Composition, staticFile } from "remotion";
import { MasterCut } from "./MasterCut";
import { ReelsCut } from "./ReelsCut";
import {
  FPS,
  MASTER_WIDTH, MASTER_HEIGHT, MASTER_DURATION,
  REELS_WIDTH, REELS_HEIGHT, REELS_DURATION,
} from "./constants";

// Register Google font: Inter + JetBrains Mono (for CTA URL typewriter)
import { loadFont } from "@remotion/google-fonts/Inter";
const { fontFamily } = loadFont();

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ════════════ MASTER CUT — 16:9, 72s @ 4K ════════════ */}
      <Composition
        id="MasterCut"
        component={MasterCut}
        durationInFrames={MASTER_DURATION}
        fps={FPS}
        width={MASTER_WIDTH}
        height={MASTER_HEIGHT}
        defaultProps={{}}
      />

      {/* ════════════ REELS CUT — 9:16, 30s @ 1080×1920 ════════════ */}
      <Composition
        id="ReelsCut"
        component={ReelsCut}
        durationInFrames={REELS_DURATION}
        fps={FPS}
        width={REELS_WIDTH}
        height={REELS_HEIGHT}
        defaultProps={{}}
      />
    </>
  );
};

export default RemotionRoot;
