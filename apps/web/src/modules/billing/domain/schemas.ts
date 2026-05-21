import { z } from "zod";

const billItemSchema = z.object({
    description: z.string().min(1).max(500),
    hsnCode: z.string().max(20).optional().default(""),
    quantity: z.coerce.number().positive(),
    unit: z.string().max(20).optional().default("pcs"),
    rate: z.coerce.number().min(0),
    amount: z.coerce.number().min(0),
    gstRate: z.coerce.number().min(0).max(100).optional().default(0),
});

export const createBillSchema = z.object({
    billNumber: z.string().min(1, "Bill number required").max(50).trim(),
    billDate: z.string().min(1, "Bill date required"),
    dueDate: z.string().min(1, "Due date required"),
    client_id: z.string().optional(),
    clientName: z.string().min(1, "Client name required").max(300).trim(),
    clientAddress: z.string().max(500).optional().default(""),
    clientGSTIN: z.string().max(20).optional().default(""),
    clientPhone: z.string().max(50).optional().default(""),
    clientEmail: z.string().max(200).optional().default(""),
    items: z.array(billItemSchema).optional().default([]),
    subtotal: z.coerce.number().min(0).optional().default(0),
    cgstAmount: z.coerce.number().min(0).optional().default(0),
    sgstAmount: z.coerce.number().min(0).optional().default(0),
    igstAmount: z.coerce.number().min(0).optional().default(0),
    totalAmount: z.coerce.number().min(0).optional().default(0),
    amountInWords: z.string().max(500).optional().default(""),
    notes: z.string().max(2000).optional().default(""),
    terms: z.string().max(2000).optional().default(""),
    status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional().default("draft"),
});

export const updateBillSchema = z.object({
    billDate: z.string().optional(),
    dueDate: z.string().optional(),
    clientName: z.string().min(1).max(300).trim().optional(),
    clientAddress: z.string().max(500).optional(),
    items: z.array(billItemSchema).optional(),
    subtotal: z.coerce.number().min(0).optional(),
    totalAmount: z.coerce.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
    terms: z.string().max(2000).optional(),
    status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
    // Tally Prime sync
    tallySynced: z.boolean().optional(),
    tallyVoucherNumber: z.string().max(100).optional(),
    tallySyncedAt: z.string().optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
