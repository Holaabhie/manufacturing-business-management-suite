import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, CUBIC, FONT_FAMILY } from "../constants";

export interface TextBlockProps {
  eyebrow?: string;
  headline: string;
  subhead?: string;
  position?: "bl" | "br" | "tl" | "tr" | "center" | "tc" | "bc";
  startFrame?: number;
  accentColor?: string;
  headlineSize?: number;
  eyebrowSize?: number;
  subheadSize?: number;
  maxWidth?: number;
  textColor?: string;
  subheadColor?: string;
  eyebrowColor?: string;
  showAccentBar?: boolean;
}

/**
 * Typography overlay — bold minimal headlines per Apple/Stripe launch film style
 * Position: bl=bottom-left, br=bottom-right, tc=top-center, bc=bottom-center, etc
 */
export const TextBlock: React.FC<TextBlockProps> = ({
  eyebrow,
  headline,
  subhead,
  position = "bl",
  startFrame = 0,
  accentColor = COLORS.PRIMARY,
  headlineSize = 76,
  eyebrowSize = 22,
  subheadSize = 28,
  maxWidth = 1400,
  textColor = COLORS.TEXT_WHITE,
  subheadColor = COLORS.TEXT_MUTED,
  eyebrowColor = accentColor,
  showAccentBar = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - startFrame);

  // Staggered entrance
  const eyebrowProgress = spring({ frame: localFrame, fps, config: { damping: 16, stiffness: 120 }, durationInFrames: 20 });
  const headProgress = spring({ frame: localFrame - 5, fps, config: { damping: 14, stiffness: 110 }, durationInFrames: 22 });
  const subProgress = spring({ frame: localFrame - 14, fps, config: { damping: 16, stiffness: 120 }, durationInFrames: 20 });
  const barProgress = spring({ frame: localFrame - 2, fps, config: { damping: 18, stiffness: 140 }, durationInFrames: 18 });

  // Position classes
  const positions: Record<string, React.CSSProperties> = {
    bl: { left: 160, bottom: 200, alignItems: "flex-start", textAlign: "left" },
    br: { right: 160, bottom: 200, alignItems: "flex-end", textAlign: "right" },
    tl: { left: 160, top: 200, alignItems: "flex-start", textAlign: "left" },
    tr: { right: 160, top: 200, alignItems: "flex-end", textAlign: "right" },
    center: { left: "50%", top: "50%", transform: "translate(-50%, -50%)", alignItems: "center", textAlign: "center" },
    tc: { left: "50%", top: 180, transform: "translateX(-50%)", alignItems: "center", textAlign: "center" },
    bc: { left: "50%", bottom: 180, transform: "translateX(-50%)", alignItems: "center", textAlign: "center" },
  };
  const pos = positions[position];

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          maxWidth,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          fontFamily: FONT_FAMILY,
          ...pos,
        }}
      >
        {/* Accent bar + eyebrow */}
        {(eyebrow || showAccentBar) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              opacity: eyebrowProgress,
              transform: `translateY(${(1 - eyebrowProgress) * 12}px)`,
            }}
          >
            {showAccentBar && (
              <div
                style={{
                  width: 60 * barProgress,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: accentColor,
                  boxShadow: `0 0 16px ${accentColor}80`,
                }}
              />
            )}
            {eyebrow && (
              <span
                style={{
                  fontSize: eyebrowSize,
                  fontWeight: 700,
                  color: eyebrowColor,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                {eyebrow}
              </span>
            )}
          </div>
        )}

        {/* Headline */}
        <div
          style={{
            fontSize: headlineSize,
            fontWeight: 800,
            color: textColor,
            letterSpacing: "-0.035em",
            lineHeight: 1.05,
            opacity: headProgress,
            transform: `translateY(${(1 - headProgress) * 20}px)`,
            textShadow: `0 2px 40px rgba(0,0,0,0.6)`,
          }}
        >
          {headline}
        </div>

        {/* Subhead */}
        {subhead && (
          <div
            style={{
              fontSize: subheadSize,
              fontWeight: 500,
              color: subheadColor,
              letterSpacing: "-0.01em",
              lineHeight: 1.35,
              opacity: subProgress,
              transform: `translateY(${(1 - subProgress) * 16}px)`,
              maxWidth: maxWidth * 0.82,
            }}
          >
            {subhead}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Animated pill CTA button (closing scene)
// ──────────────────────────────────────────────────
export const CTAButton: React.FC<{
  label: string;
  startFrame: number;
  x?: number;
  y?: number;
  accent?: string;
}> = ({ label, startFrame, x = 0, y = 0, accent = COLORS.PRIMARY }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = Math.max(0, frame - startFrame);

  const morph = spring({ frame: lf, fps, config: { damping: 15, stiffness: 100, mass: 0.8 }, durationInFrames: 25 });
  const glow = 0.6 + Math.sin((lf / 24) * Math.PI * 2) * 0.4;
  const hover = lf > 40 ? 1 + 0.03 * Math.sin((lf / 18) * Math.PI * 2) : 1;

  const W = 520 * morph;
  const H = 110;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${hover})`,
        opacity: morph,
      }}
    >
      <div
        style={{
          minWidth: W,
          height: H,
          padding: "0 56px",
          borderRadius: H / 2,
          background: `linear-gradient(135deg, ${accent} 0%, ${accent}e6 50%, ${accent} 100%)`,
          boxShadow: `0 10px 40px ${accent}66, 0 4px 12px rgba(0,0,0,0.3), 0 0 ${30 + glow * 40}px ${accent}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          fontFamily: FONT_FAMILY,
          color: "#fff",
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          border: `1px solid ${accent}`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Button sheen */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, height: "50%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 100%)",
            borderRadius: "inherit",
          }}
        />
        <span style={{ fontSize: 40 }}>👉</span>
        <span style={{ zIndex: 1 }}>{label}</span>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────
// Typewriter URL (for closing scene)
// ──────────────────────────────────────────────────
export const TypewriterText: React.FC<{
  text: string;
  startFrame: number;
  charsPerFrame?: number;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  fontFamily?: string;
}> = ({
  text, startFrame, charsPerFrame = 1, x = 0, y = 0, size = 36,
  color = COLORS.TEXT_MUTED, fontFamily = "'JetBrains Mono', monospace",
}) => {
  const frame = useCurrentFrame();
  const lf = Math.max(0, frame - startFrame);
  const shown = Math.min(text.length, Math.floor(lf * charsPerFrame));
  const cursorBlink = Math.floor(frame / 16) % 2 === 0;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        fontFamily,
        fontSize: size,
        color,
        letterSpacing: "0.04em",
        opacity: shown > 0 ? 1 : 0,
      }}
    >
      {text.slice(0, shown)}
      <span style={{ opacity: cursorBlink ? 1 : 0, marginLeft: 3 }}>▍</span>
    </div>
  );
};

export default TextBlock;
