import { z } from "zod";

export const reminderTriggerTypeSchema = z.enum([
    "days_before_due",
    "on_due_date",
    "days_after_due",
]);

// In Phase 6a, ONLY 'email' is supported. Any other channel is rejected with 400.
export const reminderChannelSchema = z.literal("email");

export const createReminderRuleSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Rule name is required")
            .max(100, "Rule name cannot exceed 100 characters"),
        trigger_type: reminderTriggerTypeSchema,
        days: z
            .number()
            .int("Days must be an integer")
            .min(0, "Days must be 0 or greater"),
        channels: z
            .array(reminderChannelSchema)
            .min(1, "At least one channel must be selected"),
        min_outstanding_paise: z
            .number()
            .int("Minimum outstanding amount must be an integer paise")
            .min(0, "Minimum outstanding amount must be 0 or greater")
            .default(0),
        active: z.boolean().default(true),
    })
    .superRefine((data, ctx) => {
        if (data.trigger_type === "on_due_date" && data.days !== 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Days must be 0 for on_due_date trigger",
                path: ["days"],
            });
        }
    });

export const updateReminderRuleSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Rule name cannot be empty")
            .max(100, "Rule name cannot exceed 100 characters")
            .optional(),
        trigger_type: reminderTriggerTypeSchema.optional(),
        days: z
            .number()
            .int("Days must be an integer")
            .min(0, "Days must be 0 or greater")
            .optional(),
        channels: z
            .array(reminderChannelSchema)
            .min(1, "At least one channel must be selected")
            .optional(),
        min_outstanding_paise: z
            .number()
            .int("Minimum outstanding amount must be an integer paise")
            .min(0, "Minimum outstanding amount must be 0 or greater")
            .optional(),
        active: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.trigger_type === "on_due_date" && data.days !== undefined && data.days !== 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Days must be 0 for on_due_date trigger",
                path: ["days"],
            });
        }
    });

export type CreateReminderRuleInput = z.infer<typeof createReminderRuleSchema>;
export type UpdateReminderRuleInput = z.infer<typeof updateReminderRuleSchema>;
