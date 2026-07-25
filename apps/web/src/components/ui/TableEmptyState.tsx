"use client";

import { PackageOpen, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────

interface TableEmptyStateProps {
  /** Display variant */
  variant: "no-data" | "no-results";
  /** Override default title */
  title?: string;
  /** Override default subtitle */
  subtitle?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

// ─── Defaults ────────────────────────────────────────────

const DEFAULTS = {
  "no-data": {
    title: "No records yet",
    subtitle: "Add your first entry to get started",
    Icon: PackageOpen,
  },
  "no-results": {
    title: "No results found",
    subtitle: "Try adjusting your search or filters",
    Icon: SearchX,
  },
} as const;

// ─── Component ───────────────────────────────────────────

export function TableEmptyState({
  variant,
  title,
  subtitle,
  action,
  className,
}: TableEmptyStateProps) {
  const config = DEFAULTS[variant];
  const Icon = config.Icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 gap-3 text-center",
        className
      )}
    >
      {/* Icon wrapper */}
      <div
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center",
          "bg-[rgba(37,99,235,0.06)] dark:bg-[rgba(37,99,235,0.10)]"
        )}
      >
        <Icon className="h-6 w-6 text-[#2563EB] dark:text-[#3B82F6]" />
      </div>

      {/* Title */}
      <h3 className="text-[17px] font-semibold text-[var(--foreground)] leading-[22px]">
        {title || config.title}
      </h3>

      {/* Subtitle */}
      <p className="text-[13px] text-[var(--muted-foreground)] max-w-xs leading-relaxed">
        {subtitle || config.subtitle}
      </p>

      {/* Optional action button */}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            "mt-2 px-4 py-2 rounded-xl text-[13px] font-semibold",
            "bg-[#2563EB] text-white",
            "hover:bg-[#1D4ED8]",
            "transition-all duration-150",
            "cursor-pointer",
            "shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
