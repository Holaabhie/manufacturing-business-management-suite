"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

/**
 * TogglePill — Replaces radio buttons with a premium segmented-control style.
 * Active option gets the gradient-blue glow; inactive is muted glass.
 */
export interface TogglePillOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TogglePillProps {
  options: TogglePillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  showCheckmark?: boolean;
}

export function TogglePill({
  options,
  value,
  onChange,
  className,
  showCheckmark = false,
}: TogglePillProps) {
  return (
    <div
      className={cn(
        // Light
        "flex gap-1.5 p-1 rounded-[14px]",
        "bg-black/[0.04] border border-black/[0.1]",
        // Dark
        "dark:bg-white/[0.05] dark:border-white/[0.08]",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-1.5",
              "px-4 py-2 rounded-[10px] text-[14px] font-medium",
              "transition-all duration-200 cursor-pointer select-none",
              isActive
                ? [
                    // Light active
                    "bg-[#007AFF] text-white shadow-[0_2px_10px_rgba(0,122,255,0.4)]",
                    // Dark active
                    "dark:bg-gradient-to-r dark:from-[#0A84FF] dark:to-[#34D2FF]",
                    "dark:shadow-[0_2px_14px_rgba(10,132,255,0.55),0_0_0_1px_rgba(255,255,255,0.1)]",
                  ]
                : [
                    // Light inactive
                    "text-gray-500 hover:text-gray-700 hover:bg-black/[0.04]",
                    // Dark inactive
                    "dark:text-white/40 dark:hover:text-white/70 dark:hover:bg-white/[0.07]",
                  ]
            )}
          >
            {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            <AnimatePresence>
              {showCheckmark && isActive && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2, type: "spring", stiffness: 400, damping: 20 }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        );
      })}
    </div>
  );
}
