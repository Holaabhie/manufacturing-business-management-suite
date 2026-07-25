import { z } from "zod";

export const createClientSchema = z.object({
    name: z.string().min(1, "Client name is required").max(300).trim(),
    email: z.string().email("Invalid email").trim().optional().or(z.literal("")),
    phone: z.string().max(50).trim().optional().default(""),
    address: z.string().max(500).trim().optional().default(""),
});

export const updateClientSchema = z.object({
    name: z.string().min(1).max(300).trim().optional(),
    email: z.string().email().trim().optional().or(z.literal("")),
    phone: z.string().max(50).trim().optional(),
    address: z.string().max(500).trim().optional(),
    avatarUrl: z.string().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const createClientProductSchema = z.object({
    name: z.string().min(1, "Product name is required").max(300).trim(),
    defaultRate: z.coerce.number().min(0).default(0),
});
export type CreateClientProductInput = z.infer<typeof createClientProductSchema>;

export const createClientProductMaterialSchema = z.object({
    name: z.string().min(1, "Material name is required").max(300).trim(),
    type: z.string().max(100).optional().default(""),
    defaultQty: z.coerce.number().min(0).default(0),
});
export type CreateClientProductMaterialInput = z.infer<typeof createClientProductMaterialSchema>;
