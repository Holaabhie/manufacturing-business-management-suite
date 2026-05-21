/**
 * useBodyScrollLock — Reference-counted body scroll lock
 *
 * Prevents background scrolling when any overlay is open.
 * Supports nested overlays via a module-level counter:
 *   Modal A opens  → count 1 → lock
 *   Modal B opens  → count 2 → stay locked
 *   Modal B closes → count 1 → stay locked
 *   Modal A closes → count 0 → restore
 *
 * iOS Safari fix:
 *   Uses `position: fixed` + `top: -scrollY` pattern because
 *   `overflow: hidden` on body does NOT prevent scrolling on iOS Safari.
 *   This also prevents the "rubber band" bounce effect.
 *
 * - SSR safe: all DOM mutations guarded by `typeof window`
 * - StrictMode safe: uses ref to prevent double increment
 * - Compensates scrollbar width to prevent layout shift
 */

import { useEffect, useRef } from "react";

// ─── Module scope — shared across all hook instances ──────
let activeScrollLocks = 0;
let savedScrollY = 0;
let savedStyles: {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  paddingRight: string;
} | null = null;

function lock() {
  if (typeof window === "undefined") return;

  if (activeScrollLocks === 0) {
    // Preserve current scroll position and styles before first lock
    savedScrollY = window.scrollY;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    savedStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      paddingRight: document.body.style.paddingRight,
    };

    // Lock the body — position:fixed prevents scrolling on ALL browsers
    // including iOS Safari where overflow:hidden doesn't work
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  activeScrollLocks++;
}

function unlock() {
  if (typeof window === "undefined") return;

  activeScrollLocks = Math.max(0, activeScrollLocks - 1);

  if (activeScrollLocks === 0 && savedStyles) {
    // Restore all saved styles
    document.body.style.overflow = savedStyles.overflow;
    document.body.style.position = savedStyles.position;
    document.body.style.top = savedStyles.top;
    document.body.style.left = savedStyles.left;
    document.body.style.right = savedStyles.right;
    document.body.style.paddingRight = savedStyles.paddingRight;
    savedStyles = null;

    // Restore scroll position — critical step after removing position:fixed
    window.scrollTo(0, savedScrollY);
  }
}

/**
 * Lock body scroll while `active` is true.
 * Call unconditionally — never after an early return.
 */
export function useBodyScrollLock(active: boolean): void {
  const lockedRef = useRef(false);

  useEffect(() => {
    if (active && !lockedRef.current) {
      lockedRef.current = true;
      lock();
    } else if (!active && lockedRef.current) {
      lockedRef.current = false;
      unlock();
    }

    return () => {
      if (lockedRef.current) {
        lockedRef.current = false;
        unlock();
      }
    };
  }, [active]);
}
