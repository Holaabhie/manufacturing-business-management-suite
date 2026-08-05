/**
 * useCollapseProgress
 * ─────────────────────────────────────────────────────────────────
 * Returns a 0→1 progress value driven by scroll position, designed
 * for the iOS large-title-collapsing pattern.
 *
 * - At scrollY ≤ rangeStart → progress = 0 (title fully expanded)
 * - At scrollY ≥ rangeEnd   → progress = 1 (title fully collapsed)
 * - Between                 → linear interpolation
 *
 * Both the large title fade-out and the bar title fade-in should be
 * driven by this single progress source, avoiding the hard-pop of
 * two independent boolean thresholds.
 *
 * Respects prefers-reduced-motion: when active, progress snaps
 * instantly (0 or 1) at the midpoint instead of animating.
 *
 * Accepts an optional scrollRef for cases where the scroll container
 * is not `window`. If omitted, uses `window.scrollY`.
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface UseCollapseProgressOptions {
  /** Top of the collapse range in px (default: 20) */
  rangeStart?: number;
  /** Bottom of the collapse range in px (default: 70) */
  rangeEnd?: number;
  /** Optional ref to a scrollable container. Uses window if omitted. */
  scrollRef?: React.RefObject<HTMLElement | null>;
}

interface CollapseProgressResult {
  /** 0→1 progress value (0 = fully expanded, 1 = fully collapsed) */
  progress: number;
  /** True when progress > 0 (useful for conditional rendering) */
  isCollapsing: boolean;
  /** True when progress === 1 (title fully hidden) */
  isCollapsed: boolean;
  /** True when scroll position > 10px (for top-bar background/border) */
  scrolled: boolean;
}

export function useCollapseProgress(
  options: UseCollapseProgressOptions = {}
): CollapseProgressResult {
  const { rangeStart = 20, rangeEnd = 70, scrollRef } = options;
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const rafRef = useRef<number>(0);
  const prefersReducedMotion = useRef(false);

  // Check reduced motion preference once on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      prefersReducedMotion.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }
  }, []);

  const handleScroll = useCallback(() => {
    // Cancel any pending rAF to avoid stale updates
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const scrollY = scrollRef?.current
        ? scrollRef.current.scrollTop
        : window.scrollY;

      // Scrolled state for top-bar background
      setScrolled(scrollY > 10);

      // Compute progress
      let raw: number;
      if (scrollY <= rangeStart) {
        raw = 0;
      } else if (scrollY >= rangeEnd) {
        raw = 1;
      } else {
        raw = (scrollY - rangeStart) / (rangeEnd - rangeStart);
      }

      // Snap for reduced-motion users
      if (prefersReducedMotion.current) {
        raw = raw >= 0.5 ? 1 : 0;
      }

      setProgress(raw);
    });
  }, [rangeStart, rangeEnd, scrollRef]);

  useEffect(() => {
    const target = scrollRef?.current ?? window;
    target.addEventListener("scroll", handleScroll, { passive: true });

    // Run once on mount to pick up initial scroll position
    handleScroll();

    return () => {
      target.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll, scrollRef]);

  return {
    progress,
    isCollapsing: progress > 0,
    isCollapsed: progress === 1,
    scrolled,
  };
}
