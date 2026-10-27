/**
 * Purchasing Domain — Validation Schemas (Zod)
 * ─────────────────────────────────────────────────────────
 * Request validation schemas for purchasing operations.
 */

import { z } from "zod";

// ─── Vendor Schemas ─────────────────────────────────────────────

export const createVendorSchema = z.object({
    name: z.string().min(1, "Vendor name is required").max(200).trim(),
    contactPerson: z.string().min(1, "Contact person is required").max(200).trim(),
    phone: z.string()
        .trim()
        .transform((val) => val.replace(/[\s\-]/g, ""))
        .refine((val) => /^(?:\+91|91|0)?[6-9]\d{9}$/.test(val), {
            message: "Please enter a valid 10-digit mobile number",
        }),
    email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
    address: z.string().max(500).optional().default(""),
    gstin: z.string()
        .trim()
        .optional()
        .default("")
        .refine(
            (val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val.toUpperCase()),
            { message: "Invalid 15-character GSTIN format" }
        )
        .transform((val) => (val ? val.toUpperCase() : "")),
    notes: z.string().max(1000).optional().default(""),
});

export const updateVendorSchema = createVendorSchema.partial();

// ─── Purchase Order Schemas ─────────────────────────────────────

export const purchaseOrderItemSchema = z.object({
    inventoryItemId: z.string().min(1, "Material is required"),
    materialName: z.string().min(1, "Material name is required"),
    quantity: z.coerce.number().positive("Quantity must be positive"),
    unit: z.string().min(1, "Unit is required"),
    unitPrice: z.coerce.number().min(0, "Price cannot be negative"),
});

export const createPurchaseOrderSchema = z.object({
    vendorId: z.string().min(1, "Vendor is required"),
    vendorName: z.string().min(1, "Vendor name is required"),
    items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
    taxPercent: z.coerce.number().min(0).max(100).default(18),
    notes: z.string().max(2000).optional().default(""),
});

export const updatePurchaseStatusSchema = z.object({
    status: z.enum(["Pending", "Ordered", "Received"]),
});

// ─── Inferred Types ─────────────────────────────────────────────

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>;
export type UpdatePurchaseStatusInput = z.infer<typeof updatePurchaseStatusSchema>;
