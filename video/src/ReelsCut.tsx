import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig, Img } from "remotion";
import { COLORS, SCENES_REELS, SHOTS, FPS, FONT_FAMILY } from "./constants";

/**
 * REELS CUT — 9:16 (1080×1920), 30 seconds, 900 frames @ 30fps
 *
 * Strategy: Fast-paced, every cut ≤ 4s, jump-cuts on 120 BPM beat.
 * Text-heavy (85%+ Reels users watch on mute).
 * Animated bounce/impact stylings per TikTok/IG aesthetic.
 *
 * Scene timing:
 * 1. Quick Hook         (0:00-0:02  / 60f)
 * 2. Logo Flash         (0:02-0:03.5/ 45f)
 * 3. Orders             (0:03.5-0:07 / 105f)
 * 4. Inventory          (0:07-0:10.5/ 105f)
 * 5. GST Invoices       (0:10.5-0:14/ 105f)
 * 6. AI × Hindi         (0:14-0:18   / 120f)
 * 7. 4 Languages        (0:18-0:21   / 90f)
 * 8. Tally × Payments   (0:21-0:24   / 90f)
 * 9. CTA Hold           (0:24-0:30   / 180f)
 */
export const ReelsCut: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: FONT_FAMILY }}>
      {/* Scene 1: Hook */}
      <Sequence from={SCENES_REELS.HOOK.start} durationInFrames={SCENES_REELS.HOOK.dur}>
        <ReelsHookScene />
      </Sequence>

      {/* Scene 2: Logo Flash */}
      <Sequence from={SCENES_REELS.LOGO_FLASH.start} durationInFrames={SCENES_REELS.LOGO_FLASH.dur}>
        <ReelsLogoScene />
      </Sequence>

      {/* Scene 3: Orders */}
      <Sequence from={SCENES_REELS.ORDERS.start} durationInFrames={SCENES_REELS.ORDERS.dur}>
        <ReelsFeatureScene
          eyebrow="ORDERS"
          headline="1-CLICK ME"
          bigNumber="₹24.8L"
          bigNumberColor={COLORS.PRIMARY}
          badge="67 Orders ✓"
          icon="📦"
          shot={SHOTS.ORDERS_MOBILE}
          tint={COLORS.PRIMARY}
        />
      </Sequence>

      {/* Scene 4: Inventory */}
      <Sequence from={SCENES_REELS.INVENTORY.start} durationInFrames={SCENES_REELS.INVENTORY.dur}>
        <ReelsFeatureScene
          eyebrow="STOCK"
          headline="LIVE TRACK"
          bigNumber="LOW → READY"
          bigNumberColor={COLORS.SUCCESS}
          badge="⚠️ → ✅"
          icon="📊"
          shot={SHOTS.DASHBOARD_MOBILE}
          tint={COLORS.SUCCESS}
        />
      </Sequence>

      {/* Scene 5: GST Invoices */}
      <Sequence from={SCENES_REELS.INVOICES.start} durationInFrames={SCENES_REELS.INVOICES.dur}>
        <ReelsFeatureScene
          eyebrow="GST"
          headline="COMPLIANT"
          bigNumber="AUTO HSN"
          bigNumberColor={COLORS.WARNING}
          badge="📄 PDF Ready"
          icon="🧾"
          shot={SHOTS.QUOTE_B_MOBILE}
          tint={COLORS.WARNING}
        />
      </Sequence>

      {/* Scene 6: AI × Hindi */}
      <Sequence from={SCENES_REELS.AI.start} durationInFrames={SCENES_REELS.AI.dur}>
        <ReelsAIScene />
      </Sequence>

      {/* Scene 7: 4 Languages flip */}
      <Sequence from={SCENES_REELS.LANGS.start} durationInFrames={SCENES_REELS.LANGS.dur}>
        <ReelsLanguagesScene />
      </Sequence>

      {/* Scene 8: Tally + Payments split */}
      <Sequence from={SCENES_REELS.TALLY_PAY.start} durationInFrames={SCENES_REELS.TALLY_PAY.dur}>
        <ReelsTallyPayScene />
      </Sequence>

      {/* Scene 9: CTA Hold */}
      <Sequence from={SCENES_REELS.CTA.start} durationInFrames={SCENES_REELS.CTA.dur}>
        <ReelsCTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Reusable Reels background plate (dark cinematic)
