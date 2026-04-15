"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

/**
 * GlassCard — Premium glassmorphism card for the entire design system.
 * Works in both light and dark modes; in dark mode, it becomes a true
 * frosted-glass surface with ambient glow on hover.
 */
export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Extra glow color for the border: "blue" | "purple" | "green" | "none" */
  glow?: "blue" | "purple" | "green" | "none";
  /** Animate in on mount */
  animate?: boolean;
  /** Padding preset – defaults to "default" */
  padding?: "none" | "compact" | "default" | "loose";
  /** Whether to apply the hover lift + glow effect */
  interactive?: boolean;
}

const paddingMap = {
  none: "",
  compact: "p-4",
  default: "p-5",
  loose: "p-6 md:p-8",
};

const glowMap = {
  none: "",
  blue: "dark:hover:shadow-[0_16px_56px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.1),0_0_60px_rgba(10,132,255,0.18)]",
  purple: "dark:hover:shadow-[0_16px_56px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.1),0_0_60px_rgba(191,90,242,0.2)]",
  green: "dark:hover:shadow-[0_16px_56px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.1),0_0_60px_rgba(48,209,88,0.18)]",
};

export function GlassCard({
  children,
  className,
  glow = "blue",
  animate = false,
  padding = "default",
  interactive = false,
  ...props
}: GlassCardProps) {
  const base = cn(
    "rounded-[20px] border transition-all duration-300",
    // Light mode
    "bg-white/95 border-black/[0.12] shadow-[0_4px_24px_rgba(0,0,0,0.08)]",
    // Dark mode glass
    "dark:bg-white/[0.05] dark:border-white/10 dark:shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.07)]",
    "dark:backdrop-blur-[40px]",
    // Hover
    interactive && [
      "cursor-pointer",
      "hover:-translate-y-0.5 hover:scale-[1.005]",
      "hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
      "dark:hover:bg-white/[0.07] dark:hover:border-white/[0.16]",
      glowMap[glow],
    ],
    paddingMap[padding],
    className
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={base}
        {...(props as HTMLMotionProps<"div">)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={base} {...props}>
      {children}
    </div>
  );
}
