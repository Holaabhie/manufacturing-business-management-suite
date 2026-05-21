'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  X,
  Layers,
  Clock,
  Loader2,
  Printer,
  CheckCircle2,
  Truck,
  Check,
} from 'lucide-react';
import { MobileSheet } from '@/components/ui/MobileSheet';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────
export interface EditProductionSheetProps {
  open: boolean;
  onClose: () => void;
  productionId: string;
  currentStatus: string;
  currentMaterialSource?: string;
  onSuccess?: () => void;
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

// ─── Status definitions ──────────────────────────────────────────
const statuses = [
  {
    value: 'pending',
    label: 'Pending',
    labelKey: 'pending',
    description: 'Not yet started',
    descKey: 'pendingDesc',
    icon: Clock,
    color: '#F59E0B',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    labelKey: 'in_progress',
    description: 'Currently active',
    descKey: 'in_progressDesc',
    icon: Loader2,
    color: '#3B82F6',
  },
  {
    value: 'printing',
    label: 'Printing',
    labelKey: 'printing',
    description: 'Print in process',
    descKey: 'printingDesc',
    icon: Printer,
    color: '#8B5CF6',
  },
  {
    value: 'completed',
    label: 'Completed',
    labelKey: 'completed',
    description: 'Work finished',
    descKey: 'completedDesc',
    icon: CheckCircle2,
    color: '#22C55E',
  },
  {
    value: 'delivered',
    label: 'Delivered',
    labelKey: 'delivered',
    description: 'Sent to client',
    descKey: 'deliveredDesc',
    icon: Truck,
    color: '#06B6D4',
  },
];

// ─── CSS Variables (light/dark) ──────────────────────────────────
const lightVars: React.CSSProperties = {
  // @ts-expect-error css custom properties
  '--sheet-bg': '#FFFFFF',
  '--card-bg': '#F8FAFC',
  '--border': 'rgba(15,23,42,0.08)',
  '--muted': '#64748B',
  '--text': '#0F172A',
  '--accent': '#2563EB',
  '--success': '#16A34A',
  '--danger': '#DC2626',
  '--input-bg': 'rgba(15,23,42,0.035)',
  '--error-tint': 'rgba(220,38,38,0.06)',
};

const darkVars: React.CSSProperties = {
  // @ts-expect-error css custom properties
  '--sheet-bg': '#0F172A',
  '--card-bg': '#172033',
  '--border': 'rgba(255,255,255,0.06)',
  '--muted': '#94A3B8',
  '--text': '#F8FAFC',
  '--accent': '#3B82F6',
  '--success': '#22C55E',
  '--danger': '#EF4444',
  '--input-bg': 'rgba(255,255,255,0.035)',
  '--error-tint': 'rgba(239,68,68,0.08)',
};

// ─── Component ───────────────────────────────────────────────────
export function EditProductionSheet({
  open,
  onClose,
  productionId,
  currentStatus,
  currentMaterialSource = 'own_material',
  onSuccess,
}: EditProductionSheetProps) {
  const t = useTranslations('productionSheet');

  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [material, setMaterial] = useState(currentMaterialSource);
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detect dark mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setSelectedStatus(currentStatus);
      setMaterial(currentMaterialSource);
      setButtonState('idle');
    }
  }, [open, currentStatus, currentMaterialSource]);

  // Keyboard avoidance via visualViewport API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const handler = () => {
      const height = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardHeight(Math.max(0, height));
    };

    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
    };
  }, []);

  // ─── Submit handler (wraps existing API) ─────────────────────
  const handleSubmit = useCallback(async () => {
    if (buttonState === 'loading' || buttonState === 'success') return;

    setButtonState('loading');
    try {
      const res = await fetch(`/api/production/${productionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_progress',
          status: selectedStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setButtonState('error');
        setTimeout(() => setButtonState('idle'), 2000);
        return;
      }

      setButtonState('success');
      onSuccess?.();
      setTimeout(() => {
        onClose();
        // Reset after close animation
        setTimeout(() => setButtonState('idle'), 300);
      }, 1500);
    } catch {
      setButtonState('error');
      setTimeout(() => setButtonState('idle'), 2000);
    }
  }, [buttonState, productionId, selectedStatus, onSuccess, onClose]);

  const cssVars = isDark ? darkVars : lightVars;
  const materialOptions = ['own_material', 'client_material'] as const;
  const activeSegmentIndex = materialOptions.indexOf(
    material as (typeof materialOptions)[number],
  );

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      maxHeight="92dvh"
      maxWidth="720px"
      showHandle={false}
      dragToClose={true}
    >
      {/* Root wrapper — flex column, takes 100% of MobileSheet's scroll region */}
      <div
        className="flex flex-col w-full md:max-w-[720px] md:mx-auto"
        style={{
          ...cssVars,
          background: 'var(--sheet-bg)',
          minHeight: '100%',
        }}
      >
        {/* ═══ 1. Drag Handle ═══ */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: 'var(--border)' }}
          />
        </div>

        {/* ═══ 2. Header ═══ */}
        <div
          className="flex-shrink-0 flex items-start justify-between px-5 pt-2 pb-4"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'var(--sheet-bg)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Icon container */}
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(37,99,235,0.1)',
                border: '1px solid rgba(37,99,235,0.15)',
              }}
            >
              <Layers
                size={18}
                strokeWidth={1.8}
                style={{ color: 'var(--accent)' }}
              />
            </div>

            <div>
              <h2
                className="text-[18px] font-semibold leading-tight"
                style={{ color: 'var(--text)' }}
              >
                {t('title')}
              </h2>
              <p
                className="text-[13px] mt-0.5"
                style={{ color: 'var(--muted)' }}
              >
                {t('subtitle')}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity active:opacity-60 flex-shrink-0 cursor-pointer"
            style={{ background: 'var(--input-bg)' }}
            onClick={onClose}
            type="button"
          >
            <X
              size={16}
              strokeWidth={2}
              style={{ color: 'var(--muted)' }}
            />
          </button>
        </div>

        {/* ═══ 3. Scrollable Content ═══ */}
        <div
          ref={scrollRef}
          className="flex-1 px-5 py-5 space-y-5"
          style={{
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          {/* ── Section: Production Status ── */}
          <div
            className="rounded-3xl p-[18px] space-y-3"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--muted)' }}
            >
              {t('statusSection')}
            </p>

            {/* Status cards — 2 column grid */}
            <div className="grid grid-cols-2 gap-3">
              {statuses.map((status) => {
                const isSelected = selectedStatus === status.value;
                const StatusIcon = status.icon;

                return (
                  <motion.button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    whileTap={{ scale: 0.96 }}
                    animate={{
                      borderColor: isSelected
                        ? `${status.color}40`
                        : 'var(--border)',
                      backgroundColor: isSelected
                        ? `${status.color}10`
                        : 'var(--card-bg)',
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 24,
                    }}
                    className="relative flex flex-col items-start gap-2 p-4 rounded-2xl border text-left w-full cursor-pointer"
                    type="button"
                  >
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${status.color}15` }}
                    >
                      <StatusIcon
                        size={18}
                        strokeWidth={1.8}
                        style={{ color: status.color }}
                      />
                    </div>

                    <div>
                      <p
                        className="text-[13px] font-semibold"
                        style={{ color: 'var(--text)' }}
                      >
                        {t(`statuses.${status.labelKey}` as any)}
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: 'var(--muted)' }}
                      >
                        {t(`statuses.${status.descKey}` as any)}
                      </p>
                    </div>

                    {/* Selected checkmark */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 20,
                          }}
                          className="absolute top-3 right-3"
                        >
                          <Check
                            size={14}
                            strokeWidth={2.5}
                            style={{ color: status.color }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Section: Material Source ── */}
          <div
            className="rounded-3xl p-[18px] space-y-3"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--muted)' }}
            >
              {t('materialSection')}
            </p>

            {/* Animated segmented control */}
            <LayoutGroup>
              <div
                className="relative flex p-1 rounded-2xl gap-1"
                style={{ background: 'var(--input-bg)' }}
              >
                {/* Sliding background */}
                <motion.div
                  layout
                  className="absolute rounded-xl"
                  style={{
                    background: 'var(--accent)',
                    opacity: 0.15,
                    top: 4,
                    bottom: 4,
                    width: 'calc(50% - 4px)',
                    left: activeSegmentIndex === 0 ? 4 : 'calc(50% + 0px)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 26,
                  }}
                />

                {materialOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setMaterial(option)}
                    className="flex-1 relative z-10 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150 cursor-pointer"
                    style={{
                      color:
                        material === option
                          ? 'var(--accent)'
                          : 'var(--muted)',
                    }}
                    type="button"
                  >
                    {option === 'own_material'
                      ? t('ownMaterial')
                      : t('clientMaterial')}
                  </button>
                ))}
              </div>
            </LayoutGroup>
          </div>
        </div>

        {/* ═══ 4. Fixed Footer ═══ */}
        <div
          className="flex-shrink-0 relative z-20 px-5 pt-4"
          style={{
            background: 'var(--sheet-bg)',
            borderTop: '1px solid var(--border)',
            paddingBottom: `calc(env(safe-area-inset-bottom) + ${keyboardHeight > 0 ? keyboardHeight + 'px' : '16px'})`,
          }}
        >
          <motion.button
            animate={buttonState === 'error' ? 'shake' : 'idle'}
            variants={{
              idle: { x: 0 },
              shake: {
                x: [-8, 8, -6, 6, -4, 4, 0],
                transition: { duration: 0.4 },
              },
            }}
            whileTap={{ scale: buttonState === 'idle' ? 0.98 : 1 }}
            disabled={
              buttonState === 'loading' || buttonState === 'success'
            }
            onClick={handleSubmit}
            className="w-full rounded-[18px] font-semibold text-[16px] text-white flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            style={{
              height: '58px',
              background:
                buttonState === 'success'
                  ? 'linear-gradient(180deg, #16A34A, #15803D)'
                  : buttonState === 'error'
                    ? 'linear-gradient(180deg, #DC2626, #B91C1C)'
                    : 'linear-gradient(180deg, #2563EB, #1D4ED8)',
              boxShadow:
                buttonState === 'success'
                  ? '0 8px 30px rgba(22,163,74,0.3)'
                  : buttonState === 'error'
                    ? '0 8px 30px rgba(220,38,38,0.3)'
                    : '0 8px 30px rgba(37,99,235,0.24)',
              opacity: buttonState === 'loading' ? 0.85 : 1,
            }}
            type="button"
          >
            {buttonState === 'idle' && t('button.idle')}
            {buttonState === 'loading' && (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.8,
                    ease: 'linear',
                  }}
                >
                  <Loader2 size={18} />
                </motion.div>
                {t('button.loading')}
              </>
            )}
            {buttonState === 'success' && (
              <>
                <Check size={18} strokeWidth={2.5} />
                {t('button.success')}
              </>
            )}
            {buttonState === 'error' && t('button.error')}
          </motion.button>
        </div>
      </div>
    </MobileSheet>
  );
}
