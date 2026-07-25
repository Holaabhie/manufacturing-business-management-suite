/**
 * Indian Financial Year Utilities
 * ────────────────────────────────────────────────────
 * Indian FY runs April 1 → March 31.
 *
 * Examples:
 *   2025-06-15  → "2025-26"
 *   2026-01-10  → "2025-26"
 *   2026-04-01  → "2026-27"
 *   2025-03-31  → "2024-25"
 */

/**
 * Returns the Indian Financial Year label for a given date.
 *
 * @param date  A Date object, an ISO string, or a YYYY-MM-DD string.
 *              Returns null for invalid/missing input instead of throwing.
 */
export function getFinancialYear(date: Date | string | null | undefined): string | null {
    if (!date) return null;

    const d = typeof date === "string" ? new Date(date) : date;

    // Guard against invalid dates (NaN from bad strings)
    if (isNaN(d.getTime())) return null;

    const month = d.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr
    const year = d.getFullYear();

    // Before April (months 0-2) → FY started previous calendar year
    // April onwards (months 3-11) → FY started this calendar year
    const fyStartYear = month < 3 ? year - 1 : year;
    const fyEndYear = fyStartYear + 1;

    // Format: "2025-26" (last 2 digits of end year)
    return `${fyStartYear}-${String(fyEndYear).slice(-2)}`;
}

/**
 * Returns the current Indian Financial Year label.
 */
export function getCurrentFinancialYear(): string {
    return getFinancialYear(new Date())!;
}

/**
 * Returns the start and end Date boundaries for a given FY label.
 * E.g. "2025-26" → { start: 2025-04-01T00:00:00, end: 2026-03-31T23:59:59.999 }
 */
export function getFinancialYearBounds(fy: string): { start: Date; end: Date } | null {
    const match = fy.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;

    const startYear = parseInt(match[1], 10);
    const start = new Date(startYear, 3, 1, 0, 0, 0, 0);        // April 1
    const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999); // March 31
    return { start, end };
}
