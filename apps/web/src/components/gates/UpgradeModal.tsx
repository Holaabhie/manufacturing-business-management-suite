"use client";

/**
 * UpgradeModal — Full-Screen Modal with Plan Comparison
 * 
 * Displays side-by-side comparison of Free vs Pro plans.
 * Triggers Razorpay checkout when a plan is selected.
 * 
 * Usage:
 * ```tsx
 * <UpgradeModal isOpen={isOpen} onClose={() => setOpen(false)} />
 * ```
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PLANS, formatPrice, getYearlySavings, type PlanId } from '@/lib/razorpay/plans';
import { useUpgrade } from '@/hooks/useUpgrade';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Where the upgrade was triggered (for analytics) */
  source?: string;
  /** Callback after successful upgrade */
  onSuccess?: () => void;
}

export function UpgradeModal({
  isOpen,
  onClose,
  source,
  onSuccess,
}: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro_yearly');
  const { openCheckout, isProcessing, error, clearError } = useUpgrade();
  const [mounted, setMounted] = useState(false);

  // Ensure we only portal after client mount
  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleUpgrade = async () => {
    clearError();
    await openCheckout(selectedPlan);
    if (!error) {
      onSuccess?.();
    }
  };

  const yearlySavings = getYearlySavings();
  const monthlyEquivalent = PLANS.pro_yearly.price / 12;

  const modalJSX = (
    <>
      {/* ── Backdrop overlay ── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.70)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      {/* ── Modal container ── */}
      <div
        className="glass-modal upgrade-modal-container"
        style={{
          position: 'fixed',
          zIndex: 1001,
          background: 'linear-gradient(160deg, rgba(14, 22, 44, 0.97) 0%, rgba(8, 16, 36, 0.99) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          fontFamily: 'var(--font-glass)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Close button — always visible, never scrolls */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 transition-colors flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--g-text-primary)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,80,80,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable content area */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* Header */}
          <div
            className="px-8 py-8 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(99,210,255,0.15), rgba(0,100,220,0.12))',
              borderBottom: '1px solid var(--glass-border)',
              borderRadius: '20px 20px 0 0',
            }}
          >
            <h2 className="text-2xl font-bold" style={{ color: 'var(--g-text-primary)', fontFamily: 'var(--font-glass)' }}>
              🚀 Upgrade to Pro
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
              Unlock all features and supercharge your business
            </p>
          </div>

          {/* Plan Cards */}
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Monthly Plan */}
              <button
                onClick={() => setSelectedPlan('pro_monthly')}
                className="relative p-5 text-left transition-all"
                style={{
                  background: selectedPlan === 'pro_monthly'
                    ? 'rgba(99,210,255,0.10)'
                    : 'var(--glass-surface)',
                  border: selectedPlan === 'pro_monthly'
                    ? '2px solid rgba(99,210,255,0.5)'
                    : '1px solid var(--glass-border)',
                  borderRadius: 'var(--glass-radius-card)',
                }}
              >
                <div className="text-sm font-medium" style={{ color: 'var(--g-text-secondary)' }}>
                  Monthly
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold" style={{ color: 'var(--g-text-primary)', fontFamily: 'var(--font-glass-mono)' }}>
                    {formatPrice(PLANS.pro_monthly.price)}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--g-text-secondary)' }}>/mo</span>
                </div>
                <div className="mt-1 text-xs" style={{ color: 'var(--g-text-secondary)' }}>
                  Billed monthly
                </div>
                {selectedPlan === 'pro_monthly' && (
                  <div className="absolute right-3 top-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: 'var(--g-accent-blue)' }}>
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>

              {/* Yearly Plan */}
              <button
                onClick={() => setSelectedPlan('pro_yearly')}
                className="relative p-5 text-left transition-all"
                style={{
                  background: selectedPlan === 'pro_yearly'
                    ? 'rgba(99,210,255,0.10)'
                    : 'var(--glass-surface)',
                  border: selectedPlan === 'pro_yearly'
                    ? '2px solid rgba(99,210,255,0.5)'
                    : '1px solid var(--glass-border)',
                  borderRadius: 'var(--glass-radius-card)',
                }}
              >
                {/* Popular badge */}
                <div className="absolute -top-2.5 right-3">
                  <span className="rounded-full px-3 py-0.5 text-[10px] font-bold text-white shadow-sm"
                    style={{ background: 'linear-gradient(135deg, rgba(255,200,80,0.9), rgba(255,140,0,0.9))' }}>
                    ⭐ POPULAR
                  </span>
                </div>

                <div className="text-sm font-medium" style={{ color: 'var(--g-text-secondary)' }}>
                  Yearly
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold" style={{ color: 'var(--g-text-primary)', fontFamily: 'var(--font-glass-mono)' }}>
                    {formatPrice(monthlyEquivalent)}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--g-text-secondary)' }}>/mo</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--g-text-secondary)' }}>
                    Billed as {formatPrice(PLANS.pro_yearly.price)}/yr
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: 'rgba(48,209,88,0.15)', color: 'rgba(48,209,88,0.9)' }}>
                    Save {formatPrice(yearlySavings)}
                  </span>
                </div>
                {selectedPlan === 'pro_yearly' && (
                  <div className="absolute right-3 top-6">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: 'var(--g-accent-blue)' }}>
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            </div>

            {/* Pro Features List */}
            <div className="glass-section p-5 mb-6"
              style={{
                background: 'var(--glass-surface)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--glass-radius-card)',
              }}
            >
              <h3 className="glass-label mb-3">
                Everything in Pro includes:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PLANS.pro_monthly.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
                    <span style={{ color: 'rgba(48,209,88,0.9)' }} className="text-xs">✓</span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="glass-warning mb-4 px-4 py-3"
                style={{
                  background: 'rgba(255,80,80,0.08)',
                  border: '1px solid rgba(255,80,80,0.25)',
                  borderRadius: 'var(--glass-radius-card)',
                }}
              >
                <p className="text-sm" style={{ color: 'rgba(255,100,100,0.85)' }}>{error}</p>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleUpgrade}
              disabled={isProcessing}
              className="glass-btn-primary w-full py-3.5 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                `✨ Upgrade to Pro — ${formatPrice(PLANS[selectedPlan].price)}${
                  selectedPlan === 'pro_yearly' ? '/year' : '/month'
                }`
              )}
            </button>

            <p className="mt-3 text-center text-xs" style={{ color: 'var(--g-text-label)' }}>
              Secure payment via Razorpay • Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* ── Responsive CSS ── */}
      <style>{`
        .upgrade-modal-container {
          /* Mobile: bottom sheet */
          bottom: 0;
          left: 0;
          right: 0;
          max-height: 90vh;
          border-radius: 28px 28px 0 0;
        }
        @media (min-width: 769px) {
          .upgrade-modal-container {
            /* Desktop: centered card */
            top: 50%;
            left: 50%;
            right: auto;
            bottom: auto;
            transform: translate(-50%, -50%);
            border-radius: 20px;
            max-width: 640px;
            width: 90%;
          }
        }
      `}</style>
    </>
  );

  return createPortal(modalJSX, document.body);
}
