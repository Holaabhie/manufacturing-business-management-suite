import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig, Img } from "remotion";
import { Background } from "../components/Background";
import { COLORS, FONT_FAMILY } from "../constants";

/**
 * Scene 1 — HOOK (5s)
 * Pain-point montage: Excel chaos → Paper register → WhatsApp spam
 * Rapid match-cuts, desaturated cool tint, soft vignette
 */
export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // 3 quick cuts at 0s, 1.2s, 2.4s — each 1.2s duration
  const cut1End = fps * 1.2;
  const cut2Start = cut1End;
  const cut2End = cut2Start + fps * 1.2;
  const cut3Start = cut2End;
  const cut3End = cut3Start + fps * 1.2;
  const fadeToBlack = durationInFrames - fps * 0.8;

  const globalFadeBlack = interpolate(frame, [fadeToBlack, durationInFrames], [0, 1]);

  return (
    <AbsoluteFill>
      <Background variant="hook" glowPosition="center" accentColor="#3B82F6" accentOpacity={0.05} />

      {/* Pain image 1 — Excel */}
      {frame < cut2Start && (
        <PainFrame
          title="Excel"
          subtitle="Error cells. Chaotic formulas."
          icon="📊"
          tint="#1e3a8a"
          activeFrame={frame}
          startFrame={0}
          endFrame={cut1End}
          width={width}
          height={height}
        />
      )}

      {/* Pain image 2 — Paper register */}
      {frame >= cut2Start && frame < cut3Start && (
        <PainFrame
          title="Register"
          subtitle="Paper records. Pencil scratches."
          icon="📒"
          tint="#78350f"
          activeFrame={frame - cut2Start}
          startFrame={0}
          endFrame={cut1End}
          width={width}
          height={height}
        />
      )}

      {/* Pain image 3 — WhatsApp */}
      {frame >= cut3Start && (
        <PainFrame
          title="WhatsApp"
          subtitle="Messages lost. Orders missed."
          icon="💬"
          tint="#064e3b"
          activeFrame={frame - cut3Start}
          startFrame={0}
          endFrame={cut1End}
          width={width}
          height={height}
        />
      )}

      {/* Centered hook question text */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            fontFamily: FONT_FAMILY,
            textAlign: "center",
            width: "85%",
          }}
        >
          {/* Headline */}
          <div
            style={{
              fontSize: 148,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              color: "#F1F5F9",
              marginBottom: 30,
              opacity: interpolate(frame, [10, 30], [0, 1]),
              transform: `translateY(${interpolate(frame, [10, 30], [30, 0])}px)`,
              textShadow: "0 8px 60px rgba(0,0,0,0.85)",
            }}
          >
            Excel? Register? WhatsApp?
          </div>
          {/* Subhead */}
          <div
            style={{
              fontSize: 40,
              fontWeight: 500,
              color: COLORS.TEXT_MUTED,
              letterSpacing: "-0.01em",
              opacity: interpolate(frame, [22, 42], [0, 1]),
              transform: `translateY(${interpolate(frame, [22, 42], [20, 0])}px)`,
            }}
          >
            Manufacturing ka business ab old-school nahi chalega
          </div>
        </div>
      </AbsoluteFill>

      {/* Global fade to black for next scene transition */}
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          opacity: globalFadeBlack,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Single pain-frame tile with icon + title
// ──────────────────────────────────────────────────
const PainFrame: React.FC<{
  title: string; subtitle: string; icon: string; tint: string;
  activeFrame: number; startFrame: number; endFrame: number;
  width: number; height: number;
}> = ({ title, subtitle, icon, tint, activeFrame, endFrame, width, height }) => {
  // Entrance (scale + blur rack-focus in)
  const inP = interpolate(activeFrame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  // Out (fade + blur)
  const outP = interpolate(activeFrame, [endFrame - 10, endFrame], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const combined = Math.min(inP, outP);
  const scale = interpolate(inP, [0, 1], [1.12, 1.04]);

  return (
    <AbsoluteFill style={{ opacity: combined, filter: `blur(${(1 - inP) * 18}px)` }}>
      {/* Dark moody pattern representing the pain */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(circle at 50% 40%, ${tint}55 0%, transparent 50%),
            repeating-linear-gradient(
              ${90 + activeFrame * 0.15}deg,
              rgba(255,255,255,0.025) 0px,
              rgba(255,255,255,0.025) 1px,
              transparent 1px,
              transparent 48px
            )
          `,
          transform: `scale(${scale})`,
        }}
      />
      {/* Giant background emoji icon with low opacity grid pattern */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "42%",
          transform: "translate(-50%, -50%)",
          fontSize: 600,
          opacity: 0.04,
          filter: `blur(6px) saturate(0.6)`,
        }}
      >
        {icon}
      </div>
      {/* Grid noise to represent chaos */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          mixBlendMode: "overlay",
          opacity: 0.4,
        }}
      />
    </AbsoluteFill>
  );
};

export default SceneHook;
