// ─── Centralized Indian-Locale Formatters ────────────────
// All formatters accept an optional locale and default to "en-IN".
// Locale mapping: en → en-IN, hi → hi-IN, gu → gu-IN, mr → mr-IN

import type { Locale } from "@/lib/i18n";

/**
 * Maps the short app locale code to the full BCP-47 Indian locale string.
 */
export function toIntlLocale(locale?: Locale | string): string {
  const map: Record<string, string> = {
    en: "en-IN",
    hi: "hi-IN",
    gu: "gu-IN",
    mr: "mr-IN",
  };
  return map[locale || "en"] || "en-IN";
}

// ─── Currency ────────────────────────────────────────────

const RUPEE = "₹";

/**
 * Format a number as Indian Rupees (₹1,23,456).
 * Uses Intl.NumberFormat with an explicit ₹ symbol via formatToParts.
 */
export function formatINR(
  amount: number,
  locale?: Locale | string,
  options?: { maximumFractionDigits?: number; compact?: boolean }
): string {
  const intlLocale = toIntlLocale(locale);
  const num = Number(amount) || 0;
  const maxFrac = options?.maximumFractionDigits ?? 0;

  if (options?.compact) {
    if (Math.abs(num) >= 10_000_000) {
      return `${RUPEE}${(num / 10_000_000).toFixed(1)}Cr`;
    }
    if (Math.abs(num) >= 100_000) {
      return `${RUPEE}${(num / 100_000).toFixed(1)}L`;
    }
    if (Math.abs(num) >= 1_000) {
      return `${RUPEE}${(num / 1_000).toFixed(1)}K`;
    }
  }

  try {
    const parts = new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: maxFrac,
    }).formatToParts(num);

    return parts
      .map((part) => (part.type === "currency" ? RUPEE : part.value))
      .join("")
      .trim();
  } catch {
    return `${RUPEE}${num.toLocaleString(intlLocale, { maximumFractionDigits: maxFrac })}`;
  }
}

// ─── Numbers ─────────────────────────────────────────────

/**
 * Format a plain number with locale-specific grouping.
 */
export function formatNumber(
  num: number,
  locale?: Locale | string,
  options?: { maximumFractionDigits?: number }
): string {
  const intlLocale = toIntlLocale(locale);
  return num.toLocaleString(intlLocale, {
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  });
}

/**
 * Format a number as a percentage.
 */
export function formatPercentage(
  num: number,
  locale?: Locale | string,
  options?: { maximumFractionDigits?: number }
): string {
  const intlLocale = toIntlLocale(locale);
  return `${num.toLocaleString(intlLocale, { maximumFractionDigits: options?.maximumFractionDigits ?? 1 })}%`;
}

// ─── Dates ───────────────────────────────────────────────

type DateStyle = "short" | "medium" | "long";

/**
 * Format a date string or Date object to a locale-aware string.
 * short  → "13/05/2026"
 * medium → "13 May 2026"
 * long   → "13 May 2026, Tuesday"
 */
export function formatDate(
  date: string | Date | null | undefined,
  locale?: Locale | string,
  style: DateStyle = "medium"
): string {
  if (!date) return "—";

  const intlLocale = toIntlLocale(locale);
  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "—";

  const formatOptions: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "numeric", month: "numeric", year: "numeric" }
      : style === "long"
        ? { day: "numeric", month: "long", year: "numeric", weekday: "long" }
        : { day: "numeric", month: "short", year: "numeric" };

  return d.toLocaleDateString(intlLocale, formatOptions);
}

/**
 * Format a date with time.
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  locale?: Locale | string
): string {
  if (!date) return "—";

  const intlLocale = toIntlLocale(locale);
  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "—";

  return d.toLocaleString(intlLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a date as a short month + day string, e.g., "13 May" or "१३ मई"
 */
export function formatShortDate(
  date: string | Date | null | undefined,
  locale?: Locale | string
): string {
  if (!date) return "";

  const intlLocale = toIntlLocale(locale);
  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "";

  return d.toLocaleDateString(intlLocale, {
    day: "numeric",
    month: "short",
  });
}

// ─── Relative Time ───────────────────────────────────────

/**
 * Format a date as relative time, e.g., "2 days ago" or "2 दिन पहले".
 */
export function formatRelativeTime(
  date: string | Date | null | undefined,
  locale?: Locale | string
): string {
  if (!date) return "—";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  const intlLocale = toIntlLocale(locale);
  const diff = Date.now() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  try {
    const rtf = new Intl.RelativeTimeFormat(intlLocale, {
      numeric: "auto",
      style: "narrow",
    });

    if (seconds < 60) return rtf.format(-seconds, "second");
    if (minutes < 60) return rtf.format(-minutes, "minute");
    if (hours < 24) return rtf.format(-hours, "hour");
    if (days < 7) return rtf.format(-days, "day");
    if (weeks < 4) return rtf.format(-weeks, "week");

    // Fallback to date
    return formatDate(d, locale, "short");
  } catch {
    // Fallback for environments without RelativeTimeFormat
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(d, locale, "short");
  }
}
