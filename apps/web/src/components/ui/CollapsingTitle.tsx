"use client";

/**
 * CollapsingTitle
 * ─────────────────────────────────────────────────────────────────
 * iOS-style large page title that scrolls naturally with content on
 * mobile. On desktop (md+), renders as a standard static heading.
 *
 * Accessibility:
 *  - The in-content <h1> is the single stable heading for screen readers.
 *  - The collapsed bar title in the layout header is aria-hidden.
 *  - prefers-reduced-motion is handled by useCollapseProgress (snaps
 *    progress to 0 or 1 at the midpoint).
 *
 * Subtitle loading guard:
 *  - When subtitle is undefined/null, the subtitle line still reserves
 *    its height (min-h) to prevent layout shift. A subtle skeleton
 *    placeholder is shown while data loads.
 */

import { cn } from "@/lib/utils";

interface CollapsingTitleProps {
  /** The page title (renders as <h1>) */
  title: string;
  /** Contextual subtitle (e.g., "24 active · 3 ready for dispatch") */
  subtitle?: string | null;
  /** True when subtitle data is still loading — shows skeleton */
  subtitleLoading?: boolean;
  /** Right-side action buttons (export, add new, etc.) */
  actions?: React.ReactNode;
  /** Collapse progress 0→1 from useCollapseProgress (mobile fade) */
  collapseProgress?: number;
  /** Optional extra className on the wrapper */
  className?: string;
}

export function CollapsingTitle({
  title,
  subtitle,
  subtitleLoading = false,
  actions,
  collapseProgress = 0,
  className,
}: CollapsingTitleProps) {
  // On mobile, fade out as user scrolls (driven by progress 0→1).
  // On desktop (md+), always fully visible — CSS handles this via
  // md:opacity-100 and md:translate-y-0 overrides.
  const mobileOpacity = 1 - collapseProgress;
  const mobileTranslateY = collapseProgress * -8; // shift up 8px max

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-w-0",
        className
      )}
      style={{
        // Mobile: driven by scroll progress. Desktop: overridden by CSS below.
        opacity: mobileOpacity,
        transform: `translateY(${mobileTranslateY}px)`,
        // Prevent jank: keep in flow even when invisible (no display:none)
        willChange: collapseProgress > 0 && collapseProgress < 1 ? "opacity, transform" : "auto",
      }}
    >
      <div
        // On desktop (md+), force full opacity and no transform regardless of progress
        className="md:!opacity-100 md:!translate-y-0 min-w-0 flex-1"
        style={{
          // These inline styles apply to mobile; the md: classes override on desktop
        }}
      >
        <h1 className="text-[24px] sm:text-[28px] md:text-[34px] font-bold text-[var(--foreground)] leading-[1.2] md:leading-[41px] tracking-[0.37px] truncate">
          {title}
        </h1>

        {/* Subtitle area — always reserves line height to prevent layout shift */}
        <div className="min-h-[20px] mt-1">
          {subtitleLoading ? (
            // Skeleton placeholder while data loads
            <div className="h-[14px] w-[180px] rounded-[4px] bg-[var(--muted)] animate-pulse mt-[3px]" />
          ) : subtitle ? (
            <p className="text-[15px] text-[var(--muted-foreground)] leading-[20px] break-words">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {/* Action buttons (right side on sm+) */}
      {actions && (
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
