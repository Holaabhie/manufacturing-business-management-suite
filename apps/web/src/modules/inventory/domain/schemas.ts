/**
 * Inventory Domain — Validation Schemas (Zod)
 * ─────────────────────────────────────────────────────────
 * Request validation schemas for inventory operations.
 * Used by the presentation layer to validate incoming data
 * BEFORE it reaches business logic.
 */

import { z } from "zod";

export const createInventoryItemSchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .max(200, "Name must be 200 characters or less")
        .trim(),
    quantity: z
        .number({ coerce: true })
        .min(0, "Quantity cannot be negative")
        .default(0),
    unit: z
        .string()
        .min(1, "Unit is required")
        .max(50)
        .trim()
        .default("kg"),
    minStockLevel: z
        .number({ coerce: true })
        .min(0, "Minimum stock level cannot be negative")
        .default(10),
    supplierWhatsapp: z
        .string()
        .max(50)
        .trim()
        .optional()
        .default(""),
    purchaseCostPerUnit: z
        .number({ coerce: true })
        .min(0, "Cost cannot be negative")
        .default(0),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const deductStockSchema = z.object({
    quantity: z
        .number({ coerce: true })
        .positive("Deduction quantity must be positive"),
    reason: z
        .string()
        .max(500)
        .optional(),
});

export type CreateInventoryInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventoryItemSchema>;
export type DeductStockInput = z.infer<typeof deductStockSchema>;
