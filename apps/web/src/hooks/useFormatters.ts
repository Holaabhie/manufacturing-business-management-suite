"use client";

import { useCallback, useMemo } from "react";
import { useAppLocale } from "@/components/LocaleProvider";
import {
  formatINR as _formatINR,
  formatNumber as _formatNumber,
  formatPercentage as _formatPercentage,
  formatDate as _formatDate,
  formatDateTime as _formatDateTime,
  formatShortDate as _formatShortDate,
  formatRelativeTime as _formatRelativeTime,
  toIntlLocale,
} from "@/lib/formatters";

/**
 * React hook that provides locale-aware formatting functions.
 * Automatically reads the current locale from LocaleProvider context.
 *
 * Usage:
 *   const { formatINR, formatDate } = useFormatters();
 *   formatINR(150000)  // → "\u20B91,50,000" (or locale-specific)
 */
export function useFormatters() {
  const { locale } = useAppLocale();

  const formatINR = useCallback(
    (amount: number, options?: { maximumFractionDigits?: number; compact?: boolean }) =>
      _formatINR(amount, locale, options),
    [locale]
  );

  const formatNumber = useCallback(
    (num: number, options?: { maximumFractionDigits?: number }) =>
      _formatNumber(num, locale, options),
    [locale]
  );

  const formatPercentage = useCallback(
    (num: number, options?: { maximumFractionDigits?: number }) =>
      _formatPercentage(num, locale, options),
    [locale]
  );

  const formatDate = useCallback(
    (date: string | Date | null | undefined, style?: "short" | "medium" | "long") =>
      _formatDate(date, locale, style),
    [locale]
  );

  const formatDateTime = useCallback(
    (date: string | Date | null | undefined) => _formatDateTime(date, locale),
    [locale]
  );

  const formatShortDate = useCallback(
    (date: string | Date | null | undefined) => _formatShortDate(date, locale),
    [locale]
  );

  const formatRelativeTime = useCallback(
    (date: string | Date | null | undefined) => _formatRelativeTime(date, locale),
    [locale]
  );

  const intlLocale = useMemo(() => toIntlLocale(locale), [locale]);

  return {
    locale,
    intlLocale,
    formatINR,
    formatNumber,
    formatPercentage,
    formatDate,
    formatDateTime,
    formatShortDate,
    formatRelativeTime,
  };
}
