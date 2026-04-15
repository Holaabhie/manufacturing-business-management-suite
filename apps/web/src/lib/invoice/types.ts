/**
 * Invoice Type Definitions — GST Compliant
 * ──────────────────────────────────────────
 * Full GST-compliant invoice types for the Handlebars + Puppeteer
 * PDF generation system. Supports intra/inter-state, reverse charge,
 * zero-rated exports, e-Invoice IRN, and per-line-item tax breakdown.
 *
 * Backward compatible — all new fields are optional with sensible defaults.
 */

// ─── Tax Type ─────────────────────────────────────────────────

export type TaxType = "CGST_SGST" | "IGST";

// ─── Invoice Status ───────────────────────────────────────────

export type InvoiceStatus = "paid" | "sent" | "draft" | "overdue" | "cancelled" | "partially_paid";

// ─── Company / Seller Info ────────────────────────────────────

export interface CompanyInfo {
    companyName: string;
    address: string;
    phone: string;
    email: string;
    logoUrl?: string;
    gstin?: string;
    pan?: string;
    state?: string;
    stateCode?: string;
    bankName?: string;
    accountNo?: string;
    ifsc?: string;
    upiId?: string;
    website?: string;
}

// ─── Client / Buyer Info ──────────────────────────────────────

export interface ClientInfo {
    name: string;
    address?: string;
    gstin?: string;
    pan?: string;
    phone?: string;
    email?: string;
    state?: string;
    stateCode?: string;
    placeOfSupply?: string;
}

// ─── Bank Details ─────────────────────────────────────────────

export interface BankDetails {
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch?: string;
    accountType?: string;
    upiId?: string;
}

// ─── Line Item ────────────────────────────────────────────────

export interface InvoiceLineItem {
    description: string;
    hsnCode?: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    gstRate: number; // e.g. 18 means 18%

    // ─── Extended GST fields (optional, computed if absent) ───
    discount?: number;         // discount amount for this line
    discountPercent?: number;  // discount percentage
    taxableAmount?: number;    // amount after discount (before tax)
    cgstRate?: number;         // e.g. 9 for 9%
    cgstAmount?: number;
    sgstRate?: number;
    sgstAmount?: number;
    igstRate?: number;
    igstAmount?: number;
    total?: number;            // taxable + all taxes
}

// ─── Invoice Totals ───────────────────────────────────────────

export interface InvoiceTotals {
    totalDiscount: number;
    totalTaxableAmount: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalTax: number;
    roundOff: number;
    grandTotal: number;
}

// ─── Main Invoice Payload ─────────────────────────────────────

export interface InvoicePayload {
    invoiceNumber: string;
    issueDate: string;      // ISO string or readable date
    dueDate: string;
    status: InvoiceStatus;

    company: CompanyInfo;
    client: ClientInfo;
    items: InvoiceLineItem[];

    // ─── Legacy tax breakdown (kept for backward compatibility)
    subtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;

    // ─── Extended GST fields ──────────────────────────────────
    taxType?: TaxType;
    isReverseCharge?: boolean;
    isZeroRated?: boolean;              // exports / SEZ
    reverseChargeText?: string;
    eInvoiceIRN?: string | null;        // e-Invoice IRN reference
    eInvoiceAckNo?: string | null;
    eInvoiceAckDate?: string | null;
    totals?: InvoiceTotals;             // computed totals

    // ─── Bank Details ─────────────────────────────────────────
    bankDetails?: BankDetails;

    // ─── Optional display fields ──────────────────────────────
    amountInWords?: string;
    notes?: string;
    terms?: string;
    placeOfSupply?: string;
    qrCodeDataUrl?: string;  // Pre-generated QR code as data URL

    // ─── Document references ──────────────────────────────────
    poNumber?: string;        // Purchase order reference
    poDate?: string;
    transportMode?: string;
    vehicleNo?: string;
}
