import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { DeviceMockup } from "../components/DeviceMockup";
import { TextBlock } from "../components/TextLayers";
import { COLORS, SHOTS } from "../constants";

/**
 * Scene 4 — INVENTORY × PRODUCTION (7s)
 * Split device: MacBook LEFT (Inventory bars) + iPhone RIGHT (Production progress)
 * Rack-focus alternates between sides at mid-point
 */
export const SceneInventory: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Parallax drift in opposite directions for depth
  const macDriftX = Math.sin((frame / (fps * 3)) * Math.PI * 2) * 12;
  const phoneDriftX = Math.cos((frame / (fps * 3)) * Math.PI * 2) * 10;
  const phoneFloatY = Math.sin((frame / (fps * 2.2)) * Math.PI * 2) * 8;

  // Rack-focus (blur swap) at 3s mark
  const rackT = interpolate(frame, [fps * 2.6, fps * 3.2], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const macBlur = rackT * 5;
  const phoneBlur = (1 - rackT) * 5;

  return (
    <AbsoluteFill>
      <Background variant="feature" glowPosition="top" accentColor="#16A34A" accentOpacity={0.08} />

      {/* LEFT: MacBook — Inventory dashboard */}
      <div style={{ position: "absolute", inset: 0, filter: `blur(${macBlur}px)` }}>
        <DeviceMockup
          device="macbook"
          screenshot={SHOTS.DASHBOARD_LIGHT}
          tiltY={-18}
          tiltX={-2}
          scale={0.76}
          x={-860 + macDriftX}
          y={-40}
          showReflection={false}
        />
        {/* Inventory bar chart line draw overlay */}
        <BarDrawOverlay frame={frame} fps={fps} side="left" />
      </div>

      {/* RIGHT: iPhone — Production job card */}
      <div style={{ position: "absolute", inset: 0, filter: `blur(${phoneBlur}px)` }}>
        <DeviceMockup
          device="iphone"
          screenshot={SHOTS.CHALLANS_MOBILE_L}
          tiltY={15}
          tiltX={-3}
          scale={1.25}
          x={920 + phoneDriftX}
          y={60 + phoneFloatY}
          showReflection={true}
        />
        {/* Progress bar fill overlay */}
        <ProgressFillOverlay frame={frame} fps={fps} />
      </div>

      {/* Low-stock warning pulse on inventory highlight */}
      <LowStockPulse frame={frame} fps={fps} />

      {/* Text block bottom-center */}
      <TextBlock
        eyebrow="INVENTORY × PRODUCTION"
        headline="Stock aur production — real-time nazar rakhein"
        subhead="Low-stock alerts + har batch ka live progress"
        position="bc"
        startFrame={18}
        accentColor={COLORS.SUCCESS}
        eyebrowColor={COLORS.SUCCESS}
      />
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Fake Bar Draw overlay (appears on inventory chart area)
// ──────────────────────────────────────────────────
const BarDrawOverlay: React.FC<{ frame: number; fps: number; side: "left" | "right" }> = ({ frame, fps }) => {
  const BARS = 7;
  const startFrame = fps * 0.8;
  return (
    <div
      style={{
        position: "absolute",
        left: 410,
        top: 1300,
        width: 900,
        height: 260,
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24, height: "100%" }}>
        {Array.from({ length: BARS }).map((_, i) => {
          const targetH = 100 + ((i * 37) % 140);
          const lf = Math.max(0, frame - startFrame - i * 5);
          const p = Math.min(1, lf / 20);
          const h = targetH * (1 - Math.pow(1 - p, 3));
          const colors = [COLORS.PRIMARY, COLORS.SUCCESS, COLORS.WARNING, COLORS.PRIMARY, COLORS.SUCCESS, COLORS.WARNING, COLORS.PRIMARY];
          return (
            <div key={i} style={{ flex: 1, height: "100%", position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0, right: 0,
                  height: h,
                  borderRadius: 8,
                  background: `linear-gradient(180deg, ${colors[i]} 0%, ${colors[i]}aa 100%)`,
                  boxShadow: `0 0 20px ${colors[i]}55`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────
// Progress bar fill overlay on phone
// ──────────────────────────────────────────────────
const ProgressFillOverlay: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const startFrame = fps * 2.2;
  const lf = Math.max(0, frame - startFrame);
  const p = Math.min(1, lf / 55);
  const from = 40;
  const to = 92;
  const v = from + (to - from) * (1 - Math.pow(1 - p, 3));
  return (
    <div
      style={{
        position: "absolute",
        left: 2240,
        top: 1120,
        width: 320,
        height: 22,
        borderRadius: 11,
        backgroundColor: "rgba(255,255,255,0.08)",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.15)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: `${v}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${COLORS.SUCCESS}, ${COLORS.PRIMARY})`,
          boxShadow: `0 0 16px ${COLORS.SUCCESS}aa`,
          transition: "none",
          position: "relative",
        }}
      >
        {/* Shimmer sheen */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
            transform: `translateX(${-100 + p * 200}%)`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
          letterSpacing: "0.02em",
        }}
      >
        {v.toFixed(0)}% Complete
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────
// Low-stock red shake + warning pulse
// ──────────────────────────────────────────────────
const LowStockPulse: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const startFrame = fps * 1.4;
  if (frame < startFrame) return null;
  const t = (frame - startFrame) / fps;
  const pulse = 0.6 + Math.sin(t * 4 * Math.PI * 2) * 0.4;
  const shakeX = Math.sin(t * 40) * 3;
  return (
    <div
      style={{
        position: "absolute",
        left: 520 + shakeX,
        top: 1440,
        width: 220,
        height: 90,
        borderRadius: 12,
        border: `3px solid ${COLORS.DANGER}`,
        boxShadow: `0 0 ${20 + pulse * 20}px ${COLORS.DANGER}88, inset 0 0 16px ${COLORS.DANGER}33`,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 18px",
        backgroundColor: "rgba(220,38,38,0.08)",
      }}
    >
      <span style={{ fontSize: 40 }}>⚠️</span>
      <div style={{ color: "#fff", fontFamily: "Inter", fontWeight: 800, fontSize: 26, letterSpacing: "-0.01em" }}>
        Low Stock
      </div>
    </div>
  );
};

export default SceneInventory;
