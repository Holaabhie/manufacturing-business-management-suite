"use client";

import { useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────

interface SearchBarProps {
  /** Current search value (controlled) */
  value: string;
  /** Called on every input change */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Accessible label for the input */
  ariaLabel?: string;
  /** Additional CSS classes for the wrapper */
  className?: string;
  /** HTML id for the input element */
  id?: string;
}

// ─── Component ───────────────────────────────────────────

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  ariaLabel = "Search",
  className,
  id,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Ctrl+K / Cmd+K global shortcut ──
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={cn("relative flex-1 w-full sm:max-w-sm", className)}>
      {/* Search icon */}
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-[16px] w-[16px] text-[var(--muted-foreground)] pointer-events-none"
        aria-hidden="true"
      />

      {/* Input */}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          "w-full pl-9 pr-20 sm:pr-16",
          "h-10 sm:h-11",
          "rounded-xl",
          // Light mode
          "bg-[rgba(255,255,255,0.72)] dark:bg-[rgba(15,23,42,0.50)]",
          "border border-[rgba(15,23,42,0.08)] dark:border-[rgba(148,163,184,0.12)]",
          "shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.15)]",
          "text-[15px] text-[var(--foreground)] dark:text-[#E2E8F0]",
          "placeholder:text-[#94A3B8] dark:placeholder:text-[rgba(148,163,184,0.50)]",
          "outline-none",
          // Focus
          "focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]/40",
          "dark:focus:ring-[rgba(96,165,250,0.15)] dark:focus:border-[rgba(96,165,250,0.50)]",
          "transition-all duration-150"
        )}
      />

      {/* Clear button — visible when value exists */}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className={cn(
            "absolute right-10 sm:right-10 top-1/2 -translate-y-1/2",
            "h-6 w-6 rounded-md",
            "flex items-center justify-center",
            "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            "hover:bg-[var(--muted)]",
            "transition-all duration-150",
            "cursor-pointer"
          )}
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Keyboard shortcut badge — hidden on mobile */}
      <kbd
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2",
          "hidden sm:inline-flex",
          "items-center gap-0.5",
          "h-[22px] px-1.5",
          "rounded-md",
          "bg-[var(--muted)] dark:bg-[rgba(255,255,255,0.06)]",
          "border border-[rgba(15,23,42,0.06)] dark:border-[rgba(255,255,255,0.08)]",
          "text-[11px] font-medium text-[var(--muted-foreground)]",
          "select-none pointer-events-none"
        )}
      >
        ⌘K
      </kbd>
    </div>
  );
}
