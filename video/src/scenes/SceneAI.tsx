import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { TextBlock } from "../components/TextLayers";
import { COLORS, SHOTS } from "../constants";

/**
 * Scene 8 — AI ASSISTANT (7s)
 * Close-up punch-in to chat UI. Hindi user message → AI typing indicator →
 * response card with bar chart (staggered bar grow).
 * Purple AI-accent glow emanates from chat bubble.
 */
export const SceneAI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Punch-in (zoom 1.0× → 1.15× over first 30 frames, rack-focus sharpens)
  const punch = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const screenScale = 1 + punch * 0.14;
  const rackBlur = (1 - punch) * 4;

  // Timing
  const USER_MESSAGE_IN = fps * 0.6;   // User bubble in @0.6s
  const TYPING_START = fps * 1.6;     // AI typing indicator
  const RESPONSE_IN = fps * 3.0;      // Response card slides up
  const CHART_START = fps * 3.6;      // Chart bars grow

  return (
    <AbsoluteFill>
      <Background variant="feature" glowPosition="center" accentColor={COLORS.AI_ACCENT} accentOpacity={0.16} />

      {/* Ambient purple glow overlay from center-right */}
      <div
        style={{
          position: "absolute",
          right: 0, top: "40%",
          width: 1800, height: 1800,
          background: `radial-gradient(circle, ${COLORS.AI_ACCENT}2a 0%, transparent 55%)`,
          filter: "blur(20px)",
          opacity: 0.9,
          pointerEvents: "none",
        }}
      />

      {/* MacBook close-up crop (chat-centric view) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${screenScale})`,
          filter: `blur(${rackBlur}px)`,
        }}
      >
        <ChatScreenFrame
          frame={frame}
          fps={fps}
          USER_MESSAGE_IN={USER_MESSAGE_IN}
          TYPING_START={TYPING_START}
          RESPONSE_IN={RESPONSE_IN}
          CHART_START={CHART_START}
        />
      </div>

      {/* Text block top-left */}
      <TextBlock
        eyebrow="AI ASSISTANT"
        headline="Hindi me boliye, report taiyaar hai"
        subhead="Apni bhasha me puchho — charts, insights, reports sab 2 second me"
        position="tl"
        startFrame={28}
        accentColor={COLORS.AI_ACCENT}
      />
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Chat screen close-up crop with animated bubbles
// ──────────────────────────────────────────────────
const ChatScreenFrame: React.FC<{
  frame: number; fps: number;
  USER_MESSAGE_IN: number;
  TYPING_START: number;
  RESPONSE_IN: number;
  CHART_START: number;
}> = ({ frame, fps, USER_MESSAGE_IN, TYPING_START, RESPONSE_IN, CHART_START }) => {
  return (
    <AbsoluteFill style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* App background container (macbook chrome) */}
      <div
        style={{
          position: "absolute",
          left: "50%", top: "48%",
          transform: "translate(-50%, -50%)",
          width: 2800, height: 1600,
          borderRadius: 24,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(15,17,23,0.95) 100%)",
          border: `1px solid ${COLORS.BORDER}`,
          boxShadow: `0 40px 120px rgba(0,0,0,0.7), 0 0 120px ${COLORS.AI_ACCENT}22`,
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            height: 72,
            borderBottom: `1px solid ${COLORS.BORDER}`,
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
            gap: 18,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          {/* AI assistant icon */}
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: `linear-gradient(135deg, ${COLORS.AI_ACCENT} 0%, #4C1D95 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 24, fontWeight: 900,
              boxShadow: `0 0 24px ${COLORS.AI_ACCENT}88`,
            }}
          >
            ✦
          </div>
          <div>
            <div style={{ color: COLORS.TEXT_WHITE, fontSize: 22, fontWeight: 800 }}>
              IND Manager · AI Assistant
            </div>
            <div style={{ color: COLORS.AI_ACCENT, fontSize: 16, fontWeight: 600 }}>
              ●  Online · Hindi + English
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
          {/* User message bubble */}
          <UserBubble frame={frame} startFrame={USER_MESSAGE_IN} fps={fps}>
            Mere top 5 clients ka sales report banao
          </UserBubble>

          {/* AI Typing indicator */}
          {frame >= TYPING_START && frame < RESPONSE_IN + 10 && (
            <TypingIndicator
              frame={frame - TYPING_START}
              fps={fps}
              opacity={Math.min(1, (RESPONSE_IN - frame) / 12 + 0.2)}
            />
          )}

          {/* AI Response card */}
          {frame >= RESPONSE_IN && (
            <AIResponseCard
              frame={frame - RESPONSE_IN}
              fps={fps}
              CHART_START={CHART_START - RESPONSE_IN}
            />
          )}
        </div>

        {/* Bottom input bar */}
        <div
          style={{
            position: "absolute",
            left: 28, right: 28, bottom: 28,
            height: 76,
            borderRadius: 20,
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${COLORS.BORDER}`,
            padding: "0 26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ color: COLORS.TEXT_MUTED, fontSize: 22 }}>
            Kuch puchhiye… Hindi, English, Gujarati, Marathi
          </div>
          <div
            style={{
              width: 54, height: 54, borderRadius: 16,
              background: `linear-gradient(135deg, ${COLORS.AI_ACCENT} 0%, #6366F1 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 26, fontWeight: 700,
              boxShadow: `0 0 28px ${COLORS.AI_ACCENT}88`,
            }}
          >
            →
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// User chat bubble (right-aligned)
// ──────────────────────────────────────────────────
const UserBubble: React.FC<{ children: React.ReactNode; frame: number; startFrame: number; fps: number }> = ({
  children, frame, startFrame, fps,
}) => {
  const lf = frame - startFrame;
  const s = spring({ frame: lf, fps, config: { damping: 16, stiffness: 140 }, durationInFrames: 22 });
  return (
    <div
      style={{
        alignSelf: "flex-end",
        maxWidth: "72%",
        transform: `translateY(${(1 - s) * 24}px) translateX(${(1 - s) * 40}px) scale(${0.96 + s * 0.04})`,
        opacity: s,
      }}
    >
      <div
        style={{
          padding: "22px 28px",
          borderRadius: "22px 22px 6px 22px",
          background: `linear-gradient(135deg, ${COLORS.PRIMARY} 0%, #1D4ED8 100%)`,
          color: "#fff",
          fontSize: 28,
          fontWeight: 600,
          lineHeight: 1.3,
          boxShadow: `0 10px 30px ${COLORS.PRIMARY}44`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────
// AI typing 3-dot bouncing indicator
// ──────────────────────────────────────────────────
const TypingIndicator: React.FC<{ frame: number; fps: number; opacity: number }> = ({ frame, fps, opacity }) => {
  const bounce = [
    0.5 + Math.sin(frame / 4) * 0.5,
    0.5 + Math.sin(frame / 4 + 2.1) * 0.5,
    0.5 + Math.sin(frame / 4 + 4.2) * 0.5,
  ];
  return (
    <div
      style={{
        alignSelf: "flex-start",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "20px 26px",
        borderRadius: "22px 22px 22px 6px",
        background: `rgba(124, 58, 237, 0.14)`,
        border: `1px solid ${COLORS.AI_ACCENT}33`,
        boxShadow: `0 0 40px ${COLORS.AI_ACCENT}18`,
        opacity,
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 10,
          background: `linear-gradient(135deg, ${COLORS.AI_ACCENT}, #4C1D95)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 18, fontWeight: 900,
          boxShadow: `0 0 18px ${COLORS.AI_ACCENT}99`,
        }}
      >✦</div>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 14, height: 14, borderRadius: "50%",
            background: COLORS.AI_ACCENT,
            boxShadow: `0 0 12px ${COLORS.AI_ACCENT}88`,
            transform: `translateY(${-bounce[i] * 10}px)`,
          }}
        />
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────────
// AI response card + report summary + bar chart
// ──────────────────────────────────────────────────
const AIResponseCard: React.FC<{ frame: number; fps: number; CHART_START: number }> = ({
  frame, fps, CHART_START,
}) => {
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 100, mass: 0.8 }, durationInFrames: 28 });
  return (
    <div
      style={{
        alignSelf: "flex-start",
        maxWidth: "88%",
        transform: `translateY(${(1 - s) * 40}px)`,
        opacity: s,
      }}
    >
      <div
        style={{
          borderRadius: 26,
          background:
            "linear-gradient(180deg, rgba(124, 58, 237, 0.12) 0%, rgba(15,17,23,0.92) 100%)",
          border: `1.5px solid ${COLORS.AI_ACCENT}55`,
          boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 60px ${COLORS.AI_ACCENT}22`,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "22px 32px",
          borderBottom: `1px solid ${COLORS.AI_ACCENT}33`,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: `linear-gradient(135deg, ${COLORS.AI_ACCENT}, #4C1D95)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 20, fontWeight: 900,
            }}
          >✦</div>
          <div style={{ color: COLORS.TEXT_WHITE, fontSize: 24, fontWeight: 800 }}>
            Top 5 Clients · Sales Report
          </div>
          <div style={{
            marginLeft: "auto", padding: "8px 18px", borderRadius: 999,
            background: `${COLORS.AI_ACCENT}22`,
            color: COLORS.AI_ACCENT,
            fontSize: 18, fontWeight: 700, border: `1px solid ${COLORS.AI_ACCENT}44`,
          }}>
            2.1s · Generated
          </div>
        </div>
        {/* Body: summary + chart */}
        <div style={{ padding: 28, display: "flex", gap: 28 }}>
          {/* Summary list */}
          <div style={{ width: 520, display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              ["1.", "Sharma Industries", "₹8.4L", COLORS.PRIMARY],
              ["2.", "Patel Enterprises", "₹6.2L", COLORS.SUCCESS],
              ["3.", "Gupta Traders", "₹4.8L", COLORS.WARNING],
              ["4.", "Reliable Mfg Co", "₹3.1L", COLORS.AI_ACCENT],
              ["5.", "Singh & Sons", "₹2.3L", "#EC4899"],
            ].map((row, i) => {
              const rowIn = spring({
                frame: frame - 14 - i * 5, fps,
                config: { damping: 16, stiffness: 140 }, durationInFrames: 18,
              });
              return (
                <div
                  key={i}
                  style={{
                    padding: "16px 20px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${COLORS.BORDER}`,
                    display: "flex", alignItems: "center", gap: 14,
                    opacity: rowIn,
                    transform: `translateX(${(1 - rowIn) * 20}px)`,
                  }}
                >
                  <span style={{
                    color: row[3] as string, fontSize: 22, fontWeight: 900, width: 40,
                  }}>{row[0]}</span>
                  <span style={{
                    flex: 1, color: COLORS.TEXT_WHITE, fontSize: 22, fontWeight: 600,
                  }}>{row[1]}</span>
                  <span style={{
                    color: COLORS.TEXT_WHITE, fontSize: 22, fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}>{row[2]}</span>
                </div>
              );
            })}
          </div>
          {/* Bar chart */}
          <div style={{ flex: 1, height: 320 }}>
            <AIBarChart frame={frame} startFrame={CHART_START} fps={fps} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────
// AI-generated bar chart (staggered grow)
// ──────────────────────────────────────────────────
const AIBarChart: React.FC<{ frame: number; startFrame: number; fps: number }> = ({
  frame, startFrame, fps,
}) => {
  const DATA = [84, 62, 48, 31, 23];
  const COLORS_ARR = [COLORS.PRIMARY, COLORS.SUCCESS, COLORS.WARNING, COLORS.AI_ACCENT, "#EC4899"];
  const LABELS = ["Sharma", "Patel", "Gupta", "Reliable", "Singh"];
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        color: COLORS.TEXT_MUTED, fontSize: 18,
      }}>
        <span style={{ color: COLORS.AI_ACCENT, fontWeight: 700 }}>📈 Sales</span>
        (in ₹ Lakhs)
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 20, padding: "12px 4px" }}>
        {DATA.map((v, i) => {
          const lf = Math.max(0, frame - startFrame - i * 7);
          const p = Math.min(1, lf / 22);
          const eased = 1 - Math.pow(1 - p, 3);
          const h = v * 2.7 * eased;
          return (
            <div key={i} style={{
              flex: 1, height: "100%",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
              gap: 10,
            }}>
              <div style={{
                color: COLORS.TEXT_WHITE, fontWeight: 800, fontSize: 20,
                opacity: p, transform: `translateY(${(1 - p) * 10}px)`,
              }}>
                {v > 0 && p > 0.4 ? `₹${v / 10}L` : ""}
              </div>
              <div style={{
                width: "100%", height: h,
                borderRadius: "12px 12px 4px 4px",
                background: `linear-gradient(180deg, ${COLORS_ARR[i]} 0%, ${COLORS_ARR[i]}cc 100%)`,
                boxShadow: `0 0 24px ${COLORS_ARR[i]}77, inset 0 1px 0 rgba(255,255,255,0.2)`,
                position: "relative",
              }}>
                {p > 0.5 && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                    transform: `translateX(${-100 + p * 200}%)`,
                    borderRadius: "inherit",
                  }} />
                )}
              </div>
              <div style={{
                color: COLORS.TEXT_MUTED, fontSize: 18,
                opacity: Math.min(1, p * 1.4),
              }}>{LABELS[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SceneAI;
