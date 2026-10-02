import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneHook } from "./scenes/SceneHook";
import { SceneReveal } from "./scenes/SceneReveal";
import { SceneOrders } from "./scenes/SceneOrders";
import { SceneInventory } from "./scenes/SceneInventory";
import { ScenePayments } from "./scenes/ScenePayments";
import { SceneInvoices } from "./scenes/SceneInvoices";
import { SceneTally } from "./scenes/SceneTally";
import { SceneAI } from "./scenes/SceneAI";
import { SceneMultilang } from "./scenes/SceneMultilang";
import { SceneClosing } from "./scenes/SceneClosing";
import { SCENES_MASTER, FPS } from "./constants";

/**
 * MASTER CUT — 16:9 (3840×2160), 72 seconds
 * Scene orchestration:
 *  1. Hook          (0:00-0:05 / 5s)
 *  2. Reveal        (0:05-0:11 / 6s)
 *  3. Orders        (0:11-0:18 / 7s)
 *  4. Inv+Prod      (0:18-0:25 / 7s)
 *  5. Payments      (0:25-0:32 / 7s)
 *  6. Invoices      (0:32-0:39 / 7s)
 *  7. Tally Sync    (0:39-0:46 / 7s)
 *  8. AI Assistant  (0:46-0:53 / 7s)
 *  9. Multilang     (0:53-1:01 / 8s)
 * 10. Closing CTA   (1:01-1:12 / 11s)
 *
 * Total: 72s, 2160 frames @ 30fps
 *
 * TRANSITIONS: All scenes use smooth match-cut / morph overlap —
 * a 10-frame (0.33s) cross-blend at scene boundaries for silky feel.
 */
export const MasterCut: React.FC = () => {
  const { width, height } = useVideoConfig();
  const OVERLAP = 10; // frames of overlap at each boundary

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Scene 1 — Hook */}
      <Sequence from={SCENES_MASTER.HOOK.start} durationInFrames={SCENES_MASTER.HOOK.dur + OVERLAP}>
        <SceneHook />
        <TransitionBlendOut />
      </Sequence>

      {/* Scene 2 — Logo Reveal */}
      <Sequence from={SCENES_MASTER.REVEAL.start - 0} durationInFrames={SCENES_MASTER.REVEAL.dur + OVERLAP}>
        <TransitionBlendIn />
        <SceneReveal />
        <TransitionBlendOut />
      </Sequence>

      {/* Scene 3 — Orders */}
      <Sequence from={SCENES_MASTER.ORDERS.start} durationInFrames={SCENES_MASTER.ORDERS.dur + OVERLAP}>
        <TransitionBlendIn />
        <SceneOrders />
        <TransitionBlendOut />
      </Sequence>

      {/* Scene 4 — Inventory × Production */}
      <Sequence from={SCENES_MASTER.INVENTORY.start} durationInFrames={SCENES_MASTER.INVENTORY.dur + OVERLAP}>
        <TransitionBlendIn />
        <SceneInventory />
        <TransitionBlendOut />
      </Sequence>

      {/* Scene 5 — Payments */}
      <Sequence from={SCENES_MASTER.PAYMENTS.start} durationInFrames={SCENES_MASTER.PAYMENTS.dur + OVERLAP}>
        <TransitionBlendIn />
        <ScenePayments />
        <TransitionBlendOut />
      </Sequence>

      {/* Scene 6 — Invoices × GST */}
      <Sequence from={SCENES_MASTER.INVOICES.start} durationInFrames={SCENES_MASTER.INVOICES.dur + OVERLAP}>
        <TransitionBlendIn />
        <SceneInvoices />
        <TransitionBlendOut />
      </Sequence>

      {/* Scene 7 — Tally Sync */}
      <Sequence from={SCENES_MASTER.TALLY.start} durationInFrames={SCENES_MASTER.TALLY.dur + OVERLAP}>
        <TransitionBlendIn />
        <SceneTally />
        <TransitionBlendOut />
      </Sequence>

      {/* Scene 8 — AI Assistant */}
      <Sequence from={SCENES_MASTER.AI.start} durationInFrames={SCENES_MASTER.AI.dur + OVERLAP}>
        <TransitionBlendIn />
        <SceneAI />
        <TransitionBlendOut />
      </Sequence>

      {/* Scene 9 — Multi-language × Mobile */}
      <Sequence from={SCENES_MASTER.MULTILANG.start} durationInFrames={SCENES_MASTER.MULTILANG.dur + OVERLAP}>
        <TransitionBlendIn />
        <SceneMultilang />
        <TransitionBlendOut />
      </Sequence>

      {/* Scene 10 — Closing CTA */}
      <Sequence from={SCENES_MASTER.CLOSING.start} durationInFrames={SCENES_MASTER.CLOSING.dur}>
        <TransitionBlendIn />
        <SceneClosing />
      </Sequence>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Transition Blend-In (ramp from BLACK -> scene over first 10 frames)
// Place at START of every Sequence after Scene 1
// ──────────────────────────────────────────────────
const TransitionBlendIn: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      <CustomRamp type="in" frames={10} color="#000000" />
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Transition Blend-Out (ramp from scene -> BLACK over last 10 frames)
// Place at END of every Sequence before last
// ──────────────────────────────────────────────────
const TransitionBlendOut: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      <CustomRamp type="out" frames={10} color="#000000" totalFrames={durationInFrames} />
    </AbsoluteFill>
  );
};

// Generic ramp component (fade in/out overlay)
const CustomRamp: React.FC<{
  type: "in" | "out";
  frames: number;
  color: string;
  totalFrames?: number;
}> = ({ type, frames, color, totalFrames }) => {
  // Use absolute positioning + opacity via frame-level calc (for Sequences with shorter durations)
  return React.createElement(FadeOverlay, { type, frames, color, totalFrames });
};

const FadeOverlay: React.FC<{
  type: "in" | "out";
  frames: number;
  color: string;
  totalFrames?: number;
}> = ({ type, frames, color, totalFrames }) => {
  const f = useCurrentFrame();
  const total = totalFrames ?? frames * 2;
  let t: number;
  if (type === "in") {
    // First N frames: 1 -> 0
    t = Math.max(0, Math.min(1, 1 - f / frames));
  } else {
    // Last N frames: 0 -> 1
    const start = Math.max(0, total - frames);
    t = Math.max(0, Math.min(1, (f - start) / frames));
  }
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: color,
        opacity: ease,
        pointerEvents: "none",
      }}
    />
  );
};

export default MasterCut;
