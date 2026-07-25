/**
 * Invoice Utility Functions — GST Enhanced
 * ──────────────────────────────────────────
 * Pure utility functions for tax calculation, currency formatting,
 * number-to-words conversion, and GST compliance for Indian Rupee invoices.
 */

import type { InvoiceLineItem, InvoicePayload, InvoiceTotals, TaxType } from "./types";

// ─── Currency Formatting ──────────────────────────────────────

/** Format number as INR with \u20B9 symbol: \u20B91,23,456.78 */
export function formatINR(amount: number): string {
    return "\u20B9" + amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/** Format number without \u20B9 symbol (for table cells) */
export function formatNumber(n: number): string {
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// ─── Date Formatting ──────────────────────────────────────────

/** Format date as "15 Feb 2026" */
export function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
}

/** Format date as "15/02/2026" */
export function formatDateNumeric(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
}

// ─── Tax Type Determination ───────────────────────────────────

/**
 * Determine tax type by comparing seller and buyer state codes.
 * Same state → CGST + SGST, different → IGST.
 */
export function determineTaxType(
    sellerStateCode?: string,
    buyerStateCode?: string,
): TaxType {
    if (!sellerStateCode || !buyerStateCode) return "CGST_SGST";
    return sellerStateCode === buyerStateCode ? "CGST_SGST" : "IGST";
}

// ─── Per-Line-Item Tax Calculation ────────────────────────────

/**
 * Calculate tax breakdown for a single line item.
 * Returns the item with computed tax fields populated.
 */
export function calculateLineItemTax(
    item: InvoiceLineItem,
    taxType: TaxType,
): InvoiceLineItem {
    const grossAmount = item.quantity * item.rate;
    const discount = item.discount ?? 0;
    const taxableAmount = Math.max(0, grossAmount - discount);
    const gstRate = item.gstRate || 0;
    const totalTax = (taxableAmount * gstRate) / 100;

    let cgstRate = 0, cgstAmount = 0, sgstRate = 0, sgstAmount = 0;
    let igstRate = 0, igstAmount = 0;

    if (taxType === "IGST") {
        igstRate = gstRate;
        igstAmount = round2(totalTax);
    } else {
        cgstRate = gstRate / 2;
        sgstRate = gstRate / 2;
        cgstAmount = round2(totalTax / 2);
        sgstAmount = round2(totalTax / 2);
    }

    return {
        ...item,
        amount: round2(grossAmount),
        discount: round2(discount),
        taxableAmount: round2(taxableAmount),
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        igstRate,
        igstAmount,
        total: round2(taxableAmount + cgstAmount + sgstAmount + igstAmount),
    };
}

// ─── Full Invoice Totals Calculation ──────────────────────────

/**
 * Calculate complete invoice totals from line items.
 * Includes discount, per-item tax, round-off to nearest rupee.
 */
export function calculateInvoiceTotals(
    items: InvoiceLineItem[],
    taxType: TaxType,
): InvoiceTotals {
    let totalDiscount = 0;
    let totalTaxableAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    for (const item of items) {
        const computed = calculateLineItemTax(item, taxType);
        totalDiscount += computed.discount ?? 0;
        totalTaxableAmount += computed.taxableAmount ?? 0;
        totalCgst += computed.cgstAmount ?? 0;
        totalSgst += computed.sgstAmount ?? 0;
        totalIgst += computed.igstAmount ?? 0;
    }

    const totalTax = round2(totalCgst + totalSgst + totalIgst);
    const rawTotal = totalTaxableAmount + totalTax;
    const roundOff = getRoundOff(rawTotal);
    const grandTotal = Math.round(rawTotal + roundOff);

    return {
        totalDiscount: round2(totalDiscount),
        totalTaxableAmount: round2(totalTaxableAmount),
        totalCgst: round2(totalCgst),
        totalSgst: round2(totalSgst),
        totalIgst: round2(totalIgst),
        totalTax,
        roundOff: round2(roundOff),
        grandTotal,
    };
}

// ─── Legacy Tax Breakdown (backward compat) ───────────────────

export interface TaxBreakdown {
    subtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
    effectiveGstRate: number;
}

/**
 * Calculate complete tax breakdown from line items.
 * For intra-state: splits GST into CGST + SGST
 * For inter-state: uses IGST
 */
export function calculateTaxBreakdown(
    items: InvoiceLineItem[],
    isInterState: boolean = false,
): TaxBreakdown {
    let subtotal = 0;
    let totalGst = 0;

    for (const item of items) {
        const itemTotal = item.quantity * item.rate;
        const gstAmount = (itemTotal * item.gstRate) / 100;
        subtotal += itemTotal;
        totalGst += gstAmount;
    }

    const cgstAmount = isInterState ? 0 : totalGst / 2;
    const sgstAmount = isInterState ? 0 : totalGst / 2;
    const igstAmount = isInterState ? totalGst : 0;
    const totalAmount = subtotal + totalGst;

    const effectiveGstRate = subtotal > 0
        ? Math.round((totalGst / subtotal) * 10000) / 100
        : 0;

    return {
        subtotal: round2(subtotal),
        cgstAmount: round2(cgstAmount),
        sgstAmount: round2(sgstAmount),
        igstAmount: round2(igstAmount),
        totalAmount: round2(totalAmount),
        effectiveGstRate,
    };
}

/** Calculate single line item amount */
export function calculateLineAmount(qty: number, rate: number): number {
    return round2(qty * rate);
}

// ─── Round-Off (GST Rules) ────────────────────────────────────

/**
 * Calculate round-off to nearest rupee per GST rules.
 * Returns a value between -0.50 and +0.50 (round to nearest).
 */
export function getRoundOff(amount: number): number {
    const rounded = Math.round(amount);
    return round2(rounded - amount);
}

// ─── Number to Words (Indian Rupees) ──────────────────────────

const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
];

