import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { DeviceMockup } from "../components/DeviceMockup";
import { TextBlock } from "../components/TextLayers";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { COLORS, SHOTS } from "../constants";

/**
 * Scene 5 — PAYMENTS (7s)
 * MacBook center. 4 payment cards stagger-in (translate Y + opacity).
 * Amounts count-up. Success toast slides in from top-right.
 */
export const ScenePayments: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const floatY = Math.sin((frame / (fps * 3)) * Math.PI * 2) * 6;

  return (
    <AbsoluteFill>
      <Background variant="feature" glowPosition="center" accentColor={COLORS.SUCCESS} accentOpacity={0.1} />

      <DeviceMockup
        device="macbook"
        screenshot={SHOTS.PAYMENTS_LIGHT}
        tiltY={0}
        tiltX={0}
        scale={0.92}
        y={floatY - 10}
        x={0}
        showReflection
      />

      {/* 4 Staggered floating payment cards */}
      <StaggeredCards frame={frame} fps={fps} />

      {/* Success toast slide-in */}
      <PaymentToast frame={frame} fps={fps} />

      {/* Text block */}
      <TextBlock
        eyebrow="PAYMENTS"
        headline="UPI · Netbanking · Cash — sab record karein"
        subhead="Auto reconciliation, live balance sheet update hota rehta hai"
        position="bl"
        startFrame={20}
        accentColor={COLORS.SUCCESS}
      />
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// 4 Payment cards stagger + count-up
// ──────────────────────────────────────────────────
const CARDS = [
  { client: "Sharma Industries", amount: 52400, mode: "UPI ✓", accent: COLORS.SUCCESS, delay: 0 },
  { client: "Patel Enterprises",  amount: 86750, mode: "Bank Transfer", accent: COLORS.PRIMARY, delay: 70 },
  { client: "Gupta Traders",      amount: 124300, mode: "Cheque", accent: COLORS.WARNING, delay: 14 },
  { client: "Reliable Mfg Co",    amount: 312800, mode: "NEFT ✓", accent: COLORS.SUCCESS, delay: 21 },
];

const StaggeredCards: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const START = 20;
  return (
    <div
      style={{
        position: "absolute",
        right: 180,
        top: 290,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        pointerEvents: "none",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {CARDS.map((c, i) => {
        const s = spring({
          frame: frame - START - i * 5,
          fps,
          config: { damping: 15, stiffness: 120, mass: 0.6 },
          durationInFrames: 24,
        });
        return (
          <div
            key={i}
            style={{
              width: 430,
              padding: "22px 26px",
              borderRadius: 18,
              background: "rgba(15, 17, 23, 0.82)",
              border: `1px solid ${COLORS.BORDER}`,
              backdropFilter: "blur(20px)",
              boxShadow: `0 14px 36px rgba(0,0,0,0.5), 0 0 30px ${c.accent}12`,
              opacity: s,
              transform: `translateY(${(1 - s) * 32}px) scale(${0.97 + s * 0.03})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.TEXT_WHITE, marginBottom: 6 }}>
                {c.client}
              </div>
              <div style={{ fontSize: 18, color: COLORS.TEXT_MUTED }}>
                {c.mode}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <AnimatedNumber
                from={0}
                to={c.amount}
                startFrame={START + i * 5 + 6}
                durationFrames={40}
                format="INR"
                fontSize={32}
                fontWeight={800}
                color={c.accent}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ──────────────────────────────────────────────────
// Success toast slide-in
// ──────────────────────────────────────────────────
const PaymentToast: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const start = fps * 4;
  const lf = frame - start;
  if (lf < 0) return null;
  const s = spring({ frame: lf, fps, config: { damping: 18, stiffness: 130, mass: 0.6 }, durationInFrames: 22 });
  const out = lf > 120 ? Math.max(0, 1 - (lf - 120) / 16) : 1;
  return (
    <div
      style={{
        position: "absolute",
        right: 240,
        top: 200,
        opacity: s * out,
        transform: `translateX(${(1 - s) * 160}px) translateY(${(1 - s) * -20}px)`,
        pointerEvents: "none",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          padding: "22px 28px",
          borderRadius: 18,
          background: `linear-gradient(135deg, rgba(22,163,74,0.22) 0%, rgba(15,17,23,0.92) 100%)`,
          border: `1px solid ${COLORS.SUCCESS}55`,
          boxShadow: `0 16px 50px rgba(0,0,0,0.5), 0 0 40px ${COLORS.SUCCESS}33`,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            width: 52, height: 52, borderRadius: "50%",
            background: COLORS.SUCCESS,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, color: "#fff", boxShadow: `0 0 24px ${COLORS.SUCCESS}88`,
          }}
        >
          ✓
        </div>
        <div>
          <div style={{ color: COLORS.TEXT_WHITE, fontSize: 24, fontWeight: 800 }}>
            Payment Recorded
          </div>
          <div style={{ color: COLORS.TEXT_MUTED, fontSize: 18 }}>
            ₹3,12,800 · Reliable Mfg Co · UPI
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenePayments;
