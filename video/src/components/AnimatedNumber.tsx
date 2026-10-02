import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CUBIC } from "../constants";

interface AnimatedNumberProps {
  from: number;
  to: number;
  startFrame?: number;
  durationFrames?: number;
  prefix?: string;
  suffix?: string;
  format?: "INR" | "number" | "percent";
  locale?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  fontFamily?: string;
  letterSpacing?: string;
  style?: React.CSSProperties;
  decimalPlaces?: number;
}

/**
 * Count-up KPI number animation with Indian system formatting (lakh/crore)
 * — uses cubic-bezier(0.22, 1, 0.36, 1) per brief
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  from,
  to,
  startFrame = 0,
  durationFrames = 60,
  prefix = "",
  suffix = "",
  format = "number",
  locale = "en-IN",
  fontSize = 64,
  fontWeight = 800,
  color = "#F1F5F9",
  fontFamily = "'Inter', sans-serif",
  letterSpacing = "-0.02em",
  style = {},
  decimalPlaces = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, Math.min(frame - startFrame, durationFrames));
  const progress = interpolate(localFrame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => {
      // Cubic bezier approximation: 0.22, 1, 0.36, 1
      // Use power curve: easeOutExpo-ish that matches the brief
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    },
  });

  const currentValue = from + (to - from) * progress;

  const formatted = formatNumber(currentValue, format, locale, decimalPlaces);

  return (
    <span
      style={{
        fontFamily,
        fontSize,
        fontWeight,
        color,
        letterSpacing,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        display: "inline-block",
        ...style,
      }}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

function formatNumber(n: number, format: string, locale: string, decimals: number) {
  if (format === "INR") {
    const v = Math.round(n);
    const sign = v < 0 ? "-" : "";
    const abs = Math.abs(v).toString();
    // Indian grouping: last 3, then pairs
    let result = "";
    let i = abs.length;
    let first = true;
    while (i > 0) {
      if (first) {
        result = abs.substring(Math.max(0, i - 3), i) + result;
        i -= 3;
        first = false;
      } else {
        result = abs.substring(Math.max(0, i - 2), i) + (result ? "," + result : "");
        i -= 2;
      }
    }
    return sign + "₹" + result;
  }
  if (format === "percent") {
    return n.toFixed(decimals) + "%";
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export default AnimatedNumber;
