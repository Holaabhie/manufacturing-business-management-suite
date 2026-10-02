import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import type { CursorProps, HighlightBoxProps } from "../types";

/**
 * Animated cursor with click ripple effect — matches Apple UI interaction style
 */
export const CursorClick: React.FC<CursorProps> = ({
  x, y, clickAt, color = COLORS.PRIMARY,
}) => {
  const frame = useCurrentFrame();

  const clicked = clickAt !== undefined && frame >= clickAt;
  const clickFrame = clicked ? frame - (clickAt ?? 0) : 0;
  const activeRipple = clicked && clickFrame < 20;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: "translate(-2px, -4px)",
          filter: activeRipple ? `drop-shadow(0 0 8px ${color})` : "none",
        }}
      >
        {/* Mac-style arrow cursor (pure SVG/CSS) */}
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M4 2 L4 22 L10.5 15.5 L16 26 L19.5 24.5 L14 14 L22 14 Z"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {/* Click ripple — 3 expanding rings */}
      {activeRipple && (
        <RippleRing x={x + 4} y={y + 10} color={color} delayFrame={0} clickFrame={clickFrame} />
      )}
      {activeRipple && clickFrame > 2 && (
        <RippleRing x={x + 4} y={y + 10} color={color} delayFrame={2} clickFrame={clickFrame} opacity={0.55} />
      )}
      {activeRipple && clickFrame > 5 && (
        <RippleRing x={x + 4} y={y + 10} color={color} delayFrame={5} clickFrame={clickFrame} opacity={0.3} />
      )}
    </AbsoluteFill>
  );
};

const RippleRing: React.FC<{
  x: number; y: number; color: string; delayFrame: number; clickFrame: number; opacity?: number;
}> = ({ x, y, color, delayFrame, clickFrame, opacity = 0.8 }) => {
  const t = Math.min(1, (clickFrame - delayFrame) / 18);
  if (t < 0) return null;
  const size = interpolate(t, [0, 1], [8, 140]);
  const op = interpolate(t, [0, 1], [opacity, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2.5px solid ${color}`,
        opacity: op,
        pointerEvents: "none",
        boxShadow: `0 0 20px ${color}44`,
      }}
    />
  );
};

/**
 * Independent highlight glow box — can apply to any element (not just device screens)
 */
export const HighlightBox: React.FC<HighlightBoxProps> = ({
  frame: propFrame, fps: propFps, x, y, w, h, color = COLORS.PRIMARY, delay = 0, pulse = true,
}) => {
  const hookFrame = useCurrentFrame();
  const { fps: hookFps } = useVideoConfig();
  const frame = propFrame ?? hookFrame;
  const fps = propFps ?? hookFps;
  const localFrame = Math.max(0, frame - delay);
  const t = pulse
    ? 0.6 + Math.sin((localFrame / (fps * 0.7)) * Math.PI * 2) * 0.4
    : Math.min(1, localFrame / 15);
  const ring = 2 + t * 3;
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${w}%`,
        height: `${h}%`,
        border: `${ring}px solid ${color}`,
        borderRadius: 12,
        boxShadow: `0 0 ${30 + t * 25}px ${color}99, inset 0 0 ${20 + t * 10}px ${color}22`,
        pointerEvents: "none",
        transform: `scale(${1 + t * 0.008})`,
        opacity: Math.min(1, localFrame / 10),
      }}
    />
  );
};

export default CursorClick;
