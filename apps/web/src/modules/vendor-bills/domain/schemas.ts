import { z } from "zod";

/**
 * GSTIN Validation Regex
 * Indian 15-character GST Identification Number format:
 * 2 digits (State Code) + 5 letters (PAN) + 4 digits (PAN serial) + 1 letter (PAN checksum)
 * + 1 alphanumeric (entity code) + 'Z' + 1 alphanumeric (checksum)
 */
export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

export const vendorSnapshotSchema = z.object({
    name: z.string().min(1, "Vendor name is required"),
    gstin: z
        .string()
        .trim()
        .optional()
        .refine(
            (val) => !val || GSTIN_REGEX.test(val),
            { message: "Invalid GSTIN format (e.g. 27AAAAA0000A1Z5)" }
        ),
    address: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    state_code: z.string().optional().default(""),
});

export const vendorBillItemSchema = z.object({
    description: z.string().min(1, "Item description is required"),
    hsn_sac: z.string().optional().default(""),
    qty: z.coerce.number().positive("Quantity must be greater than 0"),
    unit: z.string().optional().default("unit"),
    rate: z.coerce.number().min(0, "Rate must be 0 or greater"),
    discount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
    gst_rate: z.coerce.number().min(0, "GST rate must be 0 or greater").default(0),
});

export const tdsSchema = z.object({
    section: z.string().min(1, "TDS section is required"),
    rate: z.coerce.number().min(0, "TDS rate cannot be negative").max(100, "TDS rate cannot exceed 100%"),
});

export const createVendorBillSchema = z.object({
    vendor_id: z.string().min(1, "Vendor is required"),
    vendor: vendorSnapshotSchema.partial().optional(),
    purchase_order_id: z.string().nullable().optional(),
    vendor_invoice_number: z.string().trim().min(1, "Vendor invoice number is required"),
    bill_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bill date must be in YYYY-MM-DD format"),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format").optional(),
    supply_type: z.enum(["intra", "inter"]).nullable().optional(),
    place_of_supply_state_code: z.string().nullable().optional(),
    reverse_charge: z.boolean().optional().default(false),
    itc_eligible: z.boolean().optional(),
    items: z.array(vendorBillItemSchema).default([]),
    tds: tdsSchema.nullable().optional(),
    notes: z.string().optional().default(""),
});

export const updateVendorBillSchema = z.object({
    vendor_id: z.string().min(1).optional(),
    vendor: vendorSnapshotSchema.partial().optional(),
    purchase_order_id: z.string().nullable().optional(),
    vendor_invoice_number: z.string().trim().min(1).optional(),
    bill_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    supply_type: z.enum(["intra", "inter"]).nullable().optional(),
    place_of_supply_state_code: z.string().nullable().optional(),
    reverse_charge: z.boolean().optional(),
    itc_eligible: z.boolean().optional(),
    items: z.array(vendorBillItemSchema).optional(),
    tds: tdsSchema.nullable().optional(),
    notes: z.string().optional(),
});

export const recordBillPaymentSchema = z.object({
    amount: z.coerce.number().positive("Payment amount must be greater than 0"),
    payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be in YYYY-MM-DD format"),
    payment_mode: z.enum(["Cash", "Bank", "UPI", "Cheque", "Other"]),
    reference: z.string().optional().default(""),
    notes: z.string().optional().default(""),
});

export const voidBillPaymentSchema = z.object({
    void_reason: z.string().trim().min(1, "Void reason is required"),
});

export const billStatusTransitionSchema = z.object({
    status: z.enum(["Open", "Void"]),
    void_reason: z.string().trim().optional(),
});

export type CreateVendorBillInput = z.infer<typeof createVendorBillSchema>;
export type UpdateVendorBillInput = z.infer<typeof updateVendorBillSchema>;
export type RecordBillPaymentInput = z.infer<typeof recordBillPaymentSchema>;
export type VoidBillPaymentInput = z.infer<typeof voidBillPaymentSchema>;
export type BillStatusTransitionInput = z.infer<typeof billStatusTransitionSchema>;
