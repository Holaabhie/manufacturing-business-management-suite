/**
 * Z-index constants — single source of truth for overlay layering
 *
 * Usage:
 *   import { Z } from "@/lib/z-index"
 *   style={{ zIndex: Z.MODAL }}
 */

export const Z = {
  /** Modal backdrop + content */
  MODAL: 1000,
  /** Content above modal backdrop */
  MODAL_CONTENT: 1001,
  /** Popovers, dropdowns, tooltips */
  POPOVER: 1100,
  /** Toast notifications */
  TOAST: 1200,
} as const;
