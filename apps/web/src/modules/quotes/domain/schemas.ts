import { z } from "zod";

export const quoteItemSchema = z.object({
    item_id: z.string().optional(),
    description: z.string().min(1, "Item description is required").max(500),
    hsn_sac: z.string().max(20).optional().default(""),
    qty: z.coerce.number().positive("Quantity must be greater than 0"),
    unit: z.string().max(20).optional().default("pcs"),
    rate: z.coerce.number().min(0, "Rate must be non-negative"),
    discount: z.coerce.number().min(0).optional().default(0),
    gst_rate: z.coerce.number().min(0).max(100).optional().default(0),
    cgst: z.coerce.number().min(0).optional().default(0),
    sgst: z.coerce.number().min(0).optional().default(0),
    igst: z.coerce.number().min(0).optional().default(0),
    line_total: z.coerce.number().min(0).optional().default(0),
});

export const quoteCustomerSchema = z.object({
    id: z.string().nullable().optional(),
    name: z.string().min(1, "Customer name is required").max(300).trim(),
    address: z.string().max(500).optional().default(""),
    gstin: z.string().max(20).optional().default(""),
    phone: z.string().max(50).optional().default(""),
    email: z.string().max(200).optional().default(""),
});

export const createQuoteSchema = z.object({
    quotation_number: z.string().max(50).optional(),
    quotation_date: z.string().min(1, "Quotation date required"),
    valid_until: z.string().min(1, "Valid until date required"),
    customer: quoteCustomerSchema.optional(),
    clientId: z.string().nullable().optional(),
    clientName: z.string().max(300).optional(),
    clientAddress: z.string().max(500).optional().default(""),
    clientGSTIN: z.string().max(20).optional().default(""),
    clientPhone: z.string().max(50).optional().default(""),
    clientEmail: z.string().max(200).optional().default(""),
    items: z.array(quoteItemSchema).min(1, "At least one item is required"),
    subtotal: z.coerce.number().min(0).default(0),
    total_discount: z.coerce.number().min(0).optional().default(0),
    total_tax: z.coerce.number().min(0).default(0),
    grand_total: z.coerce.number().min(0).default(0),
    cgst_amount: z.coerce.number().min(0).optional().default(0),
    sgst_amount: z.coerce.number().min(0).optional().default(0),
    igst_amount: z.coerce.number().min(0).optional().default(0),
    is_igst: z.boolean().optional().default(false),
    terms: z.string().max(2000).optional().default(""),
    notes: z.string().max(2000).optional().default(""),
    status: z.enum(["Draft", "Sent", "Accepted", "Rejected", "Expired"]).optional().default("Draft"),
    converted_order_id: z.string().nullable().optional(),
    converted_lines: z.array(z.object({
        line_index: z.coerce.number(),
        order_id: z.string().nullable().optional(),
        converted_at: z.any().optional(),
    })).optional().default([]),
});

export const updateQuoteSchema = z.object({
    quotation_date: z.string().optional(),
    valid_until: z.string().optional(),
    customer: quoteCustomerSchema.optional(),
    clientId: z.string().nullable().optional(),
    clientName: z.string().max(300).optional(),
    clientAddress: z.string().max(500).optional(),
    clientGSTIN: z.string().max(20).optional(),
    clientPhone: z.string().max(50).optional(),
    clientEmail: z.string().max(200).optional(),
    items: z.array(quoteItemSchema).min(1).optional(),
    subtotal: z.coerce.number().min(0).optional(),
    total_discount: z.coerce.number().min(0).optional(),
    total_tax: z.coerce.number().min(0).optional(),
    grand_total: z.coerce.number().min(0).optional(),
    cgst_amount: z.coerce.number().min(0).optional(),
    sgst_amount: z.coerce.number().min(0).optional(),
    igst_amount: z.coerce.number().min(0).optional(),
    is_igst: z.boolean().optional(),
    terms: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
    status: z.enum(["Draft", "Sent", "Accepted", "Rejected", "Expired"]).optional(),
    converted_order_id: z.string().nullable().optional(),
    converted_lines: z.array(z.object({
        line_index: z.coerce.number(),
        order_id: z.string().nullable().optional(),
        converted_at: z.any().optional(),
    })).optional(),
});

export const quoteStatusTransitionSchema = z.object({
    status: z.enum(["Draft", "Sent", "Accepted", "Rejected"]),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
