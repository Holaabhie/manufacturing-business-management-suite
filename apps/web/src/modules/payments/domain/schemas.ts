import { z } from "zod";

export const createPaymentSchema = z.object({
    amount: z.coerce.number().positive("Amount must be positive"),
    payment_date: z.string().optional().nullable(),
    payment_method: z.string().optional().default("cash"),
    notes: z.string().max(2000).optional().default(""),
    client_id: z.string().optional().nullable(),
    order_id: z.string().optional().nullable(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