const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertGroup(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convertGroup(n % 100) : "");
}

/**
 * Convert a number to Indian Rupee words.
 * Example: 1,23,456.78 → "One Lakh Twenty Three Thousand Four Hundred and Fifty Six Rupees and Seventy Eight Paise Only"
 */
export function numberToWords(amount: number): string {
    if (amount === 0) return "Zero Rupees Only";

    const isNegative = amount < 0;
    amount = Math.abs(amount);

    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    if (rupees === 0 && paise === 0) return "Zero Rupees Only";

    let result = "";

    if (rupees > 0) {
        const crore = Math.floor(rupees / 10000000);
        const lakh = Math.floor((rupees % 10000000) / 100000);
        const thousand = Math.floor((rupees % 100000) / 1000);
        const remainder = rupees % 1000;

        const parts: string[] = [];
        if (crore > 0) parts.push(convertGroup(crore) + " Crore");
        if (lakh > 0) parts.push(convertGroup(lakh) + " Lakh");
        if (thousand > 0) parts.push(convertGroup(thousand) + " Thousand");
        if (remainder > 0) parts.push(convertGroup(remainder));

        result = parts.join(" ") + " Rupees";
    }

    if (paise > 0) {
        result += (rupees > 0 ? " and " : "") + convertGroup(paise) + " Paise";
    }

    return (isNegative ? "Minus " : "") + result + " Only";
}

// ─── Helpers ──────────────────────────────────────────────────

/** Round to 2 decimal places */
function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/**
 * Get current Indian Financial Year string.
 * FY runs April 1 – March 31.
 * Example: In Feb 2026 → "2025-26", In May 2026 → "2026-27"
 */
export function getCurrentFinancialYear(date?: Date): string {
    const d = date || new Date();
    const month = d.getMonth(); // 0-indexed, April = 3
    const year = d.getFullYear();

    const fyStart = month >= 3 ? year : year - 1; // April onwards = current year
    const fyEnd = (fyStart + 1) % 100;

    return `${fyStart}-${fyEnd.toString().padStart(2, "0")}`;
}

/**
 * Get the financial year start year number.
 */
export function getFYStartYear(date?: Date): number {
    const d = date || new Date();
    const month = d.getMonth();
    return month >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}
