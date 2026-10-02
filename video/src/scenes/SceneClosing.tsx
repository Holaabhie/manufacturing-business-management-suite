import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { CTAButton, TypewriterText } from "../components/TextLayers";
import { COLORS, FONT_FAMILY } from "../constants";

/**
 * Scene 10 — CLOSING CTA (11s)
 * UI mockups recede into background → LOGO re-appears large center →
 * CTA button morphs in → URL types itself → final frame hold 1.5s
 * Background: strong blue glow center, ascending particles.
 */
export const SceneClosing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Phase timing (in frames @30fps — scene total = 330 frames / 11s)
  // 0-40: UI recedes
  // 30-90: Logo spring-in
  // 100-130: Tagline under logo
  // 160:  CTA button morphs in
  // 200:  URL types (indmanager.in, 13 chars)
  // 280-330: Final hold

  const LOGO_IN_START = 30;
  const TAGLINE_START = 100;
  const CTA_START = 160;
  const URL_START = 200;

  const logoSpring = spring({
    frame: frame - LOGO_IN_START, fps,
    config: { damping: 13, stiffness: 80, mass: 0.9 },
    durationInFrames: 60,
  });

  const taglineSpring = spring({
    frame: frame - TAGLINE_START, fps,
    config: { damping: 16, stiffness: 120 },
    durationInFrames: 40,
  });

  // Receding UI tiles (mini device cards flying off into distance)
  return (
    <AbsoluteFill>
      <Background
        variant="closing"
        accentColor={COLORS.PRIMARY}
        accentOpacity={0.22}
        glowPosition="center"
        showParticles
        particleCount={90}
      />

      {/* Receding UI tiles */}
      <RecedingUI frame={frame} fps={fps} />

      {/* Center content: LOGO + TAGLINE + CTA + URL */}
      <AbsoluteFill style={{ fontFamily: FONT_FAMILY, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: "50%", top: "46%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 30,
          }}
        >
          {/* Factory logo mark + wordmark */}
          <div
            style={{
              opacity: logoSpring,
              transform: `translateY(${(1 - logoSpring) * 80}px) scale(${0.88 + logoSpring * 0.18})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 26,
            }}
          >
            {/* Logo mark SVG */}
            <svg width={220} height={220} viewBox="0 0 200 200" fill="none"
              style={{ filter: `drop-shadow(0 0 60px ${COLORS.PRIMARY}aa)` }}>
              <circle cx="100" cy="100" r="90" stroke={COLORS.PRIMARY} strokeWidth="4" fill="none" />
              <path
                d="M55 140 L55 100 L75 80 L95 100 L95 75 L115 55 L135 75 L135 100 L155 100 L155 140 Z M72 140 L72 118 M92 140 L92 118 M112 140 L112 118 M132 140 L132 118 M105 82 L115 82 L115 92 L105 92 Z"
                fill={COLORS.TEXT_WHITE}
                fillOpacity={0.96}
                stroke={COLORS.TEXT_WHITE}
                strokeWidth="2.5"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 12px rgba(255,255,255,0.25))" }}
              />
              <circle cx="110" cy="42" r="6" fill={COLORS.PRIMARY}
                style={{ filter: `drop-shadow(0 0 10px ${COLORS.PRIMARY})` }} />
            </svg>
            {/* Wordmark */}
            <div>
              <div style={{
                fontSize: 182,
                fontWeight: 800,
                letterSpacing: "-0.05em",
                lineHeight: 1,
                color: COLORS.TEXT_WHITE,
                textShadow: `0 0 80px ${COLORS.PRIMARY_50}, 0 20px 80px rgba(0,0,0,0.8)`,
              }}>
                IND<span style={{ color: COLORS.PRIMARY }}> MANAGER</span>
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div
            style={{
              opacity: taglineSpring,
              transform: `translateY(${(1 - taglineSpring) * 30}px)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{
              width: 160, height: 4, borderRadius: 2, backgroundColor: COLORS.PRIMARY,
              boxShadow: `0 0 24px ${COLORS.PRIMARY}`,
            }} />
            <div style={{
              fontSize: 46,
              fontWeight: 500,
              color: COLORS.TEXT_SOFT,
              letterSpacing: "-0.01em",
            }}>
              Indian Manufacturing Ka Complete OS
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <CTAButton
          label="Free Trial Start Karein"
          startFrame={CTA_START}
          x={0}
          y={150}
          accent={COLORS.PRIMARY}
        />

        {/* URL — typewriter effect */}
        <TypewriterText
          text="indmanager.in"
          startFrame={URL_START}
          charsPerFrame={0.9}
          x={0}
          y={320}
          size={40}
          color={COLORS.TEXT_MUTED}
          fontFamily="'JetBrains Mono', 'Fira Code', monospace"
        />
      </AbsoluteFill>

      {/* Final frame fade-hold (already handled by still composition) */}
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Receding UI tiles (Scene-opening: previous scenes fly into background)
// ──────────────────────────────────────────────────
const TILE_COLORS = [COLORS.PRIMARY, COLORS.SUCCESS, COLORS.WARNING, COLORS.AI_ACCENT, "#EC4899", COLORS.PRIMARY];
const TILE_ICONS = ["📦", "📊", "💰", "📄", "🗂️", "🤖"];
const RECEDING = 6;

const RecedingUI: React.FC<{ frame: number; fps: number }> = ({ frame }) => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: RECEDING }).map((_, i) => {
        // Staggered starts
        const startFrame = i * 3;
        const lf = Math.max(0, frame - startFrame);
        const t = Math.min(1, lf / 40);
        const eased = t * t * (3 - 2 * t); // smoothstep
        const X = i * 260 - ((RECEDING - 1) * 260) / 2;
        const Y = (i % 2 === 0 ? -180 : 120) + eased * -200;
        const Z = eased * -1400;
        const opacity = Math.max(0, 1 - eased * 1.1);
        const rot = eased * 30 * (i % 2 === 0 ? -1 : 1);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%", top: "50%",
              transform: `translate(-50%, -50%) translate3d(${X}px, ${Y}px, ${Z}px) rotate(${rot}deg)`,
              transformStyle: "preserve-3d",
              perspective: 2500,
              opacity,
            }}
          >
            <div
              style={{
                width: 420, height: 280,
                borderRadius: 20,
                background: `linear-gradient(160deg, ${TILE_COLORS[i]}33 0%, rgba(15,17,23,0.92) 100%)`,
                border: `1px solid ${TILE_COLORS[i]}55`,
                boxShadow: `0 24px 60px rgba(0,0,0,0.5), 0 0 40px ${TILE_COLORS[i]}22`,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                padding: 24,
                gap: 14,
                overflow: "hidden",
              }}
            >
              <div style={{
                fontSize: 42,
                color: TILE_COLORS[i],
                filter: `drop-shadow(0 0 8px ${TILE_COLORS[i]})`,
              }}>{TILE_ICONS[i]}</div>
              <div style={{
                height: 10, width: "70%",
                background: `linear-gradient(90deg, ${TILE_COLORS[i]}, transparent)`,
                borderRadius: 5,
              }} />
              <div style={{
                height: 10, width: "50%",
                background: `linear-gradient(90deg, rgba(255,255,255,0.2), transparent)`,
                borderRadius: 5,
              }} />
              <div style={{
                height: 10, width: "62%",
                background: `linear-gradient(90deg, rgba(255,255,255,0.15), transparent)`,
                borderRadius: 5,
              }} />
              <div style={{
                height: 90, width: "100%",
                marginTop: "auto",
                borderRadius: 10,
                background: `linear-gradient(180deg, ${TILE_COLORS[i]}1a, transparent)`,
                border: `1px solid ${TILE_COLORS[i]}22`,
              }} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export default SceneClosing;
