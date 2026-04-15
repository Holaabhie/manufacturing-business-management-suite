"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * GlassButton — Gradient blue→cyan button with glow effect.
 * Used as the primary CTA across the glassmorphism design system.
 */
export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeMap = {
  sm: "h-[34px] px-4 text-[13px] rounded-[10px]",
  md: "h-[42px] px-5 text-[15px] rounded-[12px]",
  lg: "h-[50px] px-6 text-[17px] rounded-[14px]",
};

const variantBase = {
  primary: [
    // Light
    "bg-[#007AFF] text-white shadow-[0_4px_16px_rgba(0,122,255,0.4)]",
    "hover:bg-[#0069D9] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,122,255,0.55)]",
    // Dark
    "dark:bg-gradient-to-r dark:from-[#0A84FF] dark:to-[#34D2FF]",
    "dark:shadow-[0_4px_20px_rgba(10,132,255,0.5),0_0_0_1px_rgba(255,255,255,0.1)]",
    "dark:hover:from-[#2496FF] dark:hover:to-[#50DCFF]",
    "dark:hover:shadow-[0_8px_36px_rgba(10,132,255,0.65),0_0_0_1px_rgba(255,255,255,0.15)]",
  ].join(" "),
  secondary: [
    "bg-black/[0.06] text-gray-700 border border-black/[0.12]",
    "hover:bg-black/[0.09]",
    "dark:bg-white/[0.07] dark:text-white/80 dark:border-white/10",
    "dark:hover:bg-white/[0.11] dark:hover:border-white/20",
  ].join(" "),
  ghost: [
    "bg-transparent text-[#007AFF]",
    "hover:bg-[#007AFF]/10",
    "dark:text-[#0A84FF] dark:hover:bg-[#0A84FF]/15",
  ].join(" "),
  danger: [
    "bg-red-500 text-white shadow-[0_4px_16px_rgba(255,59,48,0.35)]",
    "hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,59,48,0.5)]",
    "dark:bg-[#FF453A] dark:shadow-[0_4px_20px_rgba(255,69,58,0.45)]",
    "dark:hover:bg-[#FF6961] dark:hover:shadow-[0_8px_32px_rgba(255,69,58,0.6)]",
  ].join(" "),
};

export function GlassButton({
  children,
  className,
  size = "md",
  variant = "primary",
  isLoading = false,
  icon,
  fullWidth = false,
  disabled,
  ...props
}: GlassButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      disabled={disabled || isLoading}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 font-semibold",
        "transition-all duration-200 cursor-pointer select-none",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
        sizeMap[size],
        variantBase[variant],
        fullWidth && "w-full",
        className
      )}
      {...(props as HTMLMotionProps<"button">)}
    >
      {isLoading ? (
        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
    </motion.button>
  );
}
