import { z } from "zod";

// ─── Sales Order Line Item (advanced GST-aware format) ───────────
const salesOrderItemSchema = z.object({
    item_id: z.string().min(1, "Item required"),
    item_name: z.string(),
    description: z.string().optional(),
    quantity: z.coerce.number().positive(),
    unit: z.string(),
    rate: z.coerce.number().min(0),
    amount: z.coerce.number().min(0),

    discount_type: z.enum(['Percentage', 'Fixed']).optional(),
    discount_value: z.coerce.number().default(0),
    discount_amount: z.coerce.number().default(0),

    taxable_amount: z.coerce.number().default(0),
    cgst_rate: z.coerce.number().default(0),
    cgst_amount: z.coerce.number().default(0),
    sgst_rate: z.coerce.number().default(0),
    sgst_amount: z.coerce.number().default(0),
    igst_rate: z.coerce.number().default(0),
    igst_amount: z.coerce.number().default(0),
    cess_rate: z.coerce.number().default(0),
    cess_amount: z.coerce.number().default(0),

    total_amount: z.coerce.number().min(0),
});

// ─── Legacy Inventory Deduction Item (simple production flow) ────
const legacyOrderItemSchema = z.object({
    inventory_id: z.string().min(1, "Inventory item required"),
    quantity_deducted: z.coerce.number().positive("Quantity must be positive"),
});

// Accept either format in order_items
const orderItemSchema = z.union([salesOrderItemSchema, legacyOrderItemSchema]);

export const createOrderSchema = z.object({
    order_number: z.string().optional(),
    client_id: z.string().min(1, "Client is required"),
    order_date: z.string().optional(),

    // Items — accepts both legacy deduction items and full sales order items
    order_items: z.array(orderItemSchema).min(1, "At least one item required"),

    // Computed totals (all optional with defaults for legacy flow)
    subtotal: z.coerce.number().default(0),
    discount_type: z.enum(['Percentage', 'Fixed']).optional(),
    discount_value: z.coerce.number().default(0),
    discount_amount: z.coerce.number().default(0),
    taxable_amount: z.coerce.number().default(0),

    cgst_amount: z.coerce.number().default(0),
    sgst_amount: z.coerce.number().default(0),
    igst_amount: z.coerce.number().default(0),
    cess_amount: z.coerce.number().default(0),
    total_tax: z.coerce.number().default(0),

    shipping_charges: z.coerce.number().default(0),
    round_off: z.coerce.number().default(0),
    grand_total: z.coerce.number().min(0).optional(),

    // Status
    delivery_date: z.string().optional().nullable(),
    order_status: z.enum(['Draft', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'On Hold']).optional().default('Confirmed'),

    // Legacy fallback bindings (used by the production order form)
    product_name: z.string().optional(),
    quantity: z.coerce.number().optional(),
    unit: z.string().default('kg').optional(),
    material_source: z.enum(['own', 'client']).default('own').optional(),
    rate: z.coerce.number().optional(),
    total_amount: z.coerce.number().optional(),
    status: z.string().optional(),
    payment_status: z.string().optional(),
});

export const updateOrderSchema = createOrderSchema.partial();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
