'use client';

/**
 * PageTransition
 * ──────────────────────────────────────────────────────────────────
 * Wraps the dashboard page content area in AnimatePresence so that
 * route changes play coordinated exit/enter animations.
 *
 * Key decisions (Phase 5 — approved):
 *
 *  • Key          : full usePathname() — every route change animates,
 *                   including list↔detail (e.g. orders/abc → orders/xyz).
 *                   If this proves noisy in practice, swap to a shallow
 *                   2-segment key later — do not pre-optimise now.
 *
 *  • mode="wait"  : old page exits fully before new page mounts.
 *                   Required to prevent double-mount + double-fetch on
 *                   pages that use manual useEffect(fetch, [])
 *                   (users/, settings/team/), and to prevent Suspense
 *                   fallbacks appearing mid-transition.
 *
 *  • initial      : default (true) — enter animation plays on hard
 *                   refresh / first load as well as subsequent navs.
 *                   Trade-off: check for layout flash on slow networks
 *                   in DevTools throttled mode.
 *
 *  • layout prop  : NOT used on the motion.div — explicit variants only.
 *                   Avoids layout-jank conflict with position/size changes.
 *
 * Variant: variantsPageTransition  (src/lib/motion.ts)
 *   hidden  → opacity: 0, y: 6
 *   visible → opacity: 1, y: 0   (180ms Tier A ease-enter)
 *   exit    → opacity: 0          (150ms Tier A ease-exit, NO y)
 */

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { variantsPageTransition } from '@/lib/motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={variantsPageTransition}
        initial="hidden"
        animate="visible"
        exit="exit"
        // flex column so pages that use flex-1 / min-h-0 internally
        // still fill available height correctly.
        style={{ flex: 1, minHeight: 0, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
