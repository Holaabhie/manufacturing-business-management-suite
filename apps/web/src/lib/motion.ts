/**
 * Motion Token System — IND Manager
 * ─────────────────────────────────────────────────────────────────
 *
 * SOURCE OF TRUTH for all animation in the app.
 * Phase 2 foundation. Components migrate to these tokens in Phase 3/4.
 *
 * ──────────────────────────────────────────────────────────────────
 *  TIER A — Fast (default, everything except Tier B)
 * ──────────────────────────────────────────────────────────────────
 *  Duration : 150–200ms
 *  Enter    : cubic-bezier(0.16, 1, 0.3, 1)  — fast decelerate
 *  Exit     : cubic-bezier(0.7, 0, 0.84, 0)  — fast accelerate out
 *  Applies  : buttons, cards, table/list rows, hover elevation,
 *             form focus rings, sidebar collapse/expand,
 *             route transitions, stagger lists (delay 0.05s),
 *             press feedback (scale 0.97–0.98, ~100ms),
 *             hold/long-press fill.
 *  RULE     : NO type: "spring". NO bounce. NO elastic.
 *
 * ──────────────────────────────────────────────────────────────────
 *  TIER B — Spring (Modals & Drawers ONLY)
 * ──────────────────────────────────────────────────────────────────
 *  Physics  : { type: "spring", stiffness: 300, damping: 25 }
 *  Applies  : Dialog/Modal, MobileSheet, bottom sheets, vaul Drawer.
 *  RULE     : Do NOT use Tier B outside of confirmed Tier B surfaces.
 *             Sidebar is NOT Tier B (CSS-only on mobile via Radix Sheet).
 *             Command Palette stays on CSS keyframes — do not wrap.
 *
 * ──────────────────────────────────────────────────────────────────
 *  MIGRATION NOTE — src/styles/animations.ts
 * ──────────────────────────────────────────────────────────────────
 *  animations.ts sheetSlideUp  →  damping: 30  (WRONG — Tier B is 25)
 *  This file's variantsSheetSlideUp uses the correct damping: 25.
 *  Replace all drawer/modal usages of the old token in Phase 4.
 *  Do NOT mass-delete animations.ts — retire entries component-by-component
 *  as Phase 3/4 migrations land.
 */

import { useReducedMotion } from 'framer-motion';
import type { Transition, Variants } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════
//  TIER A — RAW EASING CURVES
// ═══════════════════════════════════════════════════════════════════

/**
 * Tier A enter easing — fast decelerate (iOS-style quick settle).
 * Use inside any inline `transition` object for entering elements.
 */
export const EASE_ENTER = [0.16, 1, 0.3, 1] as const;

/**
 * Tier A exit easing — fast accelerate out.
 * Use inside any inline `transition` object for exiting elements.
 */
export const EASE_EXIT = [0.7, 0, 0.84, 0] as const;

// ═══════════════════════════════════════════════════════════════════
//  TIER A — TRANSITION PRIMITIVES
// ═══════════════════════════════════════════════════════════════════

/**
 * Standard Tier A enter transition (180ms).
 * Use for most element enters: cards, rows, panels, badges.
 */
export const transitionEnter: Transition = {
  duration: 0.18,
  ease: EASE_ENTER,
};

/**
 * Standard Tier A exit transition (150ms).
 * Exits are always slightly faster than enters — feels snappy, not laggy.
 */
export const transitionExit: Transition = {
  duration: 0.15,
  ease: EASE_EXIT,
};

/**
 * Press feedback transition (~100ms).
 * Used for button/card/row tap scale — fast enough to feel immediate.
 */
export const transitionPress: Transition = {
  duration: 0.1,
  ease: EASE_EXIT,
};

/**
 * Sidebar collapse/expand transition (200ms).
 * Slightly longer to match the larger visual displacement (width + opacity).
 */
export const transitionSidebar: Transition = {
  duration: 0.2,
  ease: EASE_ENTER,
};

// ═══════════════════════════════════════════════════════════════════
//  TIER B — SPRING PRIMITIVE  (MODALS & DRAWERS ONLY)
// ═══════════════════════════════════════════════════════════════════