// ──────────────────────────────────────────────────
const ReelsBG: React.FC<{ tint?: string; tintOpacity?: number; showNoise?: boolean }> = ({
  tint = COLORS.PRIMARY, tintOpacity = 0.16, showNoise = true,
}) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 80) * 4;
  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at 50% ${35 + drift}%, ${tint}${Math.round(tintOpacity * 255).toString(16).padStart(2,"0")} 0%, transparent 55%), #0A0C12`,
      }} />
      {/* Strong vignette for Reels framing */}
      <div style={{
        position: "absolute", inset: 0,
        background:
          "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)",
      }} />
      {showNoise && (
        <div style={{
          position: "absolute", inset: 0,
          opacity: 0.03, mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
          backgroundSize: "220px 220px",
        }} />
      )}
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Scene 1: Hook (Excel → Register → WhatsApp chaos)
// ──────────────────────────────────────────────────
const ReelsHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const CUTS = [
    { until: fps * 0.6, title: "EXCEL?", icon: "📊", tint: "#1e3a8a", sub: "#DIV/0! errors" },
    { until: fps * 1.2, title: "REGISTER?", icon: "📒", tint: "#78350f", sub: "Pencil, paper, dimaag" },
    { until: fps * 2.0, title: "WHATSAPP?", icon: "💬", tint: "#064e3b", sub: "Orders miss ho jaate" },
  ];
  const currentCut = CUTS.findIndex(c => frame < c.until);
  const cut = CUTS[Math.max(0, currentCut)];
  const cutStart = CUTS.slice(0, currentCut).reduce((s, c, i, a) => s + (c.until - (a[i-1]?.until || 0)), 0);
  const localF = Math.max(0, frame - cutStart);

  // Shake
  const shakeX = Math.sin(frame * 18) * (localF < 6 ? 14 - localF : 0);
  const shakeY = Math.cos(frame * 20) * (localF < 6 ? 10 - localF : 0);
  const rot = Math.sin(frame * 24) * (localF < 10 ? 0.8 : 0);

  return (
    <AbsoluteFill>
      <ReelsBG tint={COLORS.DANGER} tintOpacity={0.14} />
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 30,
          transform: `translate(${shakeX}px, ${shakeY}px) rotate(${rot}deg)`,
        }}
      >
        <div style={{
          fontSize: 160,
          opacity: 0.12, filter: "blur(2px)",
          position: "absolute",
        }}>{cut.icon}</div>
        <div style={{
          fontSize: 128,
          fontWeight: 900,
          letterSpacing: "-0.05em",
          color: "#F1F5F9",
          textAlign: "center",
          lineHeight: 0.92,
          textShadow: "0 6px 50px rgba(0,0,0,0.9)",
          maxWidth: 980,
        }}>
          YE CHALOGA<br />
          <span style={{
            color: COLORS.DANGER,
            textShadow: `0 0 40px ${COLORS.DANGER}cc`,
          }}>NAHI ❌</span>
        </div>
        <div style={{
          marginTop: 40, padding: "14px 32px",
          borderRadius: 999,
          background: `${cut.tint}cc`,
          color: "#fff",
          fontSize: 34, fontWeight: 800,
          border: `2px solid rgba(255,255,255,0.12)`,
          letterSpacing: "0.02em",
        }}>
          {cut.title}
        </div>
        <div style={{ color: COLORS.TEXT_MUTED, fontSize: 30, fontWeight: 600 }}>
          {cut.sub}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Scene 2: Logo flash
