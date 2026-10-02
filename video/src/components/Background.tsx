import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, CUBIC } from "../constants";

interface BackgroundProps {
  variant?: "hook" | "logo" | "feature" | "globe" | "closing" | "reels";
  accentColor?: string;
  accentOpacity?: number;
  glowPosition?: "center" | "bl" | "br" | "tl" | "tr" | "top" | "bottom";
  showParticles?: boolean;
  particleCount?: number;
}

/**
 * Cinematic dark background — grain + radial glow + optional drifting particles
 * Matches Apple/Linear/Stripe launch-film aesthetic
 */
export const Background: React.FC<BackgroundProps> = ({
  variant = "feature",
  accentColor = COLORS.PRIMARY,
  accentOpacity = 0.12,
  glowPosition = "center",
  showParticles = false,
  particleCount = 40,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Slow drift of glow for parallax feel
  const progress = frame / Math.max(durationInFrames || fps * 5, 1);
  const driftX = Math.sin(progress * Math.PI * 2) * 6;
  const driftY = Math.cos(progress * Math.PI * 1.3) * 4;

  // Map glow position to percentages
  const glowCoords: Record<string, { x: string; y: string }> = {
    center: { x: `${50 + driftX}%`, y: `${50 + driftY}%` },
    bl:     { x: `${20 + driftX}%`, y: `${75 + driftY}%` },
    br:     { x: `${80 + driftX}%`, y: `${75 + driftY}%` },
    tl:     { x: `${20 + driftX}%`, y: `${25 + driftY}%` },
    tr:     { x: `${80 + driftX}%`, y: `${25 + driftY}%` },
    top:    { x: `${50 + driftX}%`, y: `${20 + driftY}%` },
    bottom: { x: `${50 + driftX}%`, y: `${80 + driftY}%` },
  };
  const glow = glowCoords[glowPosition];

  const bgColor =
    variant === "logo" ? "#000000" :
    variant === "globe" ? COLORS.BG_DARK :
    variant === "closing" ? "#0A0C12" :
    variant === "hook" ? "#0A0B10" :
    variant === "reels" ? "#0A0C12" :
    COLORS.BG;

  // Vignette strength
  const vignetteOpacity =
    variant === "hook" ? 0.55 :
    variant === "logo" ? 0.10 :
    variant === "closing" ? 0.40 :
    variant === "reels" ? 0.45 :
    0.25;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: "hidden" }}>
      {/* Radial gradient glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle at ${glow.x} ${glow.y}, ${accentColor}${Math.round(accentOpacity * 255).toString(16).padStart(2,"0")} 0%, transparent 55%)`,
        }}
      />

      {/* Secondary soft ambient glow — opposite corner */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle at ${100 - parseInt(glow.x)}% ${100 - parseInt(glow.y)}%, ${accentColor}14 0%, transparent 65%)`,
          opacity: 0.5,
        }}
      />

      {/* Drifting particles (closing scene) */}
      {showParticles && (
        <Particles count={particleCount} frame={frame} fps={fps} accent={accentColor} />
      )}

      {/* Film grain overlay (subtle) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          mixBlendMode: "overlay",
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Ascending particles for closing scene
// ──────────────────────────────────────────────────
const Particles: React.FC<{ count: number; frame: number; fps: number; accent: string }> = ({
  count, frame, fps, accent,
}) => {
  const H = 2160;
  const W = 3840;
  // Use deterministic pseudo-random (seeded)
  const particles = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const rand = seededRand(i + 1000);
      return {
        x: rand() * W,
        seedY: rand() * H,
        size: 0.8 + rand() * 2.4,
        speed: 6 + rand() * 14,
        amp: 2 + rand() * 6,
        freq: 0.4 + rand() * 0.8,
        phase: rand() * Math.PI * 2,
        isWhite: rand() < 0.4,
      };
    });
  }, [count]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {particles.map((p, i) => {
        const y = ((p.seedY - (frame * p.speed)) % H + H) % H;
        const x = p.x + Math.sin((frame / fps) * p.freq * Math.PI * 2 + p.phase) * p.amp;
        const opacity =
          y < 200 ? y / 200 :
          y > H - 300 ? (H - y) / 300 :
          0.6 + Math.sin(frame * 0.05 + i) * 0.2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: p.isWhite ? "#ffffff" : accent,
              opacity,
              boxShadow: p.isWhite
                ? `0 0 ${p.size * 2}px rgba(255,255,255,0.3)`
                : `0 0 ${p.size * 3}px ${accent}60`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Deterministic seeded RNG (mulberry32)
function seededRand(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default Background;
