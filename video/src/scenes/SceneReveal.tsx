import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { COLORS, FONT_FAMILY } from "../constants";

/**
 * Scene 2 — REVEAL (6s)
 * Logo mark SVG stroke draw → full brand mark + tagline
 * Ring particle burst splash animation
 */
export const SceneReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing (frames @30fps)
  // 0-22: Mark stroke draw (1.5s)
  // 18-35: Particle burst
  // 28-60: Full wordmark fade up, tagline fade
  // 150-180: Fade to next
  const tDraw = Math.min(1, frame / 22);
  const drawEase = 1 - Math.pow(1 - tDraw, 3);
  const wordmarkSpring = spring({ frame: frame - 20, fps, config: { damping: 14, stiffness: 100, mass: 0.8 }, durationInFrames: 30 });
  const taglineSpring = spring({ frame: frame - 32, fps, config: { damping: 16, stiffness: 110 }, durationInFrames: 28 });
  const glowPulse = 0.65 + Math.sin((frame / 18) * Math.PI * 2) * 0.35;

  const BURST_FRAMES = [18, 20, 22, 24, 26, 28, 30, 32];

  return (
    <AbsoluteFill>
      <Background variant="logo" />

      {/* Back radial glow */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            width: 1600, height: 1600,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${COLORS.PRIMARY_20} 0%, transparent 60%)`,
            opacity: glowPulse,
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ pointerEvents: "none", fontFamily: FONT_FAMILY }}>
        <div
          style={{
            position: "absolute",
            left: "50%", top: "48%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 30,
          }}
        >
          {/* Logo mark — factory icon (custom SVG with stroke draw) */}
          <LogoMark drawProgress={drawEase} glowPulse={glowPulse} />

          {/* Wordmark */}
          <div
            style={{
              opacity: wordmarkSpring,
              transform: `translateY(${(1 - wordmarkSpring) * 28}px) scale(${0.96 + wordmarkSpring * 0.04})`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 168,
                fontWeight: 800,
                letterSpacing: "-0.05em",
                color: COLORS.TEXT_WHITE,
                lineHeight: 1,
                textShadow: `0 0 60px ${COLORS.PRIMARY_50}, 0 10px 80px rgba(0,0,0,0.7)`,
              }}
            >
              IND<span style={{ color: COLORS.PRIMARY }}> MANAGER</span>
            </div>
          </div>

          {/* Tagline */}
          <div
            style={{
              opacity: taglineSpring,
              transform: `translateY(${(1 - taglineSpring) * 18}px)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* Accent line */}
            <div
              style={{
                width: 120,
                height: 4,
                borderRadius: 2,
                backgroundColor: COLORS.PRIMARY,
                boxShadow: `0 0 20px ${COLORS.PRIMARY}`,
              }}
            />
            <div
              style={{
                fontSize: 42,
                fontWeight: 500,
                color: COLORS.TEXT_SOFT,
                letterSpacing: "-0.01em",
              }}
            >
              Indian Manufacturing Ka Complete OS
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Particle burst ring */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {BURST_FRAMES.map((f, i) => (
          <BurstParticle
            key={i}
            index={i}
            burstFrame={f}
            currentFrame={frame}
            color={i % 2 === 0 ? COLORS.PRIMARY : "#ffffff"}
            total={BURST_FRAMES.length}
          />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Factory logo mark — SVG stroke draw animation
// ──────────────────────────────────────────────────
const LogoMark: React.FC<{ drawProgress: number; glowPulse: number }> = ({ drawProgress, glowPulse }) => {
  const size = 260;
  const circumference = 565; // 2πr @ r=90
  const dash = circumference * drawProgress;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Outer glow circle */}
      <div
        style={{
          position: "absolute",
          inset: -30,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.PRIMARY_20} 0%, transparent 70%)`,
          opacity: glowPulse,
          filter: "blur(12px)",
        }}
      />
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        {/* Outer ring stroke-draw */}
        <circle
          cx="100" cy="100" r="90"
          stroke={COLORS.PRIMARY}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ filter: `drop-shadow(0 0 12px ${COLORS.PRIMARY})` }}
        />
        {/* Inner mark — factory building shape (drawn as single path with stroke-dash) */}
        <path
          d="M55 140 L55 100 L75 80 L95 100 L95 75 L115 55 L135 75 L135 100 L155 100 L155 140 Z M72 140 L72 118 M92 140 L92 118 M112 140 L112 118 M132 140 L132 118 M105 82 L115 82 L115 92 L105 92 Z"
          stroke={COLORS.TEXT_WHITE}
          strokeWidth="3.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${1100 * drawProgress} 1100`}
          style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.35))" }}
        />
        {/* Chimney smoke / accent dot on top of stroke-draw */}
        <circle
          cx="110" cy="42" r="4"
          fill={COLORS.PRIMARY}
          opacity={drawProgress > 0.9 ? 1 : 0}
          style={{ filter: `drop-shadow(0 0 8px ${COLORS.PRIMARY})` }}
        />
      </svg>
    </div>
  );
};

// ──────────────────────────────────────────────────
// Single burst particle travelling outward at angle
// ──────────────────────────────────────────────────
const BurstParticle: React.FC<{
  index: number; burstFrame: number; currentFrame: number; color: string; total: number;
}> = ({ index, burstFrame, currentFrame, color, total }) => {
  const t = currentFrame - burstFrame;
  if (t < 0 || t > 55) return null;
  const angle = (index / total) * Math.PI * 2;
  const dist = t * 9;
  const size = 8 - Math.max(0, t / 8);
  const opacity = Math.max(0, 1 - t / 55);
  const x = Math.cos(angle) * dist;
  const y = Math.sin(angle) * dist;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: Math.max(1, size),
        height: Math.max(1, size),
        borderRadius: "50%",
        backgroundColor: color,
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        opacity,
        boxShadow: `0 0 ${size * 3}px ${color}99`,
      }}
    />
  );
};

export default SceneReveal;