// ──────────────────────────────────────────────────
const ReelsLogoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 8, stiffness: 180, mass: 0.6 }, durationInFrames: 24 });
  const flash = Math.max(0, 1 - frame / 8);
  return (
    <AbsoluteFill>
      <ReelsBG tint={COLORS.PRIMARY} tintOpacity={0.2} />
      {/* Flash white */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#fff", opacity: flash * 0.3 }} />
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: `translate(-50%, -50%) scale(${0.7 + s * 0.5})`,
        opacity: s,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 22,
      }}>
        <svg width={170} height={170} viewBox="0 0 200 200" fill="none"
          style={{ filter: `drop-shadow(0 0 40px ${COLORS.PRIMARY})` }}>
          <circle cx="100" cy="100" r="90" stroke={COLORS.PRIMARY} strokeWidth="5" fill="none" />
          <path
            d="M55 140 L55 100 L75 80 L95 100 L95 75 L115 55 L135 75 L135 100 L155 100 L155 140 Z M72 140 L72 118 M92 140 L92 118 M112 140 L112 118 M132 140 L132 118 M105 82 L115 82 L115 92 L105 92 Z"
            fill="#fff" fillOpacity={0.95}
            stroke="#fff" strokeWidth="2.5" strokeLinejoin="round"
          />
        </svg>
        <div style={{
          fontSize: 84, fontWeight: 900, letterSpacing: "-0.05em", color: "#fff",
          textShadow: `0 0 50px ${COLORS.PRIMARY}aa, 0 10px 60px rgba(0,0,0,0.8)`,
        }}>
          IND<span style={{ color: COLORS.PRIMARY }}> MANAGER</span>
        </div>
        <div style={{
          padding: "10px 26px", borderRadius: 999,
          background: `${COLORS.PRIMARY}33`,
          border: `1px solid ${COLORS.PRIMARY}66`,
          color: COLORS.TEXT_WHITE, fontSize: 28, fontWeight: 700,
          letterSpacing: "0.04em",
        }}>
          MFG × BILLING × AI
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Generic Feature scene (Reels scenes 3–5)
// ──────────────────────────────────────────────────
const ReelsFeatureScene: React.FC<{
  eyebrow: string;
  headline: string;
  bigNumber: string;
  bigNumberColor: string;
  badge: string;
  icon: string;
  shot: string;
  tint: string;
}> = ({ eyebrow, headline, bigNumber, bigNumberColor, badge, icon, shot, tint }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const headIn = spring({ frame: frame - 4, fps, config: { damping: 16, stiffness: 200 }, durationInFrames: 22 });
  const numIn = spring({ frame: frame - 18, fps, config: { damping: 14, stiffness: 180 }, durationInFrames: 26 });

  // Subtle zoom (Ken Burns) on screenshot
  const zoom = 1 + frame * 0.0009;

  return (
    <AbsoluteFill>
      <ReelsBG tint={tint} tintOpacity={0.16} />

      {/* Top: Eyebrow + headline */}
      <div style={{
        position: "absolute", top: 100, left: 60, right: 60,
        opacity: headIn,
        transform: `translateY(${(1 - headIn) * 30}px)`,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{
          display: "inline-flex", alignSelf: "flex-start",
          padding: "8px 20px", borderRadius: 999,
          background: `${tint}33`, color: tint,
          fontSize: 24, fontWeight: 800, letterSpacing: "0.16em",
          border: `1px solid ${tint}66`,
        }}>
          {icon} · {eyebrow}
        </div>
        <div style={{
          fontSize: 82, fontWeight: 900, color: "#fff",
          letterSpacing: "-0.04em", lineHeight: 1,
          textShadow: "0 4px 40px rgba(0,0,0,0.85)",
        }}>
          {headline}
        </div>
      </div>

      {/* Middle: Mobile phone mockup */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: `translate(-50%, -54%) scale(${zoom})`,
        width: 620, height: 1280,
        borderRadius: 72,
        background: "linear-gradient(160deg, #3A3A3C, #1C1C1E 50%, #2A2A2C)",
        padding: 20,
        boxShadow: `0 60px 140px rgba(0,0,0,0.75), 0 0 80px ${tint}55, inset 0 1px 0 rgba(255,255,255,0.1)`,
      }}>
        <div style={{
          position: "absolute", top: 34, left: "50%", transform: "translateX(-50%)",
          width: 160, height: 50, borderRadius: 25, backgroundColor: "#000", zIndex: 10,
        }} />
        <div style={{
          position: "absolute", inset: 20, borderRadius: 56, overflow: "hidden",
        }}>
          <img
            src={`/screenshots/${shot}`}
            alt={eyebrow}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(180deg, transparent 60%, ${tint}18 100%)`,
          }} />
        </div>
      </div>

      {/* Bottom: Big number + badge */}
      <div style={{
        position: "absolute", left: 60, right: 60, bottom: 180,
        opacity: numIn,
        transform: `translateY(${(1 - numIn) * 40}px)`,
        display: "flex", flexDirection: "column", gap: 18,
      }}>
        <div style={{
          fontSize: 108, fontWeight: 900, letterSpacing: "-0.05em",
          color: bigNumberColor, lineHeight: 1,
          textShadow: `0 0 50px ${bigNumberColor}99, 0 8px 50px rgba(0,0,0,0.85)`,
        }}>
          {bigNumber}
        </div>
        <div style={{
          display: "inline-flex", alignSelf: "flex-start",
          padding: "14px 30px", borderRadius: 999,
          background: `linear-gradient(135deg, ${tint}44, rgba(15,17,23,0.8))`,
          color: "#fff",
          fontSize: 30, fontWeight: 700,
          border: `1.5px solid ${tint}88`,
          boxShadow: `0 0 30px ${tint}33`,
        }}>
          {badge}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Scene 6: AI Assistant × Hindi
// ──────────────────────────────────────────────────
const ReelsAIScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const TYPING_START = 20;
  const RESPONSE_START = 60;

  return (
    <AbsoluteFill>
      <ReelsBG tint={COLORS.AI_ACCENT} tintOpacity={0.22} />
      {/* Top label */}
      <div style={{
        position: "absolute", top: 100, left: 60, right: 60,
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{
          alignSelf: "flex-start",
          padding: "10px 24px", borderRadius: 999,
          background: `${COLORS.AI_ACCENT}33`, color: COLORS.AI_ACCENT,
          fontSize: 26, fontWeight: 800, letterSpacing: "0.1em",
          border: `1px solid ${COLORS.AI_ACCENT}66`,
        }}>
          🤖 AI ASSISTANT
        </div>
        <div style={{
          fontSize: 72, fontWeight: 900, color: "#fff",
          letterSpacing: "-0.04em", lineHeight: 1.05,
          textShadow: "0 4px 40px rgba(0,0,0,0.85)",
        }}>
          HINDI MEIN<br />BOLIYE ✨
        </div>
      </div>
      {/* Chat window mid-section */}
      <div style={{
        position: "absolute", left: 40, right: 40, top: 360,
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        {/* User bubble */}
        <div style={{ alignSelf: "flex-end", maxWidth: "86%" }}>
          <div style={{
            padding: "24px 28px", borderRadius: "32px 32px 8px 32px",
            background: `linear-gradient(135deg, ${COLORS.PRIMARY}, #1D4ED8)`,
            color: "#fff", fontSize: 30, fontWeight: 600, lineHeight: 1.3,
            boxShadow: `0 16px 40px ${COLORS.PRIMARY}55`,
          }}>
            "Mere top 5 clients ka sales report banao"
          </div>
        </div>
        {/* AI typing → response */}
        {frame >= TYPING_START && frame < RESPONSE_START && (
          <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 14,
            padding: "20px 26px", borderRadius: "32px 32px 32px 8px",
            background: `${COLORS.AI_ACCENT}22`, border: `1px solid ${COLORS.AI_ACCENT}44`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `linear-gradient(135deg, ${COLORS.AI_ACCENT}, #4C1D95)`,
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 900,
            }}>✦</div>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: "50%",
                background: COLORS.AI_ACCENT,
                transform: `translateY(${Math.sin((frame + i * 8) / 3.5) * -8}px)`,
                boxShadow: `0 0 12px ${COLORS.AI_ACCENT}88`,
              }} />
            ))}
          </div>
        )}
        {frame >= RESPONSE_START && (
          <div style={{
            alignSelf: "flex-start", maxWidth: "94%",
            borderRadius: 32,
            background: `linear-gradient(180deg, ${COLORS.AI_ACCENT}26, rgba(15,17,23,0.96))`,
            border: `1.5px solid ${COLORS.AI_ACCENT}55`,
            padding: 22,
            boxShadow: `0 24px 70px rgba(0,0,0,0.6), 0 0 60px ${COLORS.AI_ACCENT}33`,
          }}>
            <div style={{
              color: COLORS.AI_ACCENT, fontSize: 24, fontWeight: 800, letterSpacing: "0.05em",
              marginBottom: 14, display: "flex", alignItems: "center", gap: 10,
            }}>
              ✦ AI Generated · 2.1s
            </div>
            <div style={{
              color: "#fff", fontSize: 34, fontWeight: 800, marginBottom: 16,
            }}>
              Top 5 Clients Report
            </div>
            {/* Fake bar chart mini */}
            <div style={{ height: 140, display: "flex", alignItems: "flex-end", gap: 12 }}>
              {[84, 62, 48, 31, 23].map((v, i) => {
                const colors = [COLORS.PRIMARY, COLORS.SUCCESS, COLORS.WARNING, COLORS.AI_ACCENT, "#EC4899"];
                const lf = Math.max(0, frame - RESPONSE_START - i * 4);
                const p = Math.min(1, lf / 16);
                const h = v * 1.2 * (1 - Math.pow(1 - p, 3));
                return (
                  <div key={i} style={{ flex: 1, height: "100%", position: "relative" }}>
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0, height: h,
                      borderRadius: "10px 10px 4px 4px",
                      background: `linear-gradient(180deg, ${colors[i]}, ${colors[i]}aa)`,
                      boxShadow: `0 0 16px ${colors[i]}77`,
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {/* Bottom tagline */}
      <div style={{
        position: "absolute", left: 60, right: 60, bottom: 150,
      }}>
        <div style={{
          fontSize: 56, fontWeight: 800, color: "#fff",
          lineHeight: 1.05, letterSpacing: "-0.03em",
          textShadow: "0 4px 30px rgba(0,0,0,0.9)",
        }}>
          Report taiyaar hai
          <span style={{ color: COLORS.AI_ACCENT }}> 2s mein ⚡</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Scene 7: 4 Languages fast-flip
// ──────────────────────────────────────────────────
const LANGS = [
  { tag: "EN", label: "English", flag: "🇬🇧", color: "#fff", shot: SHOTS.DASHBOARD_MOBILE },
  { tag: "हिं", label: "Hindi", flag: "🇮🇳", color: "#FF9933", shot: SHOTS.CHALLANS_HI },
  { tag: "ગુ", label: "Gujarati", flag: "🇮🇳", color: "#fff", shot: SHOTS.CLIENTS_SAMPLE_375 },
  { tag: "मर", label: "Marathi", flag: "🇮🇳", color: "#F1D41E", shot: SHOTS.VERIFY_390 },
];
const ReelsLanguagesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Flip every 0.75s (22.5 frames)
  const perLang = fps * 0.75;
  const idx = Math.min(LANGS.length - 1, Math.floor(frame / perLang));
  const flip = LANGS[idx];
  const local = frame - idx * perLang;

  // Flip animation
  const flipY = local < 8 ? (8 - local) * 10 * (idx % 2 === 0 ? 1 : -1) : 0;
  const inScale = local < 10 ? 0.92 + (local / 10) * 0.08 : 1;

  return (
    <AbsoluteFill>
      <ReelsBG tint={COLORS.PRIMARY} tintOpacity={0.14} />
      {/* Eyebrow */}
      <div style={{
        position: "absolute", top: 100, left: 0, right: 0,
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-block",
          padding: "10px 28px", borderRadius: 999,
          background: `${COLORS.PRIMARY}33`, color: COLORS.PRIMARY,
          fontSize: 26, fontWeight: 800, letterSpacing: "0.16em",
          border: `1px solid ${COLORS.PRIMARY}66`,
        }}>
          🇮🇳 4 BHASHAEN
        </div>
        <div style={{
          marginTop: 18,
          fontSize: 80, fontWeight: 900, color: "#fff",
          letterSpacing: "-0.04em", lineHeight: 1,
          textShadow: "0 4px 40px rgba(0,0,0,0.85)",
        }}>
          APNA DESH ·<br />APNI BHASHA
        </div>
      </div>
      {/* Fast flip device */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: `translate(-50%, -50%) scale(${inScale}) rotateY(${flipY}deg)`,
        width: 560, height: 1160,
        borderRadius: 68,
        background: "linear-gradient(160deg, #3A3A3C, #1C1C1E 50%, #2A2A2C)",
        padding: 18,
        boxShadow: `0 50px 120px rgba(0,0,0,0.75), 0 0 70px ${flip.color}44`,
      }}>
        <div style={{
          position: "absolute", top: 30, left: "50%", transform: "translateX(-50%)",
          width: 150, height: 46, borderRadius: 23, backgroundColor: "#000", zIndex: 10,
        }} />
        <div style={{
          position: "absolute", inset: 18, borderRadius: 52, overflow: "hidden",
        }}>
          <img
            src={`/screenshots/${flip.shot}`}
            alt={flip.label}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(180deg, transparent 55%, rgba(15,17,23,0.4) 100%)`,
          }} />
        </div>
      </div>
      {/* Bottom language chip */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 180,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 18,
          padding: "18px 38px", borderRadius: 999,
          background: `linear-gradient(135deg, ${flip.color}33, rgba(15,17,23,0.9))`,
          border: `2px solid ${flip.color}88`,
          boxShadow: `0 0 36px ${flip.color}44`,
        }}>
          <span style={{ fontSize: 40 }}>{flip.flag}</span>
          <span style={{ fontSize: 44, fontWeight: 900, color: flip.color }}>{flip.tag}</span>
          <span style={{ width: 2, height: 40, background: "rgba(255,255,255,0.2)" }} />
          <span style={{ fontSize: 38, fontWeight: 800, color: "#fff" }}>{flip.label}</span>
        </div>
        {/* Lang chips row */}
        <div style={{ display: "flex", gap: 12 }}>
          {LANGS.map((L, i) => (
            <div key={i} style={{
              width: i === idx ? 60 : 14, height: 14,
              borderRadius: 999,
              background: i === idx ? COLORS.PRIMARY : "rgba(255,255,255,0.2)",
              transition: "none",
              boxShadow: i === idx ? `0 0 16px ${COLORS.PRIMARY}` : "none",
            }} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Scene 8: Tally Sync + Payments (split top/bottom)
// ──────────────────────────────────────────────────
const ReelsTallyPayScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ flexDirection: "column", display: "flex" }}>
      {/* Top half — Tally Sync */}
      <div style={{
        flex: 1, position: "relative", overflow: "hidden",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <ReelsBG tint={COLORS.PRIMARY} tintOpacity={0.14} />
        <div style={{
          position: "absolute", inset: 40, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 22, fontWeight: 800, color: COLORS.PRIMARY,
              letterSpacing: "0.12em", marginBottom: 10,
            }}>⇌ TALLY SYNC</div>
            <div style={{
              fontSize: 54, fontWeight: 900, color: "#fff", lineHeight: 1,
              textShadow: "0 4px 20px rgba(0,0,0,0.8)",
              letterSpacing: "-0.03em",
            }}>Ek Click<br />Mein ✅</div>
            <div style={{
              marginTop: 10, fontSize: 24, color: COLORS.TEXT_MUTED, fontWeight: 600,
            }}>24 vouchers · synced</div>
          </div>
          {/* Arrow flow */}
          <div style={{
            fontSize: 72, color: COLORS.PRIMARY,
            filter: `drop-shadow(0 0 12px ${COLORS.PRIMARY})`,
            transform: `translateX(${Math.sin(frame / 6) * 6}px)`,
          }}>⟹</div>
          <div style={{
            padding: "22px 26px", borderRadius: 20,
            background: "rgba(15,17,23,0.8)", border: `1.5px solid ${COLORS.PRIMARY}55`,
            boxShadow: `0 0 30px ${COLORS.PRIMARY}33`,
            fontFamily: "monospace", fontSize: 22, color: COLORS.TEXT_WHITE, fontWeight: 700,
          }}>
            <div style={{ color: COLORS.WARNING, fontSize: 18, marginBottom: 8 }}>⬢ Tally ERP 9</div>
            <div>#SV-1245 Sales</div>
            <div>#PV-8834 Purch.</div>
            <div>#PV-2211 Pymt.</div>
          </div>
        </div>
      </div>
      {/* Bottom half — Payments */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <ReelsBG tint={COLORS.SUCCESS} tintOpacity={0.14} />
        <div style={{
          position: "absolute", inset: 40, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
        }}>
          <div style={{
            width: 170, height: 170, borderRadius: "50%",
            background: `radial-gradient(circle, ${COLORS.SUCCESS}, ${COLORS.SUCCESS}aa 70%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 100, color: "#fff",
            boxShadow: `0 0 70px ${COLORS.SUCCESS}99, inset 0 0 0 6px rgba(255,255,255,0.12)`,
          }}>✓</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 22, fontWeight: 800, color: COLORS.SUCCESS,
              letterSpacing: "0.12em", marginBottom: 10,
            }}>💰 PAYMENT REC</div>
            <div style={{
              fontSize: 72, fontWeight: 900, color: COLORS.SUCCESS, lineHeight: 1,
              letterSpacing: "-0.04em",
              textShadow: `0 0 40px ${COLORS.SUCCESS}88, 0 4px 20px rgba(0,0,0,0.8)`,
            }}>₹3,12,800</div>
            <div style={{
              marginTop: 6, fontSize: 26, color: COLORS.TEXT_MUTED, fontWeight: 600,
            }}>Reliable Mfg Co · UPI ✓</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────
// Scene 9: CTA Final Hold (6 seconds)
// ──────────────────────────────────────────────────
const ReelsCTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 14, stiffness: 90, mass: 0.9 }, durationInFrames: 40 });
  const ctaIn = spring({ frame: frame - 40, fps, config: { damping: 16, stiffness: 100, mass: 0.8 }, durationInFrames: 40 });
  const urlT = Math.max(0, Math.min(1, (frame - 80) / 60));
  const URL = "indmanager.in";
  const urlShown = Math.floor(URL.length * urlT);

  // CTA bounce arrow
  const arrowBounce = Math.sin(frame / 8) * 8;

  return (
    <AbsoluteFill>
      <ReelsBG tint={COLORS.PRIMARY} tintOpacity={0.26} showNoise />
      {/* Ascending particles */}
      <ParticleDrift />

      <div style={{
        position: "absolute", inset: 60,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "space-between",
        padding: "120px 0 140px 0",
      }}>
        {/* Top: Logo + Tagline */}
        <div style={{
          opacity: logoIn,
          transform: `translateY(${(1 - logoIn) * 60}px) scale(${0.92 + logoIn * 0.12})`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 26,
        }}>
          <svg width={220} height={220} viewBox="0 0 200 200" fill="none"
            style={{ filter: `drop-shadow(0 0 70px ${COLORS.PRIMARY})` }}>
            <circle cx="100" cy="100" r="90" stroke={COLORS.PRIMARY} strokeWidth="5" fill="none" />
            <path
              d="M55 140 L55 100 L75 80 L95 100 L95 75 L115 55 L135 75 L135 100 L155 100 L155 140 Z M72 140 L72 118 M92 140 L92 118 M112 140 L112 118 M132 140 L132 118 M105 82 L115 82 L115 92 L105 92 Z"
              fill="#fff" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round"
            />
          </svg>
          <div style={{
            fontSize: 100, fontWeight: 900, letterSpacing: "-0.05em", color: "#fff",
            textShadow: `0 0 60px ${COLORS.PRIMARY}aa, 0 10px 60px rgba(0,0,0,0.85)`,
          }}>
            IND<span style={{ color: COLORS.PRIMARY }}> MANAGER</span>
          </div>
          <div style={{
            width: 160, height: 4, borderRadius: 2,
            background: COLORS.PRIMARY,
            boxShadow: `0 0 24px ${COLORS.PRIMARY}`,
          }} />
          <div style={{
            fontSize: 36, fontWeight: 500, color: COLORS.TEXT_SOFT,
            textAlign: "center", lineHeight: 1.4, maxWidth: 880,
          }}>
            Indian Manufacturing Ka<br />Complete OS
          </div>
        </div>

        {/* Center: CTA Button */}
        <div style={{
          opacity: ctaIn,
          transform: `translateY(${(1 - ctaIn) * 50}px) scale(${0.94 + ctaIn * 0.1})`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 22,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 20,
            padding: "32px 60px",
            borderRadius: 999,
            background: `linear-gradient(135deg, ${COLORS.PRIMARY}, ${COLORS.PRIMARY}dd 50%, ${COLORS.PRIMARY})`,
            color: "#fff",
            fontSize: 52, fontWeight: 800, letterSpacing: "-0.01em",
            border: `2px solid ${COLORS.PRIMARY}`,
            boxShadow: `0 20px 60px ${COLORS.PRIMARY}66, 0 0 80px ${COLORS.PRIMARY}55, inset 0 1px 0 rgba(255,255,255,0.2)`,
          }}>
            <span style={{
              fontSize: 58,
              transform: `translateY(${arrowBounce}px)`,
              display: "inline-block",
            }}>⬇️</span>
            <span>FREE ME TRY KARIYE</span>
          </div>
          <div style={{
            padding: "14px 36px",
            borderRadius: 14,
            background: "rgba(15,17,23,0.6)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 100, height: 100, borderRadius: 16,
              background:
                "conic-gradient(from 0deg, #fff 0 25%, rgba(255,255,255,0.7) 25% 50%, #fff 50% 75%, rgba(255,255,255,0.7) 75%)",
              padding: 4, position: "relative",
            }}>
              <div style={{
                position: "absolute", inset: 4, borderRadius: 12,
                background: "#0F1117",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 28, fontWeight: 900, fontFamily: "monospace",
              }}>QR</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ color: COLORS.TEXT_WHITE, fontSize: 28, fontWeight: 800 }}>
                Scan ya niche click karein
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: COLORS.PRIMARY, fontSize: 28, fontWeight: 700,
                letterSpacing: "0.03em",
                textShadow: `0 0 18px ${COLORS.PRIMARY}88`,
              }}>
                {URL.slice(0, urlShown)}
                <span style={{ opacity: frame % 30 < 15 ? 1 : 0, marginLeft: 2 }}>▍</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Store badges mockup */}
        <div style={{
          display: "flex", gap: 24,
          opacity: Math.min(1, (frame - 120) / 30),
          transform: `translateY(${Math.max(0, (120 - frame) / 2)}px)`,
        }}>
          {[
            ["🍎", "App Store", "Download on the"],
            ["▶", "Google Play", "GET IT ON"],
          ].map((b, i) => (
            <div key={i} style={{
              padding: "18px 28px",
              borderRadius: 18,
              background: "rgba(0,0,0,0.6)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", gap: 14,
              minWidth: 280,
            }}>
              <span style={{ fontSize: 48 }}>{b[0]}</span>
              <div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 18, fontWeight: 600 }}>{b[2]}</div>
                <div style={{ color: "#fff", fontSize: 26, fontWeight: 800 }}>{b[1]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Simple particle drift (ascending) for CTA scene
const ParticleDrift: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 28 }).map((_, i) => {
        const rand = mulberry(i + 13);
        const x = rand() * 1080;
        const baseY = rand() * 1920;
        const speed = 1.2 + rand() * 2.6;
        const y = ((baseY - frame * speed) % 2200 + 2200) % 2200 - 200;
        const size = 1 + rand() * 3;
        const purple = rand() < 0.35;
        const op = y < 200 ? y / 200 : y > 1700 ? (1920 - y) / 220 : 0.75;
        return (
          <div key={i} style={{
            position: "absolute", left: x, top: y,
            width: size, height: size, borderRadius: "50%",
            background: purple ? COLORS.AI_ACCENT : "#fff",
            opacity: op,
            boxShadow: `0 0 ${size * 4}px ${purple ? COLORS.AI_ACCENT : "#fff"}44`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// Deterministic RNG
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default ReelsCut;