/**
 * Tier B spring — the ONLY spring config in this app.
 * Stiffness: 300 / Damping: 25.
 *
 * ⚠ DO NOT use for Tier A surfaces (buttons, cards, rows, sidebar).
 * ⚠ Only valid on: Dialog/Modal, MobileSheet, bottom sheets, vaul Drawer.
 */
export const springModal: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

// ═══════════════════════════════════════════════════════════════════
//  TIER A — VARIANT SETS
// ═══════════════════════════════════════════════════════════════════

/**
 * Simple opacity fade — generic show/hide.
 * Tier A. For tooltips, badges, status pills, non-spatial elements.
 *
 * @example
 *   <motion.div variants={variantsFade} initial="hidden" animate="visible" exit="exit" />
 */
export const variantsFade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitionEnter,
  },
  exit: {
    opacity: 0,
    transition: transitionExit,
  },
};

/**
 * Fade + subtle lift — cards, page content wrappers, panel sections.
 * Tier A. 8px Y on enter. No Y on exit (exits feel cleaner without float).
 *
 * @example
 *   <motion.div variants={variantsFadeUp} initial="hidden" animate="visible" exit="exit" />
 */
export const variantsFadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionEnter,
  },
  exit: {
    opacity: 0,
    transition: transitionExit,
  },
};

/**
 * Fade + scale — dropdowns, popovers, context menus, floating panels.
 * Tier A. 0.96 scale feels native without bounce.
 *
 * @example
 *   <motion.div variants={variantsFadeScale} initial="hidden" animate="visible" exit="exit" />
 */
export const variantsFadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitionEnter,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: transitionExit,
  },
};

/**
 * Stagger container — parent wrapper for list/table row staggered entrance.
 * Tier A. Children stagger at 0.05s intervals. NO spring on children.
 *
 * Pair with variantsStaggerItem on each child element.
 *
 * @example
 *   <motion.ul variants={variantsStaggerContainer} initial="hidden" animate="visible">
 *     {items.map(item => (
 *       <motion.li key={item.id} variants={variantsStaggerItem}>{item.name}</motion.li>
 *     ))}
 *   </motion.ul>
 */
export const variantsStaggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
};

/**
 * Stagger item — individual row or card within a staggered list.
 * Tier A. 6px Y displacement. Inherits parent stagger timing automatically.
 * Do NOT add spring or bounce here.
 */
export const variantsStaggerItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionEnter,
  },
};

/**
 * Sidebar text label — width + opacity collapse.
 * Tier A. Used when sidebar collapses from expanded to icon-only mode.
 *
 * @example
 *   <AnimatePresence>
 *     {!isCollapsed && (
 *       <motion.span variants={variantsSidebarLabel} initial="hidden" animate="visible" exit="exit">
 *         {label}
 *       </motion.span>
 *     )}
 *   </AnimatePresence>
 */
export const variantsSidebarLabel: Variants = {
  hidden: { opacity: 0, width: 0 },
  visible: {
    opacity: 1,
    width: 'auto',
    transition: transitionSidebar,
  },
  exit: {
    opacity: 0,
    width: 0,
    transition: { duration: 0.15, ease: EASE_EXIT },
  },
};

/**
 * Sidebar nav group accordion — height-based expand/collapse.
 * Tier A. The animated element MUST have `overflow: hidden` applied.
 *
 * @example
 *   <AnimatePresence initial={false}>
 *     {isExpanded && (
 *       <motion.div variants={variantsSidebarGroup} initial="hidden" animate="visible" exit="exit"
 *         className="overflow-hidden">
 *         {children}
 *       </motion.div>
 *     )}
 *   </AnimatePresence>
 */
export const variantsSidebarGroup: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: transitionSidebar,
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: transitionExit,
  },
};

