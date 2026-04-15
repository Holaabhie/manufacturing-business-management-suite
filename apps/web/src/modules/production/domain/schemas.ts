import { z } from "zod";

const materialSchema = z.object({
    inventoryId: z.string().min(1),
    name: z.string().min(1),
    quantityUsed: z.coerce.number().positive(),
    unit: z.string().optional(),
});

export const createProductionSchema = z.object({
    orderId: z.string().min(1, "Order ID required"),
    orderProductName: z.string().min(1).max(300).trim(),
    orderQuantity: z.coerce.number().positive(),
    clientName: z.string().max(300).trim(),
    deliveryDate: z.string().optional().nullable(),
    batchNumber: z.string().optional(),
    materials: z.array(materialSchema).optional().default([]),
    machineId: z.string().optional().default(""),
    machineName: z.string().optional().default(""),
    operatorId: z.string().optional().default(""),
    operatorName: z.string().optional().default(""),
    expectedOutput: z.coerce.number().positive("Expected output required"),
    startTime: z.string().min(1, "Start time required"),
    shift: z.enum(["morning", "afternoon", "night"]).optional().default("morning"),
    targetCompletion: z.string().min(1, "Target completion required"),
    notes: z.string().max(2000).optional().default(""),
});

export const updateProductionSchema = z.object({
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
    producedQuantity: z.coerce.number().min(0).optional(),
    rejectQuantity: z.coerce.number().min(0).optional(),
    progressPercent: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().max(2000).optional(),
});

export type CreateProductionInput = z.infer<typeof createProductionSchema>;
export type UpdateProductionInput = z.infer<typeof updateProductionSchema>;
