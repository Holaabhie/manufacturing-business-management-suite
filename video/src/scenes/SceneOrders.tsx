import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { DeviceMockup } from "../components/DeviceMockup";
import { TextBlock } from "../components/TextLayers";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { CursorClick } from "../components/CursorClick";
import { COLORS, SHOTS } from "../constants";

/**
 * Scene 3 — ORDERS (7s)
 * MacBook mockup angled hero. Cursor click on order row → status draw-on.
 * KPI numbers count-up over duration
 */
export const SceneOrders: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Subtle continuous parallax drift on device
  const driftY = Math.sin((frame / (fps * 3)) * Math.PI * 2) * 8;
  const tiltY = -12 + Math.sin((frame / (fps * 4)) * Math.PI * 2) * 2;
  const tiltX = -4 + Math.cos((frame / (fps * 4)) * Math.PI * 2) * 1.5;

  // Cursor click at 1.8s (row highlight + badge checkmark)
  const clickAt = Math.round(fps * 1.8);

  // Highlight row in orders list (approx coords: row #3 area)
  // Using percentage inside screenshot: ~60% from top, 6% from left, 88% wide, 9% tall
  const highlightBox = frame >= clickAt
    ? { x: 5, y: 58, w: 91, h: 9 }
    : undefined;

  return (
    <AbsoluteFill>
      <Background variant="feature" glowPosition="bl" accentColor={COLORS.PRIMARY} accentOpacity={0.14} />

      {/* MacBook hero */}
      <DeviceMockup
        device="macbook"
        screenshot={SHOTS.ORDERS_LIST_LIGHT}
        tiltY={tiltY}
        tiltX={tiltX}
        scale={0.88}
        y={driftY - 60}
        x={-40}
        showReflection
        highlightBox={highlightBox}
      />

      {/* KPI overlay — floating numbers (left side, over device) */}
      <KPIFloating frame={frame} fps={fps} />

      {/* Cursor clicking on a row */}
      <CursorClick
        x={1900}
        y={1360}
        clickAt={clickAt}
        color={COLORS.PRIMARY}
      />

      {/* Text block bottom-left */}
      <TextBlock
        eyebrow="ORDERS"
        headline="Har order, ek click me track karein"
        subhead="Create → Process → Dispatch — ek hi dashboard pe"
        position="bl"
        startFrame={15}
      />
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Floating KPI cards count-up
// ──────────────────────────────────────────────────
const KPIFloating: React.FC<{ frame: number; fps: number }> = ({ fps }) => {
  return (
    <div
      style={{
        position: "absolute",
        right: 220,
        top: 380,
        display: "flex",
        flexDirection: "column",
        gap: 28,
        fontFamily: "'Inter', sans-serif",
        pointerEvents: "none",
      }}
    >
      <MiniKPICard
        label="Monthly Revenue"
        from={1240000}
        to={2480000}
        startFrame={20}
        durationFrames={70}
        accent={COLORS.PRIMARY}
        format="INR"
      />
      <MiniKPICard
        label="Total Orders"
        from={34}
        to={67}
        startFrame={32}
        durationFrames={60}
        accent={COLORS.SUCCESS}
      />
      <MiniKPICard
        label="Delivered this M"
        from={18}
        to={45}
        startFrame={44}
        durationFrames={55}
        accent={COLORS.WARNING}
      />
    </div>
  );
};

const MiniKPICard: React.FC<{
  label: string;
  from: number;
  to: number;
  startFrame: number;
  durationFrames: number;
  accent: string;
  format?: "INR" | "number";
}> = ({ label, from, to, startFrame, durationFrames, accent, format = "number" }) => {
  return (
    <div
      style={{
        width: 420,
        padding: "28px 32px",
        borderRadius: 20,
        background: "rgba(15, 17, 23, 0.78)",
        border: `1px solid ${COLORS.BORDER}`,
        backdropFilter: "blur(22px)",
        boxShadow: `0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px ${accent}22, 0 0 40px ${accent}10`,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 500,
          color: COLORS.TEXT_MUTED,
          letterSpacing: "0.01em",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <AnimatedNumber
          from={from}
          to={to}
          startFrame={startFrame}
          durationFrames={durationFrames}
          format={format}
          fontSize={54}
          fontWeight={800}
          color={COLORS.TEXT_WHITE}
        />
        <div
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            backgroundColor: `${accent}22`,
            color: accent,
            fontSize: 18,
            fontWeight: 700,
            border: `1px solid ${accent}33`,
          }}
        >
          ↑ {Math.round(((to - from) / from) * 100)}%
        </div>
      </div>
    </div>
  );
};

export default SceneOrders;
