import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { TextBlock } from "../components/TextLayers";
import { COLORS, SHOTS } from "../constants";

/**
 * Scene 9 — MULTI-LANGUAGE × MOBILE (8s)
 * 4 iPhone device carousel arranged in gentle arc with Z-depth separation.
 * Rotates Y-axis slowly, each device highlights as it reaches front.
 * Behind: Cobe-style 3D globe (India highlighted) slow rotation.
 */
export const SceneMultilang: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Carousel rotation over duration: 0° → +30° (gentle)
  const rotation = interpolate(frame, [0, durationInFrames], [0, 30], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Which card is in front (front-center position)? rotates along with carousel
  const N = 4;

  const DEVICES = [
    { label: "ENGLISH", labelShort: "EN", color: COLORS.TEXT_WHITE, shot: SHOTS.DASHBOARD_MOBILE },
    { label: "हिन्दी", labelShort: "HI", color: "#FF9933", shot: SHOTS.CHALLANS_HI },
    { label: "ગુજરાતી", labelShort: "GU", color: "#FFFFFF", shot: SHOTS.CLIENTS_SAMPLE_375 },
    { label: "मराठी", labelShort: "MR", color: "#F1D41E", shot: SHOTS.VERIFY_390 },
  ];

  // Globe highlight pulse timing (hits at ~2.8s into the scene)
  const indiaHighlight = 0.75 + 0.25 * Math.sin((frame / (fps * 1.3)) * Math.PI * 2);

  return (
    <AbsoluteFill>
      <Background variant="globe" accentColor={COLORS.AI_ACCENT} accentOpacity={0.1} />

      {/* ── 3D Globe (back layer) ── */}
      <Globe3D frame={frame} fps={fps} highlight={indiaHighlight} />

      {/* ── Device Carousel (foreground layer) ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          transform: "translate(-50%, -50%)",
          perspective: 2500,
          width: 3200, height: 1600,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
            transform: `rotateY(${rotation}deg)`,
          }}
        >
          {DEVICES.map((d, i) => {
            // Place in arc: each 22° around Y axis, 60px Z depth per
            const angle = -33 + i * 22; // -33, -11, +11, +33
            const zDepth = i * 60 - (N - 1) * 30; // -90, -30, +30, +90
            const Xtransl = i * 420 - (N - 1) * 210; // -630, -210, +210, +630
            const highlightT = Math.max(0, 1 - Math.abs((i - 1.5)) / 2);
            const isFront = angle - rotation > -12 && angle - rotation < 18;
            return (
              <DeviceInArc
                key={i}
                index={i}
                label={d.label}
                labelShort={d.labelShort}
                color={d.color}
                shot={d.shot}
                x={Xtransl}
                z={zDepth}
                y={0}
                rotateY={angle * 0.35}
                isFront={isFront}
                frame={frame}
                fps={fps}
              />
            );
          })}
        </div>
      </div>

      {/* Text block top-center */}
      <TextBlock
        eyebrow="4 भाषाएँ × हर फोन"
        headline="English • Hindi • Gujarati • Marathi"
        subhead="Apni bhasha me app chalayein — iOS, Android, Web sab pe"
        position="tc"
        startFrame={30}
        accentColor={COLORS.PRIMARY}
        headlineSize={72}
      />
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Individual device in the arc
// ──────────────────────────────────────────────────
const DeviceInArc: React.FC<{
  index: number;
  label: string;
  labelShort: string;
  color: string;
  shot: string;
  x: number; z: number; y: number;
  rotateY: number;
  isFront: boolean;
  frame: number; fps: number;
}> = ({ label, labelShort, color, shot, x, z, y, rotateY, isFront, frame, fps }) => {
  const frontSpring = isFront ? 1 : 0.88;
  const pulse = 0.6 + Math.sin((frame / 24 + rotateY) * Math.PI * 2) * 0.4;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${frontSpring})`,
        transformStyle: "preserve-3d",
        filter: isFront ? "none" : "blur(2px) saturate(0.82) brightness(0.85)",
        opacity: isFront ? 1 : 0.82,
      }}
    >
      {/* Device body */}
      <div
        style={{
          width: 300, height: 620,
          borderRadius: 48,
          background: "linear-gradient(160deg, #3A3A3C 0%, #1C1C1E 40%, #2A2A2C 100%)",
          boxShadow: isFront
            ? `0 60px 160px rgba(0,0,0,0.65), 0 0 60px ${COLORS.PRIMARY}33, inset 0 1px 0 rgba(255,255,255,0.12)`
            : "0 40px 100px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
          padding: 12,
          position: "relative",
        }}
      >
        {/* Dynamic island */}
        <div style={{
          position: "absolute", top: 22, left: "50%", transform: "translateX(-50%)",
          width: 86, height: 28, borderRadius: 14, backgroundColor: "#000", zIndex: 5,
        }} />
        {/* Screen */}
        <div style={{
          position: "absolute",
          inset: 12, borderRadius: 36, overflow: "hidden", backgroundColor: "#000",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
        }}>
          <img
            src={`/screenshots/${shot}`}
            alt={label}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          {/* Fallback pattern if screenshot missing */}
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(135deg, ${color}1a, rgba(15,17,23,0.9))`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 14,
          }}>
            <div style={{ fontSize: 80, fontWeight: 900, color }}>{labelShort}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{label}</div>
          </div>
        </div>
      </div>
      {/* Language label pill */}
      <div
        style={{
          position: "absolute",
          left: "50%", transform: "translateX(-50%)",
          bottom: -68,
          padding: "10px 24px",
          borderRadius: 999,
          background: isFront
            ? `linear-gradient(135deg, rgba(37,99,235,0.28), rgba(15,17,23,0.96))`
            : "rgba(15,17,23,0.88)",
          border: `1px solid ${isFront ? COLORS.PRIMARY_50 : COLORS.BORDER}`,
          color,
          fontFamily: "Inter",
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
          boxShadow: isFront ? `0 0 24px ${COLORS.PRIMARY}55` : "none",
          opacity: isFront ? 1 : 0.88,
        }}
      >
        {label}
      </div>
      {/* Glow behind front device */}
      {isFront && (
        <div
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            width: 520, height: 920,
            background: `radial-gradient(ellipse at center, ${COLORS.PRIMARY_20} 0%, transparent 60%)`,
            filter: `blur(${24 + pulse * 16}px)`,
            opacity: 0.9,
            zIndex: -1,
          }}
        />
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────
// 3D Wireframe Globe (Cobe-style), India highlighted
// ──────────────────────────────────────────────────
const Globe3D: React.FC<{ frame: number; fps: number; highlight: number }> = ({ frame, highlight }) => {
  const rotY = (frame * 0.15) % 360;
  const rotX = -18;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%", top: "52%",
        transform: `translate(-50%, -50%) scale(0.9)`,
        width: 1700, height: 1700,
        opacity: 0.38,
        pointerEvents: "none",
      }}
    >
      <svg width="1700" height="1700" viewBox="0 0 1000 1000" style={{ filter: `drop-shadow(0 0 40px ${COLORS.PRIMARY}88)` }}>
        <defs>
          <radialGradient id="globe3d" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor={COLORS.PRIMARY} stopOpacity={0.28 * highlight} />
            <stop offset="70%" stopColor={COLORS.AI_ACCENT} stopOpacity={0.12} />
            <stop offset="100%" stopColor="#0F1117" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="500" cy="500" r="430" fill="url(#globe3d)" />
        <g
          style={{
            transformOrigin: "500px 500px",
            transform: `rotateY(${rotY}deg) rotateX(${rotX}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Latitude lines */}
          {[-60, -30, 0, 30, 60].map((lat, i) => (
            <ellipse
              key={i}
              cx="500"
              cy={500 + lat * 3.2}
              rx={430 * Math.cos((lat * Math.PI) / 180)}
              ry={32}
              fill="none"
              stroke={COLORS.TEXT_WHITE}
              strokeOpacity={0.11}
              strokeWidth="1.2"
            />
          ))}
          {/* Longitude lines */}
          {[0, 30, 60, 90, 120, 150].map((lng, i) => (
            <ellipse
              key={i}
              cx="500" cy="500"
              rx={430 * Math.cos((lng * Math.PI) / 180)}
              ry="430"
              fill="none"
              stroke={COLORS.TEXT_WHITE}
              strokeOpacity={0.09}
              strokeWidth="1.2"
            />
          ))}
          {/* India polygon (approximate) highlighted */}
          <g style={{ transformOrigin: "500px 500px", transform: `rotate(${rotY * 0.8}deg)` }}>
            <path
              d="M 638 480 L 662 470 L 680 488 L 712 500 L 718 530 L 698 572 L 676 598 L 660 620 L 646 648 L 620 664 L 596 646 L 586 614 L 570 594 L 580 556 L 600 518 L 620 498 Z"
              fill={COLORS.PRIMARY}
              fillOpacity={0.4 * highlight}
              stroke={COLORS.PRIMARY}
              strokeWidth={3}
              strokeOpacity={highlight}
              style={{ filter: `drop-shadow(0 0 16px ${COLORS.PRIMARY})` }}
            />
            {/* Indian city dots */}
            {[
              [658, 510], // Delhi
              [672, 572], // Mumbai
              [700, 598], // Chennai
              [690, 540], // Hyderabad
              [670, 628], // Bangalore
            ].map((pt, i) => (
              <circle
                key={i}
                cx={pt[0]}
                cy={pt[1]}
                r={5 + (i === 0 ? 2 : 0)}
                fill={COLORS.PRIMARY}
                style={{ filter: `drop-shadow(0 0 10px ${COLORS.PRIMARY})` }}
              />
            ))}
            {/* Connection arcs out */}
            {[
              [[658, 510], [800, 400]],
              [[672, 572], [520, 200]],
              [[700, 598], [360, 780]],
              [[670, 628], [850, 280]],
            ].map((arc, i) => {
              const [a, b] = arc;
              const mx = (a[0] + b[0]) / 2;
              const my = (a[1] + b[1]) / 2 - 80;
              return (
                <path
                  key={i}
                  d={`M ${a[0]} ${a[1]} Q ${mx} ${my} ${b[0]} ${b[1]}`}
                  fill="none"
                  stroke={COLORS.PRIMARY}
                  strokeWidth={2.2}
                  strokeDasharray="8 10"
                  strokeDashoffset={-(frame * 2)}
                  strokeOpacity={0.9 * highlight}
                />
              );
            })}
          </g>
        </g>
        {/* Outer rim light */}
        <circle cx="500" cy="500" r="430" fill="none" stroke={COLORS.PRIMARY} strokeOpacity={0.35} strokeWidth="2" />
      </svg>
    </div>
  );
};

export default SceneMultilang;
