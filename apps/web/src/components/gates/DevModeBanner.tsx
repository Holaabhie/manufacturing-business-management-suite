"use client";

/**
 * DevModeBanner — Floating Banner for Development Mode
 * 
 * Only visible when DEV_MODE=true.
 * Shows current role/tier and allows switching for testing.
 * 
 * NEVER visible in production (production safety guard in dev-mode.ts
 * prevents the app from starting if DEV_MODE=true in production).
 */

import { useState } from 'react';
import { isDevMode } from '@/lib/features/dev-mode';
import { usePermissions } from '@/lib/hooks/use-permissions';

export function DevModeBanner() {
  const [isMinimized, setIsMinimized] = useState(false);
  const { role, tier, user } = usePermissions();

  // Only render in dev mode
  if (!isDevMode()) return null;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[9999] flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 transition-colors"
        title="DEV MODE — Click to expand"
      >
        <span className="text-lg">🔧</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/90 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-lg">🔧</span>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-200">
            DEV MODE
          </span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400">
            All feature gates bypassed
          </span>
        </div>

        <div className="h-6 w-px bg-amber-200 dark:bg-amber-700 mx-1" />

        {/* Current role/tier info */}
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 font-mono text-amber-800 dark:text-amber-200">
            {role || 'N/A'}
          </span>
          <span className="rounded bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 font-mono text-amber-800 dark:text-amber-200">
            {tier || 'starter'}
          </span>
        </div>

        {/* Minimize button */}
        <button
          onClick={() => setIsMinimized(true)}
          className="ml-1 rounded p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
          title="Minimize"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
