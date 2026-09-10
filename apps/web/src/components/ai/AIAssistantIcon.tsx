import type { SVGProps } from "react";

interface AIAssistantIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  useGradient?: boolean;
}

/**
 * AIAssistantIcon — Futuristic geometric AI avatar mark.
 * Features a faceted central neural-core with precision orbiting nodes and circuitry links.
 * Uses the app's standard #8B5CF6 to #3B82F6 gradient stops. Fully static (no unauthorized animations).
 */
export function AIAssistantIcon({
  size = 20,
  useGradient = false,
  className,
  ...props
}: AIAssistantIconProps) {
  const gradientId = "ai-mark-gradient";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>

      {/* Outer orbital geometric ring */}
      <ellipse
        cx="12"
        cy="12"
        rx="9.5"
        ry="4.5"
        transform="rotate(-28 12 12)"
        stroke={useGradient ? `url(#${gradientId})` : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="16 3 8 3"
        opacity={0.85}
      />

      {/* Counter-orbital geometric ring */}
      <ellipse
        cx="12"
        cy="12"
        rx="9.5"
        ry="4.5"
        transform="rotate(32 12 12)"
        stroke={useGradient ? `url(#${gradientId})` : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="20 4 6 4"
        opacity={0.7}
      />

      {/* Central faceted neural node (diamond prism) */}
      <polygon
        points="12,4 17.5,9.5 12,15 6.5,9.5"
        fill={useGradient ? `url(#${gradientId})` : "currentColor"}
        fillOpacity={useGradient ? 0.35 : 0.25}
        stroke={useGradient ? `url(#${gradientId})` : "currentColor"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Internal core spark node */}
      <circle
        cx="12"
        cy="12"
        r="2"
        fill={useGradient ? `url(#${gradientId})` : "currentColor"}
      />

      {/* Orbital peripheral spark nodes */}
      <circle
        cx="4"
        cy="8.5"
        r="1.25"
        fill={useGradient ? `url(#${gradientId})` : "currentColor"}
      />
      <circle
        cx="20"
        cy="15.5"
        r="1.25"
        fill={useGradient ? `url(#${gradientId})` : "currentColor"}
      />
      <circle
        cx="18.5"
        cy="7"
        r="1"
        fill={useGradient ? `url(#${gradientId})` : "currentColor"}
        opacity={0.9}
      />
      <circle
        cx="5.5"
        cy="17"
        r="1"
        fill={useGradient ? `url(#${gradientId})` : "currentColor"}
        opacity={0.9}
      />
    </svg>
  );
}

export default AIAssistantIcon;