/**
 * Route / page transition — wraps the main content area in AnimatePresence.
 * Tier A. Full-pathname key (every route change animates, including list↔detail).
 *
 * Enter : 6px Y lift + opacity (matches variantsStaggerItem — feels native).
 * Exit  : opacity-only (no Y) — avoids fighting EnterpriseDataTable stagger rows.
 *
 * Used by: src/components/ui/PageTransition.tsx
 * AnimatePresence must use mode="wait" to prevent double-mount of pages that
 * use manual useEffect(fetch, []) (users/, settings/team/), and to ensure
 * Suspense fallbacks appear after the exit, not during it.
 *
 * @example
 *   <AnimatePresence mode="wait">
 *     <motion.div key={pathname} variants={variantsPageTransition}
 *       initial="hidden" animate="visible" exit="exit" />
 *   </AnimatePresence>
 */
export const variantsPageTransition: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionEnter,   // 180ms ease-enter
  },
  exit: {
    opacity: 0,
    // ⚠ No y on exit — keeps exit clean and prevents visual conflict with
    //   stagger animations still running inside the exiting page.
    transition: transitionExit,    // 150ms ease-exit
  },
};

// ═══════════════════════════════════════════════════════════════════
//  TIER A — PRESS & HOVER FEEDBACK PROPS
// ═══════════════════════════════════════════════════════════════════

/**
 * Button press scale — use as the `whileTap` prop on motion.button.
 * Tier A. scale(0.97) at 100ms, no spring.
 *
 * @example
 *   <motion.button whileTap={pressFeedbackButton}>Click me</motion.button>
 *
 * Note: The existing Button component (ui/button.tsx) uses `active:scale-[0.98]`
 * via CSS. Use this only when you need Framer gesture context
 * (e.g., combined with drag or layout animation on the same element).
 */
export const pressFeedbackButton = {
  scale: 0.97,
  transition: transitionPress,
} as const;

/**
 * Card / row press scale — `whileTap` for list items and cards.
 * Tier A. scale(0.98) — less aggressive than button to match larger targets.
 *
 * @example
 *   <motion.div whileTap={pressFeedbackCard}>...</motion.div>
 */
export const pressFeedbackCard = {
  scale: 0.98,
  transition: transitionPress,
} as const;

/**
 * Card hover elevation — `whileHover` for interactive cards.
 * Tier A. -2px Y lift. Use only when CSS hover is insufficient
 * (e.g., inside a Framer drag context or layout group).
 *
 * Prefer CSS `hover:-translate-y-px` (already in card.tsx) for static cards.
 *
 * @example
 *   <motion.div whileHover={hoverElevation}>...</motion.div>
 */
export const hoverElevation = {
  y: -2,
  transition: transitionEnter,
} as const;

// ═══════════════════════════════════════════════════════════════════
//  TIER B — VARIANT SETS  (MODALS & DRAWERS ONLY)
// ═══════════════════════════════════════════════════════════════════

/**
 * Centered modal scale-fade — desktop Dialog / centered MobileSheet.
 * Tier B spring. Both enter and exit are spring-driven.
 * 96% scale + 8px Y displacement on hidden state.
 *
 * @example
 *   <AnimatePresence>
 *     {open && (
 *       <motion.div variants={variantsModalScale} initial="hidden" animate="visible" exit="exit">
 *         {children}
 *       </motion.div>
 *     )}
 *   </AnimatePresence>
 */
export const variantsModalScale: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springModal,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: springModal,
  },
};

/**
 * Mobile bottom sheet slide-up — MobileSheet in phone viewport, vaul Drawer.
 * Tier B spring. Y-translate from 100% → 0 on enter, reverse on exit.
 *
 * ⚠ REPLACES animations.ts sheetSlideUp in Phase 4.
 *   Old config had damping: 30. This uses the correct Tier B damping: 25.
 *
 * @example
 *   <motion.div variants={variantsSheetSlideUp} initial="hidden" animate="visible" exit="exit">
 *     {children}
 *   </motion.div>
 */
export const variantsSheetSlideUp: Variants = {
  hidden: { y: '100%' },
  visible: {
    y: 0,
    transition: springModal,
  },
  exit: {
    y: '100%',
    transition: springModal,
  },
};

