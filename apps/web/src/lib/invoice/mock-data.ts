/**
 * Invoice Mock Data — GST Enhanced
 * ──────────────────────────────────
 * Example data for testing and development.
 * Includes new GST fields: taxType, reverse charge, bank details, place of supply, discount.
 */

import type { InvoicePayload } from "./types";

export const MOCK_INVOICE: InvoicePayload = {
    invoiceNumber: "INV-2025-26-0042",
    issueDate: "2026-02-16",
    dueDate: "2026-03-18",
    status: "sent",

    // ─── Tax Configuration ────────────────────────────────────
    taxType: "CGST_SGST",
    isReverseCharge: false,
    isZeroRated: false,
    eInvoiceIRN: null,

    company: {
        companyName: "Arihant Manufacturing Pvt. Ltd.",
        address: "B-12, Industrial Area Phase II, Pimpri-Chinchwad, Pune – 411018, Maharashtra",
        phone: "+91 98765 43210",
        email: "accounts@arihantmfg.in",
        website: "www.arihantmfg.in",
        gstin: "27AABCA1234F1ZP",
        pan: "AABCA1234F",
        state: "Maharashtra",
        stateCode: "27",
        bankName: "HDFC Bank — Wakad Branch",
        accountNo: "50200078901234",
        ifsc: "HDFC0001234",
        upiId: "arihantmfg@hdfcbank",
        logoUrl: "",
    },

    client: {
        name: "Tata AutoComp Systems Ltd.",
        address: "Hinjewadi IT Park, Phase 3, Pune – 411057, Maharashtra",
        gstin: "27AABCT5678H1ZQ",
        phone: "+91 20 6789 0123",
        email: "procurement@tataautocomp.com",
        state: "Maharashtra",
        stateCode: "27",
        placeOfSupply: "Maharashtra (27)",
    },

    items: [
        {
            description: "CNC Machined Precision Gear Shaft — EN24 Steel, Heat Treated, Ground Finish",
            hsnCode: "8483",
            quantity: 250,
            unit: "Pcs",
            rate: 1450.00,
            amount: 362500.00,
            gstRate: 18,
            discount: 0,
        },
        {
            description: "Hydraulic Cylinder Assembly — 50mm Bore, Chrome Plated Rod",
            hsnCode: "8412",
            quantity: 40,
            unit: "Nos",
            rate: 8750.00,
            amount: 350000.00,
            gstRate: 18,
            discount: 0,
        },
        {
            description: "Stainless Steel Fastener Kit (M8 × 50mm) — Grade A4-80",
            hsnCode: "7318",
            quantity: 500,
            unit: "Sets",
            rate: 185.00,
            amount: 92500.00,
            gstRate: 18,
            discount: 500,
        },
        {
            description: "Bearing Housing — Cast Iron GG25, Precision Bored",
            hsnCode: "8482",
            quantity: 100,
            unit: "Pcs",
            rate: 3200.00,
            amount: 320000.00,
            gstRate: 18,
            discount: 0,
        },
        {
            description: "Annual Maintenance Contract — CNC Lathe (Fanuc 0i-TF)",
            hsnCode: "9987",
            quantity: 1,
            unit: "Lot",
            rate: 175000.00,
            amount: 175000.00,
            gstRate: 18,
            discount: 0,
        },
    ],

    subtotal: 1300000.00,
    cgstAmount: 117000.00,
    sgstAmount: 117000.00,
    igstAmount: 0,
    totalAmount: 1534000.00,
    amountInWords: "Fifteen Lakh Thirty Four Thousand Rupees Only",

    placeOfSupply: "Maharashtra (27)",
    notes: "Payment via NEFT/RTGS preferred. Cheques will take 3 business days to clear.",
    terms: "1. Goods once sold will not be taken back.\n2. Interest @ 2% per month will be charged on overdue payments.\n3. Subject to Pune jurisdiction.\n4. E&OE — Errors and Omissions Excepted.",

    // ─── Bank Details (structured) ────────────────────────────
    bankDetails: {
        bankName: "HDFC Bank — Wakad Branch",
        accountNo: "50200078901234",
        ifsc: "HDFC0001234",
        branch: "Wakad, Pune",
        accountType: "Current",
        upiId: "arihantmfg@hdfcbank",
    },
};

// ─── Paid Invoice ─────────────────────────────────────────────

export const MOCK_INVOICE_PAID: InvoicePayload = {
    ...MOCK_INVOICE,
    invoiceNumber: "INV-2025-26-0039",
    status: "paid",
    issueDate: "2026-01-15",
    dueDate: "2026-02-14",
};

// ─── Overdue Invoice ──────────────────────────────────────────

export const MOCK_INVOICE_OVERDUE: InvoicePayload = {
    ...MOCK_INVOICE,
    invoiceNumber: "INV-2025-26-0298",
    status: "overdue",
    issueDate: "2025-12-01",
    dueDate: "2025-12-31",
};

// ─── Inter-State IGST Invoice ─────────────────────────────────

export const MOCK_INVOICE_IGST: InvoicePayload = {
    ...MOCK_INVOICE,
    invoiceNumber: "INV-2025-26-0055",
    status: "sent",
    taxType: "IGST",
    client: {
        ...MOCK_INVOICE.client,
        name: "Ashok Leyland Ltd.",
        address: "No.1, Sardar Patel Road, Guindy, Chennai – 600032, Tamil Nadu",
        gstin: "33AAACI3982R1ZN",
        state: "Tamil Nadu",
        stateCode: "33",
        placeOfSupply: "Tamil Nadu (33)",
    },
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 234000.00,
    placeOfSupply: "Tamil Nadu (33)",
};

// ─── Reverse Charge Invoice ──────────────────────────────────

export const MOCK_INVOICE_REVERSE_CHARGE: InvoicePayload = {
    ...MOCK_INVOICE,
    invoiceNumber: "INV-2025-26-0063",
    status: "draft",
    isReverseCharge: true,
    reverseChargeText: "Applicable as per Section 9(3) of the CGST Act, 2017",
};
