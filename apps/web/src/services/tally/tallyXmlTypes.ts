/**
 * Tally XML Types
 * ─────────────────────────────────────────────────────────
 * TypeScript interfaces for Tally Prime XML import payloads.
 * Maps from IND Manager domain types (Bill, BillItem, CompanyProfile)
 * to the shapes required by Tally's XML schema.
 */

/** Result of a Tally sync operation */
export interface TallySyncResult {
    success: boolean;
    voucherNumber?: string;
    errorCode?: string;
    message?: string;
}

/** Single line item shaped for Tally inventory entries */
export interface TallyLineItem {
    description: string;
    hsnCode: string;
    quantity: number;
    unit: string;       // IND Manager unit (pcs, kg, etc.)
    tallyUnit: string;  // Mapped Tally unit (NOS, KGS, etc.)
    rate: number;
    amount: number;
    gstRate: number;
}

/** GST ledger entry for a voucher */
export interface TallyGSTEntry {
    ledgerName: string;          // e.g. "CGST", "SGST", "IGST"
    type: "CGST" | "SGST" | "IGST";
    amount: number;              // Always positive (Cr side)
    taxType: string;             // Tally tax type string
}

/** Payload for creating a party/sales/GST ledger in Tally */
export interface TallyLedgerPayload {
    name: string;
    parentGroup: string;         // e.g. "Sundry Debtors", "Sales Accounts"
    gstin?: string;
    panNumber?: string;          // Derived from GSTIN chars 3-12
    address?: string;
    stateName?: string;          // Full state name for Tally
    registrationType?: string;   // "Regular" | "Unregistered"
    taxType?: string;            // For duty ledgers: "Central Tax", etc.
    companyName: string;         // Tally company to import into
}

/** Payload for creating a stock item in Tally */
export interface TallyStockItemPayload {
    name: string;
    parentGroup: string;         // "Primary"
    hsnCode: string;
    gstRate: number;
    unit: string;                // Tally unit symbol
    companyName: string;
}

/** Full voucher payload for Tally sales invoice import */
export interface TallyVoucherPayload {
    // Invoice header
    invoiceId: string;           // IND Manager UUID — used for duplicate prevention
    invoiceNumber: string;
    invoiceDate: string;         // ISO date → formatted via formatTallyDate
    dueDate?: string;
    partyLedgerName: string;     // Client name (= Tally party ledger)

    // Amounts — used EXACTLY as provided, no recalculation
    totalAmount: number;
    subtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;

    // Derived
    isInterstate: boolean;       // Derived from igstAmount > 0
    narration: string;           // bill.notes || fallback

    // Line items
    lineItems: TallyLineItem[];

    // Company
    companyName: string;         // Tally company name
}
