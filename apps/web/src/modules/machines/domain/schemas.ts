/**
 * Machines Domain — Validation Schemas
 */

import { z } from "zod";

export const createMachineSchema = z.object({
    machineName: z
        .string()
        .min(1, "Machine name is required")
        .max(200, "Machine name must be 200 characters or less")
        .trim(),
    machineType: z.string().max(200).trim().optional().default(""),
    capacity: z.string().max(200).trim().optional().default(""),
});

export const updateMachineSchema = z.object({
    machineName: z
        .string()
        .min(1, "Machine name cannot be empty")
        .max(200)
        .trim()
        .optional(),
    machineType: z.string().max(200).trim().optional(),
    capacity: z.string().max(200).trim().optional(),
    status: z
        .enum(["active", "inactive", "maintenance"], {
            errorMap: () => ({
                message: "Invalid status. Must be active, inactive, or maintenance",
            }),
        })
        .optional(),
});

export type CreateMachineInput = z.infer<typeof createMachineSchema>;
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;
