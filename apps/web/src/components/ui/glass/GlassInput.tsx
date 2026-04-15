"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GlassInput — Translucent input field matching the glassmorphism design system.
 * Focus state glows blue with a soft halo. Hover brightens the border.
 */
export interface GlassInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Left-side icon or prefix element */
  leftIcon?: React.ReactNode;
  /** Right-side suffix/unit text */
  suffix?: string;
  /** Error state */
  error?: boolean;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, leftIcon, suffix, error, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 z-10 pointer-events-none text-white/40">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            // Base
            "w-full h-[44px] rounded-[12px] px-3 text-[15px] font-medium",
            "transition-all duration-200",
            // Light
            "bg-black/[0.04] border border-black/[0.12] text-gray-900 placeholder:text-gray-400",
            "focus:outline-none focus:bg-transparent focus:border-[#007AFF] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.2)]",
            // Dark
            "dark:bg-white/[0.05] dark:border-white/10 dark:text-white/90 dark:placeholder:text-white/30",
            "dark:focus:bg-white/[0.08] dark:focus:border-[#0A84FF] dark:focus:shadow-[0_0_0_3px_rgba(10,132,255,0.25),0_0_20px_rgba(10,132,255,0.15)]",
            "dark:hover:not(:focus):border-white/[0.18] dark:hover:not(:focus):bg-white/[0.07]",
            // Error
            error && "border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(255,59,48,0.25)] dark:border-red-400",
            // Icon padding
            leftIcon && "pl-9",
            suffix && "pr-12",
            className
          )}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 text-[13px] font-semibold text-white/40 pointer-events-none select-none">
            {suffix}
          </div>
        )}
      </div>
    );
  }
);
GlassInput.displayName = "GlassInput";