/**
 * Overlay backdrop — dim scrim behind modals and drawers.
 * Tier A (fast fade — the spring lives on the content layer, not the scrim).
 * Background color must be set via CSS / style prop on the element.
 *
 * @example
 *   <motion.div
 *     variants={variantsBackdrop}
 *     initial="hidden" animate="visible" exit="exit"
 *     onPointerDown={onClose}   // ← iOS Safari fix: use onPointerDown, not onClick
 *     style={{ position: 'fixed', inset: 0 }}
 *   />
 */
export const variantsBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.18, ease: EASE_ENTER },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: EASE_EXIT },
  },
};

// ═══════════════════════════════════════════════════════════════════
//  REDUCED MOTION — REACT HOOKS
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns a Framer Motion transition that collapses to instant (0ms)
 * when the user's OS has enabled "Reduce Motion".
 *
 * This is the JS counterpart to the CSS @media rule in globals.css.
 * That rule kills CSS transitions but has NO effect on Framer Motion's
 * JS-driven animations — this hook fills that gap.
 *
 * Must be called inside a React component or custom hook.
 *
 * @param base  The normal Transition to use when motion is allowed.
 * @returns     The base transition, or an instant { duration: 0 } version.
 *
 * @example
 *   function MyComponent() {
 *     const t = useMotionTransition(transitionEnter);
 *     return <motion.div transition={t} animate={{ opacity: 1 }} />;
 *   }
 */
export function useMotionTransition(base: Transition): Transition {
  const shouldReduce = useReducedMotion();
  if (!shouldReduce) return base;
  return { duration: 0, ease: 'linear' };
}

/**
 * Returns a Variants set collapsed to instant opacity-only transitions
 * when the user prefers reduced motion.
 *
 * Preserves the variant key names (hidden / visible / exit) so
 * AnimatePresence continues to work without structural changes.
 *
 * Must be called inside a React component or custom hook.
 *
 * @param base  The normal Variants to use when motion is allowed.
 * @returns     The base variants, or an instant fade-only version.
 *
 * @example
 *   function MyList() {
 *     const variants = useMotionVariants(variantsFadeUp);
 *     return (
 *       <motion.div variants={variants} initial="hidden" animate="visible" exit="exit">
 *         {children}
 *       </motion.div>
 *     );
 *   }
 */
export function useMotionVariants(base: Variants): Variants {
  const shouldReduce = useReducedMotion();
  if (!shouldReduce) return base;
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0 } },
    exit: { opacity: 0, transition: { duration: 0 } },
  };
}

// ─────────────────────────────────────────────────────────────────
//  QUICK-REFERENCE EXPORT MAP
// ─────────────────────────────────────────────────────────────────
//
//  Tier A — easing constants (inline use):
//    EASE_ENTER, EASE_EXIT
//
//  Tier A — transition primitives:
//    transitionEnter   (180ms)
//    transitionExit    (150ms)
//    transitionPress   (100ms)
//    transitionSidebar (200ms)
//
//  Tier A — variant sets:
//    variantsFade          simple opacity
//    variantsFadeUp        fade + 8px Y lift
//    variantsFadeScale     fade + scale(0.96)
//    variantsStaggerContainer  list wrapper
//    variantsStaggerItem       list child
//    variantsSidebarLabel  width+opacity collapse
//    variantsSidebarGroup  height accordion
//    variantsPageTransition    route transition (full-pathname key, mode="wait")
//
//  Tier A — whileTap / whileHover props:
//    pressFeedbackButton   scale(0.97)
//    pressFeedbackCard     scale(0.98)
//    hoverElevation        y(-2)
//
//  Tier B — spring primitive (Modals & Drawers ONLY):
//    springModal           { type:'spring', stiffness:300, damping:25 }
//
//  Tier B — variant sets:
//    variantsModalScale    centered dialog
//    variantsSheetSlideUp  mobile bottom sheet / drawer
//    variantsBackdrop      overlay scrim (Tier A fade)
//
//  Reduced motion hooks (use inside React components):
//    useMotionTransition(base)
//    useMotionVariants(base)
