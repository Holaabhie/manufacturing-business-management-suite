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
    phone: z.string().min(1, "Phone is required").max(50).trim(),
    email: z.string().email("Invalid email").max(200).optional().or(z.literal("")),
    address: z.string().max(500).optional().default(""),
    gstin: z.string().max(20).optional().default(""),
    notes: z.string().max(1000).optional().default(""),
});

export const updateVendorSchema = createVendorSchema.partial();

// ─── Purchase Order Schemas ─────────────────────────────────────

export const purchaseOrderItemSchema = z.object({
    inventoryItemId: z.string().min(1, "Material is required"),
    materialName: z.string().min(1, "Material name is required"),
    quantity: z.number({ coerce: true }).positive("Quantity must be positive"),
    unit: z.string().min(1, "Unit is required"),
    unitPrice: z.number({ coerce: true }).min(0, "Price cannot be negative"),
});

export const createPurchaseOrderSchema = z.object({
    vendorId: z.string().min(1, "Vendor is required"),
    vendorName: z.string().min(1, "Vendor name is required"),
    items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
    taxPercent: z.number({ coerce: true }).min(0).max(100).default(18),
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
