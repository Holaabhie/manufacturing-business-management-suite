import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { DeviceMockup } from "../components/DeviceMockup";
import { TextBlock } from "../components/TextLayers";
import { CursorClick } from "../components/CursorClick";
import { COLORS, SHOTS } from "../constants";

/**
 * Scene 6 — GST INVOICES (7s)
 * Zoom-through transition: starts tight on iPhone GST amount,
 * morphs/zooms through to MacBook invoice builder modal.
 * PDF "Generate" button click + page curl.
 */
export const SceneInvoices: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Zoom-through timing (0.6s = ~18 frames)
  const ZOOM_START = fps * 1.2;
  const ZOOM_END = ZOOM_START + 18;
  const clickFrame = ZOOM_END + fps * 1.4;

  // iPhone: big scale → shrinks to corner during zoom-through
  const zoomProgress = interpolate(frame, [ZOOM_START, ZOOM_END], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const phoneScale = 1.3 - zoomProgress * 0.9;
  const phoneX = -700 + zoomProgress * -1100;
  const phoneY = 0 + zoomProgress * -500;
  const phoneOpacity = 1 - zoomProgress * 0.55;

  // MacBook: small + blurry → large + sharp
  const macScale = 0.7 + zoomProgress * 0.2;
  const macBlur = (1 - zoomProgress) * 6;

  // Page curl animation after button click
  const curlT = Math.max(0, Math.min(1, (frame - clickFrame - 4) / 22));

  return (
    <AbsoluteFill>
      <Background variant="feature" glowPosition="tl" accentColor={COLORS.WARNING} accentOpacity={0.06} />

      {/* GST highlight pulse (warm gold / amber tint) */}
      <div
        style={{
          position: "absolute",
          left: "50%", top: "48%",
          width: 2600, height: 2000,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${COLORS.WARNING}08 0%, transparent 55%)`,
          pointerEvents: "none",
        }}
      />

      {/* iPhone (quote review) — shrinks to corner during zoom-through */}
      <div style={{ position: "absolute", inset: 0, opacity: phoneOpacity }}>
        <DeviceMockup
          device="iphone"
          screenshot={SHOTS.QUOTE_B_REVIEW}
          tiltY={interpolate(zoomProgress, [0, 1], [18, -5])}
          tiltX={-2}
          scale={phoneScale}
          x={phoneX}
          y={phoneY}
          showReflection={frame < ZOOM_END}
          highlightBox={frame < ZOOM_END && frame > 10 ? { x: 42, y: 70, w: 46, h: 10 } : undefined}
        />
        {/* GST amount highlight label on iPhone screen */}
        {frame < ZOOM_END + 5 && (
          <GSTBadge
            x={-140}
            y={250}
            size={0.9 + interpolate(zoomProgress, [0, 1], [0, 0.4])}
            frame={frame}
            startFrame={8}
          />
        )}
      </div>

      {/* MacBook (billing invoice builder) */}
      <div style={{ position: "absolute", inset: 0, filter: `blur(${macBlur}px)` }}>
        <DeviceMockup
          device="macbook"
          screenshot={SHOTS.BILLING_LIGHT}
          tiltY={-10}
          tiltX={-2}
          scale={macScale}
          x={220}
          y={-30}
          showReflection
        />
        {/* Cursor click on Generate PDF button */}
        <CursorClick
          x={2720}
          y={1540}
          clickAt={clickFrame}
        />
        {/* Page curl animation */}
        {curlT > 0 && <PageCurl progress={curlT} />}
      </div>

      {/* Text block */}
      <TextBlock
        eyebrow="GST INVOICES"
        headline="HSN + tax breakdown — 100% compliant"
        subhead="Ek click me GST invoice banao, PDF save, client ko bhejo"
        position="br"
        startFrame={Math.round(ZOOM_END + 10)}
        accentColor={COLORS.WARNING}
      />
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// GST amount floating badge
// ──────────────────────────────────────────────────
const GSTBadge: React.FC<{ x: number; y: number; size: number; frame: number; startFrame: number }> = ({
  x, y, size, frame, startFrame,
}) => {
  const p = Math.min(1, Math.max(0, (frame - startFrame) / 18));
  const pulse = 0.6 + Math.sin((frame / 18) * Math.PI * 2) * 0.4;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${size * (0.96 + p * 0.04)})`,
        opacity: p,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          padding: "18px 26px",
          borderRadius: 16,
          background: `linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(15,17,23,0.9) 100%)`,
          border: `1.5px solid ${COLORS.WARNING}aa`,
          boxShadow: `0 14px 40px rgba(0,0,0,0.5), 0 0 ${24 + pulse * 30}px ${COLORS.WARNING}55`,
          fontFamily: "'Inter', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: COLORS.WARNING,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#0F172A", fontWeight: 900, fontSize: 22,
            boxShadow: `0 0 20px ${COLORS.WARNING}99`,
          }}
        >
          ₹
        </div>
        <div>
          <div style={{ color: COLORS.WARNING, fontSize: 16, fontWeight: 700, letterSpacing: "0.08em" }}>
            GST BREAKDOWN
          </div>
          <div style={{ color: COLORS.TEXT_WHITE, fontSize: 30, fontWeight: 800 }}>
            ₹1,860 · HSN 8471
          </div>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────
// Page curl animation
// ──────────────────────────────────────────────────
const PageCurl: React.FC<{ progress: number }> = ({ progress }) => {
  const curl = progress; // 0-1
  const curlX = 2400 + curl * 500;
  const curlY = 1200 + curl * 400;
  return (
    <>
      {/* Curled paper corner wedge */}
      <div
        style={{
          position: "absolute",
          left: curlX, top: curlY,
          width: 320 * curl, height: 300 * curl,
          background: "linear-gradient(135deg, #fefefe 0%, #f0eee6 40%, #d9d5c8 100%)",
          borderLeft: "1px solid rgba(0,0,0,0.15)",
          borderTop: "1px solid rgba(0,0,0,0.1)",
          borderBottomRightRadius: 24,
          transformOrigin: "top left",
          transform: `rotate(${curl * 38}deg) skew(${curl * 10}deg, ${curl * 2}deg)`,
          boxShadow: "-10px 10px 30px rgba(0,0,0,0.25), inset -4px 4px 14px rgba(0,0,0,0.1)",
          pointerEvents: "none",
          opacity: curl > 0.02 ? 1 : 0,
        }}
      >
        {/* Page lines pattern */}
        <div
          style={{
            position: "absolute",
            inset: 8,
            background:
              "repeating-linear-gradient(180deg, rgba(0,0,0,0.03) 0 1px, transparent 1px 18px)",
            borderRadius: 10,
          }}
        />
      </div>
      {/* "Ready" toast */}
      {curl > 0.5 && (
        <div
          style={{
            position: "absolute",
            left: curlX + 120, top: curlY - 80,
            padding: "14px 22px",
            borderRadius: 12,
            background: COLORS.SUCCESS,
            color: "#fff",
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 22,
            boxShadow: "0 8px 24px rgba(22,163,74,0.5)",
            opacity: (curl - 0.5) * 2,
          }}
          >
            📄 PDF Generated!
          </div>
      )}
    </>
  );
};

export default SceneInvoices;
