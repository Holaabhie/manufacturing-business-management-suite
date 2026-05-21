/**
 * MobileSheet — Enterprise-grade adaptive overlay
 *
 * Standard wrapper for ALL mobile overlays:
 *   - bottom sheets, mobile forms, action sheets
 *   - floating edit cards, create/edit dialogs
 *
 * Viewport behavior:
 *   < 1024px  → bottom sheet (slides from bottom, drag-to-dismiss)
 *   ≥ 1024px  → centered modal (scale+fade)
 *
 * Animation: duration 0.25s, ease [0.4, 0, 0.2, 1]
 *   NO spring, NO bounce, NO elastic
 *
 * Scroll architecture (mobile):
 *   outer motion.div  → flex column, NO overflow:hidden
 *     handle pill     → drag-to-dismiss gesture target (shrink-0)
 *     content div     → flex-1, min-h-0, overflow-y-auto, overscroll-contain
 *
 * @example
 * <MobileSheet open={open} onClose={() => setOpen(false)}>
 *   <h2>Title</h2>
 *   <p>Content here</p>
 * </MobileSheet>
 */
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { Z } from '@/lib/z-index';
import * as FocusScope from '@radix-ui/react-focus-scope';

// ─── Constants ────────────────────────────────────────────────

const EASE = [0.4, 0, 0.2, 1] as const;
const DURATION = 0.25;
const DRAG_DISMISS_THRESHOLD = 120;
const DESKTOP_BREAKPOINT = 1024;

// ─── Animation variants ──────────────────────────────────────

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const bottomSheetVariants = {
  hidden: { y: '100%' },
  visible: { y: 0 },
  exit: { y: '100%' },
};

const centeredModalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 24 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 24 },
};

// ─── Hook: viewport detection ────────────────────────────────

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    setIsDesktop(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}

// ─── Public API ──────────────────────────────────────────────

export interface MobileSheetProps {
  /** Controls visibility */
  open: boolean;
  /** Called when sheet should close (backdrop tap, drag down, ESC) */
  onClose: () => void;
  children: React.ReactNode;
  /** Max height of sheet (mobile). Default: '88dvh' */
  maxHeight?: string;
  /** Max width on desktop centered modal. Default: '480px' */
  maxWidth?: string;
  /** Z-index override. Default: Z.MODAL (1000) */
  zIndex?: number;
  /** Extra className on the sheet container */
  className?: string;
  /** Show drag handle pill. Default: true */
  showHandle?: boolean;
  /** Enable drag-down-to-close (mobile only). Default: true */
  dragToClose?: boolean;
  /** Threshold in px to trigger close on drag. Default: 120 */
  dragThreshold?: number;
  /** Scroll callback — receives scrollTop from the scroll container via scrollRef */
  onSheetScroll?: (scrollTop: number) => void;
}

