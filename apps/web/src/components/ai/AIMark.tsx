"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AIMarkProps {
  size?: number;
  thinking?: boolean;
  className?: string;
}

export function AIMark({ size = 28, thinking = false, className }: AIMarkProps) {
  const rawId = useId();
  const gid = `aimark-grad-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <motion.div
      className={cn(
        "inline-flex items-center justify-center shrink-0 select-none",
        className
      )}
      style={{
        width: size,
        height: size,
        filter: "drop-shadow(0 2px 8px rgba(124, 92, 255, 0.35))",
      }}
      animate={
        thinking
          ? {
              scale: [1, 1.06, 1],
              filter: [
                "drop-shadow(0 2px 8px rgba(124, 92, 255, 0.4))",
                "drop-shadow(0 4px 18px rgba(124, 92, 255, 0.75))",
                "drop-shadow(0 2px 8px rgba(124, 92, 255, 0.4))",
              ],
            }
          : undefined
      }
      transition={
        thinking
          ? {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="w-full h-full block"
      >
        <defs>
          <linearGradient
            id={gid}
            x1="4"
            y1="2"
            x2="28"
            y2="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#4F8CFF" />
            <stop offset=".55" stopColor="#7C5CFF" />
            <stop offset="1" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="10" fill={`url(#${gid})`} />
        {/* White four-point sparkle star in the centre */}
        <path
          d="M16 6.5c.7 4.6 2.9 6.8 7.5 7.5-4.6.7-6.8 2.9-7.5 7.5-.7-4.6-2.9-6.8-7.5-7.5 4.6-.7 6.8-2.9 7.5-7.5Z"
          fill="#fff"
        />
        {/* Small secondary sparkle dot at top-right (omitted when size < 24px per spec) */}
        {size >= 24 && (
          <circle cx="24.5" cy="7.5" r="1.8" fill="#fff" fillOpacity=".85" />
        )}
      </svg>
    </motion.div>
  );
}

export default AIMark;
