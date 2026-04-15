"use client";

/**
 * PlanBadge — Visual indicator of user's current plan
 * 
 * Usage:
 * ```tsx
 * <PlanBadge tier="starter" />
 * <PlanBadge tier="pro" />
 * <PlanBadge role="Admin" />
 * ```
 */

interface PlanBadgeProps {
  /** Subscription tier */
  tier?: 'starter' | 'pro';
  /** User role (overrides tier display if Admin) */
  role?: 'Admin' | 'Staff' | string | null;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

export function PlanBadge({
  tier = 'starter',
  role,
  size = 'sm',
  className = '',
}: PlanBadgeProps) {
  // Admin always shows Admin badge regardless of tier
  if (role === 'Admin') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-semibold
          bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700
          dark:from-rose-900/30 dark:to-pink-900/30 dark:text-rose-400
          border border-rose-200 dark:border-rose-800
          ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
          ${className}`}
      >
        <span>🛡️</span>
        Admin
      </span>
    );
  }

  if (tier === 'pro') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-semibold
          bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-700
          dark:from-violet-900/30 dark:to-indigo-900/30 dark:text-violet-400
          border border-violet-200 dark:border-violet-800
          ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
          ${className}`}
      >
        <span>✨</span>
        Pro
      </span>
    );
  }

  // Free / Starter
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold
        bg-gray-100 text-gray-600
        dark:bg-gray-800 dark:text-gray-400
        border border-gray-200 dark:border-gray-700
        ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
        ${className}`}
    >
      Free
    </span>
  );
}
