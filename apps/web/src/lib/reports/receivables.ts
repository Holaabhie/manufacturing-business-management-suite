import { getFinancialYear, getCurrentFinancialYear, getFinancialYearBounds } from "@/lib/utils/financial-year";

export const DEFAULT_CREDIT_DAYS = 30;

/**
 * Format a Date or ISO string into YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function toKolkataDateString(input: Date | string | null | undefined): string | null {
    if (!input) return null;
    if (typeof input === "string") {
        const trimmed = input.trim();
        // If already a pure YYYY-MM-DD string, return as-is
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return trimmed;
        }
        const parsed = new Date(trimmed);
        if (isNaN(parsed.getTime())) return null;
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(parsed);
    }
    if (isNaN(input.getTime())) return null;
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(input);
}

/**
 * Add calendar days to a YYYY-MM-DD date string.
 */
export function addDaysToKolkataDateString(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    const year = dt.getUTCFullYear();
    const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dt.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Difference in calendar days (date1 - date2).
 * If date1 is after date2, returns positive number.
 */
export function differenceInDays(date1Str: string, date2Str: string): number {
    const [y1, m1, d1] = date1Str.split("-").map(Number);
    const [y2, m2, d2] = date2Str.split("-").map(Number);
    const ms1 = Date.UTC(y1, m1 - 1, d1);
    const ms2 = Date.UTC(y2, m2 - 1, d2);
    return Math.round((ms1 - ms2) / (24 * 60 * 60 * 1000));
}

/**
 * Returns YYYY-MM-DD bounds for current or previous Indian Financial Year.
 */
export function getFYDateRange(preset: "current" | "previous"): { from: string; to: string } {
    const currentFY = getCurrentFinancialYear();
    if (preset === "current") {
        const bounds = getFinancialYearBounds(currentFY);
        return {
            from: bounds ? toKolkataDateString(bounds.start)! : "2026-04-01",
            to: bounds ? toKolkataDateString(bounds.end)! : "2027-03-31",
        };
    } else {
        const [startYearStr, endDigits] = currentFY.split("-");
        const prevStart = parseInt(startYearStr, 10) - 1;
        const prevEnd = parseInt(endDigits, 10) - 1;
        const prevFY = `${prevStart}-${String(prevEnd).padStart(2, "0")}`;
        const bounds = getFinancialYearBounds(prevFY);
        return {
            from: bounds ? toKolkataDateString(bounds.start)! : "2025-04-01",
            to: bounds ? toKolkataDateString(bounds.end)! : "2026-03-31",
        };
    }
}

// ─── Statement Types ──────────────────────────────────────────

export interface StatementLine {
    date: string;
    type: "Order" | "Payment";
    particulars: string;
    debit: number;
    credit: number;
    runningBalance: number;
    refId: string;
}

export interface StatementResult {
    client: {
        id: string;
        name: string;
        company?: string;
        email?: string;
        phone?: string;
        address?: string;
        gstin?: string;
    };
    dateRange: {
        from: string;
        to: string;
    };
    openingBalance: number;
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    lines: StatementLine[];
    meta?: {
        excludedSampleCount: number;
    };
}

// ─── Aging Types ──────────────────────────────────────────────

export interface AgingClientRow {
    clientId: string;
    clientName: string;
    clientCompany: string;
    clientPhone: string;
    notDue: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
    totalOutstanding: number;
    unallocatedCredit: number;
    netReceivable: number;
}

export interface ReceivablesAgingResult {
    asOf: string;
    kpis: {
        totalOutstanding: number;
        overdue: number;
        overdue90Plus: number;
        unallocatedCredit: number;
        netReceivable: number;
    };
    rows: AgingClientRow[];
    totals: {
        notDue: number;
        days1_30: number;
        days31_60: number;
        days61_90: number;
        days90Plus: number;
        totalOutstanding: number;
        unallocatedCredit: number;
        netReceivable: number;
    };
    meta: {
        skippedOrdersCount: number;
        excludedOrdersCount: number;
        excludedSampleCount: number;
        totalClientsWithBalances: number;
    };
}
