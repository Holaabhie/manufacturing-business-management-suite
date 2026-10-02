/**
 * Payables Reporting & Statements Domain Types & Helpers
 * ─────────────────────────────────────────────────────────────
 * Reuses bucket edge logic and date utilities from receivables.ts.
 * All financial aggregates are calculated using integer paise.
 */

export {
    DEFAULT_CREDIT_DAYS,
    toKolkataDateString,
    addDaysToKolkataDateString,
    differenceInDays,
    getFYDateRange,
} from "@/lib/reports/receivables";

// ─── Payables Aging Types ─────────────────────────────────────

export type AgingBucket = "notDue" | "days1_30" | "days31_60" | "days61_90" | "days90Plus";

export interface AgingBillDetail {
    billId: string;
    billNumber: string;
    vendorInvoiceNumber: string;
    billDate: string;
    dueDate: string;
    payableAmount: number;
    paidAmount: number;
    balance: number;
    daysPastDue: number;
    bucket: AgingBucket;
    tdsAmount?: number;
    tdsSection?: string;
}

export interface AgingVendorRow {
    vendorId: string;
    vendorName: string;
    vendorPhone?: string;
    vendorGstin?: string;
    vendorAddress?: string;
    notDue: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
    totalOutstanding: number;
    billsCount: number;
    bills?: AgingBillDetail[];
}

export interface PayablesAgingResult {
    asOf: string;
    kpis: {
        totalOutstanding: number;
        overdue: number;
        overdue90Plus: number;
        notDue: number;
    };
    rows: AgingVendorRow[];
    totals: {
        notDue: number;
        days1_30: number;
        days31_60: number;
        days61_90: number;
        days90Plus: number;
        totalOutstanding: number;
    };
    meta: {
        totalVendorsWithBalances: number;
        totalOpenBillsCount: number;
        excludedDraftCount: number;
        excludedVoidCount: number;
    };
}

// ─── Vendor Statement Types ───────────────────────────────────

export interface VendorStatementLine {
    date: string;
    type: "Bill" | "Payment";
    particulars: string;
    billNumber?: string;
    vendorInvoiceNumber?: string;
    tdsNote?: string;
    debit: number;          // payment made to vendor (reduces payable balance)
    credit: number;         // bill received from vendor (increases payable balance)
    runningBalance: number; // accumulated balance owed to vendor
    refId: string;
}

export interface VendorStatementResult {
    vendor: {
        id: string;
        name: string;
        phone?: string;
        address?: string;
        gstin?: string;
        stateCode?: string;
    };
    dateRange: {
        from: string;
        to: string;
    };
    openingBalance: number;
    totalDebit: number;     // total payments within period
    totalCredit: number;    // total bills within period
    closingBalance: number;
    lines: VendorStatementLine[];
}
