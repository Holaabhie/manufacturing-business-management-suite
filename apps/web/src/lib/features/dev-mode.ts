/**
 * DEV_MODE Override System
 * 
 * When DEV_MODE=true, ALL feature gates and role checks are bypassed.
 * This allows developers to test any feature regardless of subscription tier.
 * 
 * SECURITY: DEV_MODE must NEVER be true in production.
 * A startup guard throws a fatal error if NODE_ENV=production && DEV_MODE=true.
 */

// ─── Production Safety Guard ────────────────────────────────────
// This runs at module import time. If the app is running in production
// (not building) and DEV_MODE is enabled, it will crash immediately.
// We check for NEXT_PHASE to prevent this from running during build.
if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  process.env.DEV_MODE === 'true' &&
  process.env.NEXT_PHASE !== 'phase-production-build'
) {
  throw new Error(
    '🚨 FATAL: DEV_MODE must not be true in production!\n' +
    'Set DEV_MODE=false or remove it from your production environment variables.\n' +
    'The application will not start until this is fixed.'
  );
}

// Track whether we've already logged the dev mode warning (avoid spam)
let hasWarnedDevMode = false;

/**
 * Check if the application is running in dev mode.
 * Works on both server (process.env) and client (NEXT_PUBLIC_ prefix).
 */
export function isDevMode(): boolean {
  // Server-side check
  if (typeof process !== 'undefined' && process.env.DEV_MODE === 'true') {
    return true;
  }

  // Client-side check (NEXT_PUBLIC_ prefix makes it available in browser)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
    return true;
  }

  return false;
}

/**
 * If dev mode is active, returns true and logs a console warning.
 * Use this to bypass feature gates:
 * 
 * ```ts
 * if (allowAllFeatures()) return { allowed: true, reason: 'dev_mode' };
 * ```
 */
export function allowAllFeatures(): boolean {
  if (isDevMode()) {
    if (!hasWarnedDevMode) {
      console.warn('⚠️ DEV_MODE is ON — All feature gates bypassed');
      hasWarnedDevMode = true;
    }
    return true;
  }
  return false;
}