export function MobileSheet({
  open,
  onClose,
  children,
  maxHeight = '88dvh',
  maxWidth = '480px',
  zIndex = Z.MODAL,
  className = '',
  showHandle = true,
  dragToClose = true,
  dragThreshold = DRAG_DISMISS_THRESHOLD,
  onSheetScroll,
}: MobileSheetProps) {
  const [mounted, setMounted] = useState(false);
  const isDesktop = useIsDesktop();
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Body scroll lock (centralized, reference-counted) ──
  useBodyScrollLock(open);

  // ── ESC key handler ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // ── Drag-to-dismiss handler (mobile only) ──
  // Only fires from the handle area — NOT from content scroll region
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.y > dragThreshold) {
        onClose();
      }
    },
    [dragThreshold, onClose],
  );

  // ── Prevent content touches from triggering sheet drag ──
  // When user touches inside the scrollable content, we must NOT let
  // framer-motion's drag handler on the parent intercept the gesture.
  const handleContentTouchStart = useCallback((e: React.TouchEvent) => {
    // Stop propagation so the parent motion.div doesn't capture this
    // as a drag gesture — allowing native scroll to work
    e.stopPropagation();
  }, []);

  // ── Transition config ──
  const mainTransition = { duration: DURATION, ease: EASE };

  if (!mounted) return null;

  const sheetJSX = (
    <AnimatePresence mode="wait">
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="mobile-sheet-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={mainTransition}
            onPointerDown={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex,
              background: 'var(--overlay-backdrop, rgba(0,0,0,0.5))',
              backdropFilter: 'var(--overlay-backdrop-blur, blur(4px))',
              WebkitBackdropFilter: 'var(--overlay-backdrop-blur, blur(4px))',
            }}
          />

          {/* ── Sheet / Modal container ── */}
          <FocusScope.Root
            asChild
            trapped={open}
            onMountAutoFocus={(e) => {
              // Prevent autofocus from scrolling the page
              e.preventDefault();
              sheetRef.current?.focus({ preventScroll: true });
            }}
          >
            <motion.div
              ref={sheetRef}
              key="mobile-sheet-content"
              className={className}
              variants={isDesktop ? centeredModalVariants : bottomSheetVariants}
              initial="hidden"
              animate={
                isDesktop
                  ? 'visible'
                  : { y: 0, maxHeight }
              }
              exit="exit"
              transition={
                isDesktop
                  ? mainTransition
                  : { ...mainTransition, maxHeight: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } }
              }
              // Prevent inner taps from closing via backdrop
              onPointerDown={(e) => e.stopPropagation()}
              // Focus target for keyboard events
              tabIndex={-1}
              style={
                isDesktop
                  ? {
                      // ── Centered modal (desktop) ──
                      position: 'fixed',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: zIndex + 1,
                      width: `min(${maxWidth}, calc(100vw - 32px))`,
                      maxHeight: 'min(90vh, 700px)',
                      display: 'flex',
                      flexDirection: 'column' as const,
                      background: 'var(--overlay-sheet-bg, #0D1421)',
                      border: '1px solid var(--overlay-border, rgba(255,255,255,0.07))',
                      borderRadius: 24,
                      boxShadow: 'var(--overlay-shadow, 0 24px 48px rgba(0,0,0,0.4))',
                      overflow: 'hidden',
                      outline: 'none',
                    }
                  : {
                      // ── Bottom sheet (mobile/tablet) ──
                      // DO NOT set overflow:hidden here — it prevents
                      // the internal scroll container from working on iOS Safari.
                      position: 'fixed',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      zIndex: zIndex + 1,
                      display: 'flex',
                      flexDirection: 'column' as const,
                      background: 'var(--overlay-sheet-bg, #0D1421)',
                      borderTop: '1px solid var(--overlay-border, rgba(255,255,255,0.07))',
                      borderLeft: '1px solid var(--overlay-border, rgba(255,255,255,0.07))',
                      borderRight: '1px solid var(--overlay-border, rgba(255,255,255,0.07))',
                      borderBottom: 'none',
                      borderRadius: '32px 32px 0 0',
                      boxShadow: 'var(--overlay-shadow, 0 -8px 32px rgba(0,0,0,0.5))',
                      paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
                      outline: 'none',
                    }
              }
            >
              {/* Handle pill (mobile bottom sheet only)
                  This is the ONLY drag-to-dismiss gesture target.
                  Keeping drag on the handle prevents it from intercepting
                  vertical scroll gestures inside the content region. */}
              {!isDesktop && showHandle && (
                <motion.div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    paddingTop: 16,
                    paddingBottom: 8,
                    cursor: dragToClose ? 'grab' : undefined,
                    flexShrink: 0,
                    touchAction: dragToClose ? 'none' : undefined,
                  }}
                  // Drag-to-close on the handle only (mobile)
                  {...(dragToClose
                    ? {
                        drag: 'y' as const,
                        dragConstraints: { top: 0 },
                        dragElastic: 0.1,
                        onDragEnd: handleDragEnd,
                        dragTransition: { bounceStiffness: 0, bounceDamping: 0 },
                      }
                    : {})}
                >
                  <div
                    style={{
                      width: 48,
                      height: 5,
                      borderRadius: 999,
                      background: 'var(--overlay-handle, rgba(255,255,255,0.15))',
                    }}
                  />
                </motion.div>
              )}

              {/* ── Scrollable content region ──
                  This is the ONLY element that scrolls.
                  Key properties for iOS Safari compatibility:
                    - flex: 1 + minHeight: 0  → allows shrinking in flex column
                    - overflowY: 'auto'       → enables vertical scrolling
                    - overscrollBehavior      → prevents scroll chaining to body
                    - WebkitOverflowScrolling → momentum scrolling on iOS
                    - touchAction: 'pan-y'    → tells browser this element scrolls vertically
              */}
              <div
                ref={scrollRef}
                onTouchStart={handleContentTouchStart}
                onScroll={() => {
                  onSheetScroll?.(scrollRef.current?.scrollTop ?? 0);
                }}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                } as React.CSSProperties}
              >
                {children}
              </div>
            </motion.div>
          </FocusScope.Root>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(sheetJSX, document.body);
}
