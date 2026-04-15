/**
 * Employees Domain — Validation Schemas
 */

import { z } from "zod";

export const createEmployeeSchema = z.object({
    fullName: z
        .string()
        .min(2, "Employee name must be at least 2 characters")
        .max(200, "Name must be 200 characters or less")
        .trim(),
    email: z
        .string()
        .email("Invalid email address")
        .trim()
        .toLowerCase()
        .optional()
        .or(z.literal("")),
    phone: z.string().max(50).trim().optional().default(""),
    department: z.string().max(100).trim().optional().default("General"),
    designation: z.string().max(100).trim().optional().default(""),
    permissionTemplate: z.string().optional().default("operations"),
    customPermissions: z.record(z.record(z.boolean())).optional(),
});

export const updateEmployeeProfileSchema = z.object({
    fullName: z.string().min(2).max(200).trim().optional(),
    email: z.string().email().trim().toLowerCase().optional(),
    phone: z.string().max(50).trim().optional(),
    department: z.string().max(100).trim().optional(),
    designation: z.string().max(100).trim().optional(),
});

export const employeeActionSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("toggle_status") }),
    z.object({ action: z.literal("reset_password") }),
    z.object({ action: z.literal("unlock_account") }),
    z.object({ action: z.literal("terminate_sessions") }),
    z.object({
        action: z.literal("update_permissions"),
        templateId: z.string().optional(),
        permissions: z.record(z.record(z.boolean())).optional(),
    }),
    z.object({
        action: z.literal("update_profile"),
        fullName: z.string().min(2).max(200).trim().optional(),
        email: z.string().email().trim().toLowerCase().optional().or(z.literal("")),
        phone: z.string().max(50).trim().optional(),
        department: z.string().max(100).trim().optional(),
        designation: z.string().max(100).trim().optional(),
    }),
]);

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeProfileInput = z.infer<typeof updateEmployeeProfileSchema>;
export type EmployeeActionInput = z.infer<typeof employeeActionSchema>;
