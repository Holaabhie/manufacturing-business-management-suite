import { z } from "zod";

export const challanItemSchema = z.object({
    description: z.string().min(1, "Item description is required").max(500),
    qty: z.coerce.number().positive("Quantity must be greater than 0"),
    unit: z.string().min(1, "Unit is required").max(20).default("pcs"),
    remarks: z.string().max(500).optional().default(""),
});

export const consigneeSnapshotSchema = z.object({
    name: z.string().min(1, "Consignee name is required").max(300).trim(),
    address: z.string().max(500).optional().default(""),
    phone: z.string().max(50).optional().default(""),
    gstin: z.string().max(20).optional().default(""),
});

export const createDeliveryChallanSchema = z.object({
    challan_number: z.string().max(50).optional(),
    challan_date: z.string().optional().default(() => new Date().toISOString().split("T")[0]),
    purpose: z.enum(["Sale", "Job Work", "Sample", "Other"]).default("Sale"),
    status: z.enum(["Draft", "Dispatched", "Delivered", "Returned", "Cancelled"]).optional().default("Draft"),
    client_id: z.string().nullable().optional(),
    consignee: consigneeSnapshotSchema.optional(),
    ship_to_address: z.string().max(500).optional(),
    order_id: z.string().nullable().optional(),
    items: z.array(challanItemSchema).default([]),
    transporter_name: z.string().max(200).optional().default(""),
    vehicle_no: z.string().max(50).optional().default(""),
    lr_number: z.string().max(100).optional().default(""),
    eway_bill_no: z.string().max(100).optional().default(""),
    dispatch_date: z.string().nullable().optional(),
    expected_delivery_date: z.string().nullable().optional(),
    delivered_date: z.string().nullable().optional(),
    notes: z.string().max(2000).optional().default(""),
});

export const updateDeliveryChallanSchema = z.object({
    challan_date: z.string().optional(),
    purpose: z.enum(["Sale", "Job Work", "Sample", "Other"]).optional(),
    client_id: z.string().nullable().optional(),
    consignee: consigneeSnapshotSchema.optional(),
    ship_to_address: z.string().max(500).optional(),
    order_id: z.string().nullable().optional(),
    items: z.array(challanItemSchema).min(1, "At least one item is required").optional(),
    transporter_name: z.string().max(200).optional(),
    vehicle_no: z.string().max(50).optional(),
    lr_number: z.string().max(100).optional(),
    eway_bill_no: z.string().max(100).optional(),
    dispatch_date: z.string().nullable().optional(),
    expected_delivery_date: z.string().nullable().optional(),
    delivered_date: z.string().nullable().optional(),
    notes: z.string().max(2000).optional(),
});

export const challanStatusTransitionSchema = z.object({
    status: z.enum(["Draft", "Dispatched", "Delivered", "Returned", "Cancelled"]),
});

export type CreateDeliveryChallanInput = z.infer<typeof createDeliveryChallanSchema>;
export type UpdateDeliveryChallanInput = z.infer<typeof updateDeliveryChallanSchema>;
