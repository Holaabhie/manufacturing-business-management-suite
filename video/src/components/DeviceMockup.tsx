import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, CUBIC } from "../constants";
import type { DeviceMockupProps } from "../types";

/**
 * Apple-style premium device mockups
 * Renders screenshot inside a stylised bezel — or use clean frame for already-rendered UI PNGs
 *
 * Design decisions:
 * - Uses CSS 3D transform (rotate3d) for parallax tilt
 * - MacBook: 16" aspect ratio (16:10) with soft shadow + blue rim light
 * - iPhone: 19.5:9 aspect ratio with dynamic island cutout
 */
export const DeviceMockup: React.FC<DeviceMockupProps> = ({
  device,
  screenshot,
  tiltY = 0,
  tiltX = 0,
  scale = 1,
  x = 0,
  y = 0,
  rotateZ = 0,
  showReflection = true,
  highlightBox,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animation — spring in on frame 0-25
  const entrance = spring({
    frame: frame,
    fps,
    config: { damping: 16, stiffness: 90, mass: 0.7 },
    durationInFrames: 30,
  });
  const entScale = interpolate(entrance, [0, 1], [0.94, 1]);
  const entOpacity = interpolate(entrance, [0, 1], [0, 1]);

  const isMac = device === "macbook";
  const bezel = isMac ? 14 : 10;
  const deviceW = isMac ? 2600 : 700;
  const deviceH = isMac ? 1640 : 1500;

  // MacBook chrome (keyboard/lower body) extends below screen
  const macBodyExtra = isMac ? deviceW * 0.18 : 0;

  const baseTransform = `
    translate3d(${x}px, ${y}px, 0)
    rotateZ(${rotateZ}deg)
    rotate3d(1, 0, 0, ${tiltX}deg)
    rotate3d(0, 1, 0, ${tiltY}deg)
    scale(${scale * entScale})
  `;

  return (
    <>
      <AbsoluteFill style={{ perspective: 5000, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "48%",
            transform: `translate(-50%, -50%) ${baseTransform}`,
            transformStyle: "preserve-3d",
            opacity: entOpacity,
            width: deviceW,
            height: deviceH + macBodyExtra,
          }}
        >
          {/* Shadow beneath device */}
          <div
            style={{
              position: "absolute",
              left: "10%",
              right: "10%",
              bottom: isMac ? -30 : -40,
              height: isMac ? 80 : 100,
              background: `radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, transparent 70%)`,
              filter: "blur(8px)",
              transform: "translateZ(-80px)",
            }}
          />
          {/* Accent blue rim light */}
          <div
            style={{
              position: "absolute",
              inset: isMac ? -6 : -4,
              borderRadius: isMac ? 32 : 48,
              background: `linear-gradient(135deg, ${COLORS.PRIMARY}30, transparent 40%, transparent 60%, ${COLORS.PRIMARY}20)`,
              filter: "blur(14px)",
              opacity: 0.9,
            }}
          />
          {/* Device body (bezel) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: isMac ? 28 : 44,
              background: isMac
                ? "linear-gradient(180deg, #1A1A1F 0%, #0E0E12 100%)"
                : "linear-gradient(160deg, #3A3A3C 0%, #1C1C1E 40%, #2A2A2C 100%)",
              boxShadow: isMac
                ? `0 30px 80px rgba(0,0,0,0.55), 0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)`
                : `0 40px 100px rgba(0,0,0,0.6), 0 14px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)`,
            }}
          />
          {/* Screen area */}
          <div
            style={{
              position: "absolute",
              left: bezel,
              right: bezel,
              top: bezel,
              bottom: bezel + macBodyExtra,
              borderRadius: isMac ? 14 : 32,
              overflow: "hidden",
              backgroundColor: "#000",
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px ${COLORS.PRIMARY}18`,
            }}
          >
            {/* Screenshot */}
            <Img
              src={`/screenshots/${screenshot}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={() => {
                // Silently fail if missing — handled by fallback below
              }}
            />
            {/* Fallback if screenshot missing */}
            <FallbackMissing />
            {/* Highlight box overlay */}
            {highlightBox && (
              <HighlightOverlay
                {...highlightBox}
                frame={frame}
                fps={fps}
              />
            )}
            {/* Screen glare (subtle, top-right) */}
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "55%",
                height: "35%",
                background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)",
                pointerEvents: "none",
              }}
            />
          </div>
          {/* Dynamic island (iPhone only) */}
          {!isMac && (
            <div
              style={{
                position: "absolute",
                top: bezel + 16,
                left: "50%",
                transform: "translateX(-50%)",
                width: 126,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#000",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
                zIndex: 2,
              }}
            />
          )}
          {/* MacBook chin (model name text area) */}
          {isMac && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: macBodyExtra,
                borderRadius: "0 0 28px 28px",
                background: "linear-gradient(180deg, #0A0A0E 0%, #141418 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  width: 38, height: 24,
                  background: "linear-gradient(180deg, #26262A, #18181C)",
                  borderRadius: "4px 4px 6px 6px / 3px 3px 8px 8px",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              />
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Reflection plane (under device, soft) */}
      {showReflection && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: deviceW * scale * 0.98,
            height: deviceH * 0.5,
            transform: `translate(-50%, ${deviceH * scale * 0.55 + y}px) scaleX(${scale}) rotateZ(${rotateZ}deg)`,
            filter: "blur(2px)",
            opacity: 0.22,
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 80%), url(/screenshots/${screenshot})`,
            backgroundSize: "cover, cover",
            backgroundRepeat: "no-repeat, no-repeat",
            backgroundPosition: "center, center top",
            mixBlendMode: "screen",
            pointerEvents: "none",
            borderRadius: "20px",
            WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 60%)",
            maskImage: "linear-gradient(180deg, black 0%, transparent 60%)",
          }}
        />
      )}
    </>
  );
};

// ──────────────────────────────────────────────────
// Missing screenshot fallback — shows filename hint
// ──────────────────────────────────────────────────
const FallbackMissing: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "repeating-linear-gradient(45deg, #1A1D26 0px, #1A1D26 20px, #15181F 20px, #15181F 40px)",
        color: COLORS.TEXT_MUTED,
        fontFamily: "monospace",
        fontSize: 22,
      }}
    >
      [Screenshot place here — copy PNG to /video/public/screenshots/]
    </div>
  );
};

// ──────────────────────────────────────────────────
// Highlight box — pulsing glow ring around screen region
// ──────────────────────────────────────────────────
const HighlightOverlay: React.FC<{
  x: number; y: number; w: number; h: number; frame: number; fps: number; color?: string;
}> = ({ x, y, w, h, frame, fps, color = COLORS.PRIMARY }) => {
  const t = (frame % (fps * 1.4)) / (fps * 1.4);
  const pulse = 0.6 + Math.sin(t * Math.PI * 2) * 0.4;
  const ring = 2 + pulse * 2;
  return (
    <>
      {/* Dimming background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.35)",
          pointerEvents: "none",
        }}
      />
      {/* Cut-out (no dim) via hole — we use 4 rects around the box */}
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: `${w}%`,
          height: `${h}%`,
          boxShadow: `0 0 0 ${ring + 1}px ${color}, 0 0 ${30 + pulse * 20}px ${color}aa, inset 0 0 ${20 + pulse * 10}px ${color}33`,
          borderRadius: 12,
          backgroundColor: "transparent",
          pointerEvents: "none",
          transform: `scale(${1 + pulse * 0.01})`,
        }}
      />
    </>
  );
};

export default DeviceMockup;
