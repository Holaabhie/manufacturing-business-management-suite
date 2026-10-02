import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { TextBlock } from "../components/TextLayers";
import { COLORS, SHOTS } from "../constants";

/**
 * Scene 7 — TALLY SYNC (7s)
 * Layered 3D card stack with depth parallax:
 *   - BACK: Faded Tally UI (sepia)
 *   - MID:  Animated dashed data flow arrows
 *   - FRONT: IND Manager dashboard + sync icon spin → green ✓
 *
 * Entire stack tilts subtly on X/Y axes.
 */
export const SceneTally: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Continuous tilt for parallax stereoscopic feel
  const tiltY = interpolate(frame, [0, durationInFrames], [0, 6]);
  const tiltX = interpolate(frame, [0, durationInFrames], [-2, 3]);

  // Sync icon rotation: 3 complete spins over 5s (150 frames)
  const syncSpin = interpolate(frame, [30, 180], [0, 360 * 3], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const syncT = Math.min(1, Math.max(0, (frame - 180) / 30));
  const checkAppear = syncT;

  return (
    <AbsoluteFill>
      <Background variant="feature" glowPosition="br" accentColor={COLORS.PRIMARY} accentOpacity={0.12} />

      {/* 3D parallax tilt container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 3500,
          transformStyle: "preserve-3d",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            transform: `translate(-50%, -50%) rotate3d(1,0,0,${tiltX}deg) rotate3d(0,1,0,${tiltY}deg)`,
            transformStyle: "preserve-3d",
            width: 3000, height: 1700,
          }}
        >
          {/* BACK LAYER — Tally UI (faded sepia, Z=-300) */}
          <TallyBackLayer frame={frame} fps={fps} zIndex={-300} />

          {/* MID LAYER — Flowing data connection arrows */}
          <DataFlowLayer frame={frame} fps={fps} zIndex={0} />

          {/* FRONT LAYER — IND Manager dashboard */}
          <FrontIndManager frame={frame} fps={fps} zIndex={300} syncSpin={syncSpin} checkAppear={checkAppear} />
        </div>
      </div>

      {/* Text block bottom-right */}
      <TextBlock
        eyebrow="TALLY SYNC"
        headline="Ek click me Tally ERP me data jaye"
        subhead="Manual data entry ka tension khatam. Vouchers auto-sync."
        position="br"
        startFrame={22}
      />
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// BACK: Tally ERP 9 reference UI (sepia/faded)
// ──────────────────────────────────────────────────
const TallyBackLayer: React.FC<{ frame: number; fps: number; zIndex: number }> = ({ zIndex }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 120, top: 250,
        width: 1100, height: 1150,
        borderRadius: 18,
        transform: `translateZ(${zIndex}px)`,
        transformStyle: "preserve-3d",
        background:
          "linear-gradient(180deg, rgba(74,44,6,0.3) 0%, rgba(40,25,5,0.25) 100%)",
        border: "1px solid rgba(245,158,11,0.35)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        overflow: "hidden",
        filter: "sepia(0.55) saturate(0.85) brightness(0.85)",
        opacity: 0.68,
      }}
    >
      {/* Tally-style header bar (green) */}
      <div
        style={{
          height: 60,
          background: "linear-gradient(180deg, #1b6b3a 0%, #124a27 100%)",
          display: "flex", alignItems: "center", padding: "0 24px",
          color: "#f7e9c8", fontFamily: "monospace", fontSize: 20, fontWeight: 700,
        }}
      >
        <span style={{ marginRight: 10 }}>⬢</span>
        Gateway of Tally.ERP 9 — [Company Info]
      </div>
      {/* Fake voucher entries grid */}
      <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 10 }}>
        {["Date", "Particulars", "Vch Type", "Debit", "Credit", "Sales Voucher #SV-1245", "Purchase Voucher #PV-8834", "Payment Voucher #PV-2211"].map((r, i) => (
          <div
            key={i}
            style={{
              padding: "14px 18px",
              borderRadius: 4,
              background: i < 2 ? "rgba(245,158,11,0.08)" : "rgba(0,0,0,0.2)",
              color: i < 2 ? "#f5d79a" : "#c8b080",
              fontFamily: "monospace",
              fontSize: 18,
              borderBottom: "1px solid rgba(245,158,11,0.1)",
            }}
          >
            {r}
          </div>
        ))}
      </div>
      {/* Corner label */}
      <div
        style={{
          position: "absolute",
          bottom: 20, left: 24,
          color: "rgba(245,158,11,0.7)",
          fontFamily: "monospace",
          fontSize: 16,
          letterSpacing: "0.04em",
        }}
      >
        Tally ERP 9 · Accounting / Inventory
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────
// MID: Data flow lines + traveling particles
// ──────────────────────────────────────────────────
const DataFlowLayer: React.FC<{ frame: number; fps: number; zIndex: number }> = ({ frame, fps, zIndex }) => {
  // Animated path: from right of tally to left of IND Manager
  const pathStart = { x: 1220, y: 820 };
  const pathEnd = { x: 1720, y: 820 };
  const drawProgress = Math.min(1, (frame - 12) / 30);

  const pathD = `M ${pathStart.x} ${pathStart.y}
    C ${pathStart.x + 200} ${pathStart.y - 60},
      ${pathEnd.x - 200}   ${pathEnd.y + 60},
      ${pathEnd.x} ${pathEnd.y}`;

  // Number of traveling particles
  const particles = 10;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `translateZ(${zIndex}px)`,
        transformStyle: "preserve-3d",
      }}
    >
      <svg width={3000} height={1700} style={{ position: "absolute", inset: 0 }}>
        {/* Shadow dashed line beneath */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth={7}
          strokeDasharray="18 14"
          strokeDashoffset={-(frame * 1.5)}
          opacity={drawProgress * 0.55}
          strokeLinecap="round"
          transform="translate(0 6)"
        />
        {/* Main dashed line */}
        <path
          d={pathD}
          fill="none"
          stroke={COLORS.PRIMARY}
          strokeWidth={4.5}
          strokeDasharray="22 16"
          strokeDashoffset={-(frame * 3)}
          opacity={drawProgress}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 10px ${COLORS.PRIMARY})` }}
        />
        {/* Gradient glow stroke */}
        <defs>
          <linearGradient id="flow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={COLORS.WARNING} stopOpacity={drawProgress * 0.7} />
            <stop offset="100%" stopColor={COLORS.PRIMARY} stopOpacity={drawProgress} />
          </linearGradient>
        </defs>
      </svg>

      {/* Traveling data packet particles */}
      {Array.from({ length: particles }).map((_, i) => {
        const phase = ((frame * 0.012) + (i / particles)) % 1;
        // Quadratic bezier point at parameter phase
        const t = phase;
        const x = (1 - t) * (1 - t) * pathStart.x + 2 * (1 - t) * t * (pathStart.x + 200) + t * t * pathEnd.x;
        const y = (1 - t) * (1 - t) * pathStart.y + 2 * (1 - t) * t * (pathStart.y - 60) + t * t * pathEnd.y;
        const size = 7 + (i % 3);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: i % 2 === 0 ? COLORS.PRIMARY : "#fff",
              boxShadow: `0 0 ${size * 3}px ${COLORS.PRIMARY}cc`,
              opacity: drawProgress * (phase > 0.05 && phase < 0.95 ? 1 : 0),
            }}
          />
        );
      })}

      {/* Arrow head at front (end of path) once drawn */}
      {drawProgress > 0.5 && (
        <div
          style={{
            position: "absolute",
            left: pathEnd.x - 12,
            top: pathEnd.y - 30,
            fontSize: 56,
            color: COLORS.PRIMARY,
            transform: "rotate(-20deg)",
            filter: `drop-shadow(0 0 10px ${COLORS.PRIMARY})`,
            opacity: (drawProgress - 0.5) * 2,
          }}
          >
            ➜
          </div>
        )}
    </div>
  );
};

// ──────────────────────────────────────────────────
// FRONT: IND Manager dashboard + sync indicator
// ──────────────────────────────────────────────────
const FrontIndManager: React.FC<{
  frame: number; fps: number; zIndex: number; syncSpin: number; checkAppear: number;
}> = ({ zIndex, syncSpin, checkAppear }) => {
  return (
    <div
      style={{
        position: "absolute",
        right: 120, top: 180,
        width: 1250, height: 1300,
        transform: `translateZ(${zIndex}px)`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Dashboard screenshot inside */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 24,
          overflow: "hidden",
          background: "#000",
          border: `1.5px solid ${COLORS.PRIMARY}55`,
          boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${COLORS.PRIMARY}22, inset 0 0 0 1px rgba(255,255,255,0.06)`,
        }}
      >
        <img
          src={`/screenshots/${SHOTS.ADMIN_DASHBOARD}`}
          alt="Dashboard"
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        {/* Screenshot fallback */}
        <div
          style={{
            position: "absolute", inset: 0,
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(15,17,23,0.85) 100%), repeating-linear-gradient(45deg, #15171d 0 30px, #1a1d25 30px 60px)",
            pointerEvents: "none",
          }}
        />
        {/* KPI row tiles */}
        <div style={{ position: "absolute", inset: 28, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
          {["₹24.8L Revenue", "67 Orders", "32 Products", "₹8.1L Pending"].map((t, i) => (
            <div key={i}
              style={{
                padding: "22px 20px",
                borderRadius: 14,
                background: "rgba(15,17,23,0.55)",
                border: `1px solid ${COLORS.BORDER}`,
                color: COLORS.TEXT_WHITE,
                fontFamily: "Inter",
                fontWeight: 800, fontSize: 22,
              }}
            >{t}</div>
          ))}
        </div>
      </div>

      {/* Sync indicator — spinning ↻ icon in top-right corner */}
      <div
        style={{
          position: "absolute",
          right: 40, top: 40,
          width: 92, height: 92,
          borderRadius: "50%",
          background:
            checkAppear > 0.5
              ? `radial-gradient(circle, ${COLORS.SUCCESS} 0%, ${COLORS.SUCCESS}aa 100%)`
              : `radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(15,17,23,0.85) 100%)`,
          border: `2px solid ${checkAppear > 0.5 ? COLORS.SUCCESS : COLORS.PRIMARY_50}`,
          boxShadow: checkAppear > 0.5
            ? `0 0 40px ${COLORS.SUCCESS}99, inset 0 0 20px ${COLORS.SUCCESS}44`
            : `0 0 30px ${COLORS.PRIMARY_50}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: checkAppear > 0.5 ? `scale(${1 + checkAppear * 0.15})` : `rotate(${syncSpin}deg)`,
          transition: "none",
        }}
      >
        <div style={{
          fontSize: checkAppear > 0.5 ? 54 : 48,
          color: checkAppear > 0.5 ? "#fff" : COLORS.PRIMARY,
          fontWeight: 900,
          opacity: 1 - checkAppear,
          textShadow: `0 0 12px ${COLORS.PRIMARY}`,
        }}>
          {checkAppear < 0.9 ? "↻" : ""}
        </div>
        <div style={{
          position: "absolute",
          fontSize: 52, color: "#fff",
          opacity: checkAppear,
          transform: `scale(${0.5 + checkAppear * 0.5})`,
        }}>✓</div>
      </div>

      {/* Sync label */}
      <div
        style={{
          position: "absolute",
          right: 32, top: 146,
          padding: "8px 18px",
          borderRadius: 999,
          background:
            checkAppear > 0.5
              ? `linear-gradient(90deg, ${COLORS.SUCCESS}33, ${COLORS.SUCCESS}12)`
              : `linear-gradient(90deg, ${COLORS.PRIMARY_20}, ${COLORS.PRIMARY_8})`,
          color: checkAppear > 0.5 ? COLORS.SUCCESS : COLORS.PRIMARY,
          border: `1px solid ${checkAppear > 0.5 ? COLORS.SUCCESS : COLORS.PRIMARY}55`,
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: "0.05em",
        }}
      >
        {checkAppear > 0.5 ? "✓ SYNCED · 24 vouchers" : "SYNCING…"}
      </div>
    </div>
  );
};

export default SceneTally;
