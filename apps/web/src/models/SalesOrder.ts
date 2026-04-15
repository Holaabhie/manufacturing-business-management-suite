import { Schema, model, models, Document } from 'mongoose';

export interface ISalesOrderItem {
    item_id: string; // Ref: Item or Inventory
    item_name: string;
    description?: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;

    // Discount
    discount_type?: 'Percentage' | 'Fixed';
    discount_value: number;
    discount_amount: number;

    // Tax Breakup (computed per item)
    taxable_amount: number;
    cgst_rate: number;
    cgst_amount: number;
    sgst_rate: number;
    sgst_amount: number;
    igst_rate: number;
    igst_amount: number;
    cess_rate: number;
    cess_amount: number;

    total_amount: number;
}

export interface ISalesOrder extends Document {
    order_number: string;
    order_date: Date;
    reference_number?: string;

    // Party
    customer_id: string; // Ref: Party
    billing_address?: string;
    shipping_address?: string;

    // Items
    order_items: ISalesOrderItem[];

    // Commercial
    subtotal: number;
    discount_type?: 'Percentage' | 'Fixed';
    discount_value: number;
    discount_amount: number;
    taxable_amount: number;

    // Tax Breakdown (GST — Tally parity)
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    cess_amount: number;
    total_tax: number;

    // Extras
    shipping_charges: number;
    round_off: number;

    // Total
    grand_total: number;
    amount_in_words?: string;

    // Payment Tracking (computed)
    total_paid: number;
    balance_due: number;
    payment_status: 'Unpaid' | 'Partial' | 'Paid' | 'Overdue' | 'Partially Overdue' | 'Overpaid' | 'Refunded';
    payment_due_date?: Date;
    is_overdue: boolean;
    last_payment_date?: Date;

    // Delivery Tracking
    delivery_status: 'Not Shipped' | 'Partial' | 'Shipped' | 'Delivered' | 'Returned';
    expected_delivery?: Date;

    // Status
    order_status: 'Draft' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'On Hold';

    // Metadata
    notes?: string;
    terms_conditions?: string;
    internal_notes?: string;
    attachment_urls?: string[];

    // Linked Documents
    quotation_id?: string;

    // Audit
    organizationId: string;
    created_by: string;
    approved_by?: string;
    cancelled_by?: string;
    cancelled_reason?: string;

    createdAt: Date;
    updatedAt: Date;
}

const SalesOrderItemSchema = new Schema<ISalesOrderItem>({
    item_id: { type: String, required: true },
    item_name: { type: String, required: true },
    description: String,
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true },

    discount_type: { type: String, enum: ['Percentage', 'Fixed'] },
    discount_value: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },

    taxable_amount: { type: Number, default: 0 },
    cgst_rate: { type: Number, default: 0 },
    cgst_amount: { type: Number, default: 0 },
    sgst_rate: { type: Number, default: 0 },
    sgst_amount: { type: Number, default: 0 },
    igst_rate: { type: Number, default: 0 },
    igst_amount: { type: Number, default: 0 },
    cess_rate: { type: Number, default: 0 },
    cess_amount: { type: Number, default: 0 },

    total_amount: { type: Number, required: true },
});

const SalesOrderSchema = new Schema<ISalesOrder>({
    order_number: { type: String, required: true },
    order_date: { type: Date, required: true, index: true },
    reference_number: String,

    customer_id: { type: String, required: true, index: true },
    billing_address: String,
    shipping_address: String,

    order_items: [SalesOrderItemSchema],

    subtotal: { type: Number, default: 0 },
    discount_type: { type: String, enum: ['Percentage', 'Fixed'] },
    discount_value: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    taxable_amount: { type: Number, default: 0 },

    cgst_amount: { type: Number, default: 0 },
    sgst_amount: { type: Number, default: 0 },
    igst_amount: { type: Number, default: 0 },
    cess_amount: { type: Number, default: 0 },
    total_tax: { type: Number, default: 0 },

    shipping_charges: { type: Number, default: 0 },
    round_off: { type: Number, default: 0 },

    grand_total: { type: Number, default: 0 },
    amount_in_words: String,

    total_paid: { type: Number, default: 0 },
    balance_due: { type: Number, default: 0 },
    payment_status: { type: String, default: 'Unpaid' },
    payment_due_date: Date,
    is_overdue: { type: Boolean, default: false },
    last_payment_date: Date,

    delivery_status: { type: String, enum: ['Not Shipped', 'Partial', 'Shipped', 'Delivered', 'Returned'], default: 'Not Shipped' },
    expected_delivery: Date,

    order_status: { type: String, enum: ['Draft', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'On Hold'], default: 'Draft', index: true },

    notes: String,
    terms_conditions: String,
    internal_notes: String,
    attachment_urls: [String],

    quotation_id: String,

    organizationId: { type: String, required: true, index: true },
    created_by: { type: String, required: true },
    approved_by: String,
    cancelled_by: String,
    cancelled_reason: String,
}, {
    collection: 'orders',
    timestamps: true
});

SalesOrderSchema.index({ organizationId: 1, order_number: 1 }, { unique: true });

export const SalesOrder = models.SalesOrder || model<ISalesOrder>('SalesOrder', SalesOrderSchema);
