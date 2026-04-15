import { Schema, model, models, Document } from 'mongoose';

export interface IItem extends Document {
    item_code: string;
    item_name: string;
    item_description?: string;
    item_type: 'Goods' | 'Services';

    // Classification
    category_id?: string;
    sub_category_id?: string;
    brand?: string;

    // Units
    primary_unit: string;
    secondary_unit?: string;
    conversion_factor?: number;

    // Pricing
    selling_price: number;
    purchase_price: number;
    mrp?: number;
    min_selling_price?: number;

    // Tax
    hsn_code?: string;
    sac_code?: string;
    tax_rate: number;
    tax_inclusive: boolean;
    cess_rate: number;

    // Stock Tracking
    track_inventory: boolean;
    opening_stock: number;
    current_stock: number;
    min_stock_level: number;
    max_stock_level?: number;
    reorder_point?: number;
    reorder_quantity?: number;

    // Advanced Tracking
    track_batches: boolean;
    track_serial_numbers: boolean;
    track_expiry: boolean;

    image_url?: string;
    status: 'Active' | 'Inactive' | 'Discontinued';

    organizationId: string;
    created_by: string;
    createdAt: Date;
    updatedAt: Date;
}

const ItemSchema = new Schema<IItem>({
    item_code: { type: String, required: true },
    item_name: { type: String, required: true },
    item_description: String,
    item_type: { type: String, enum: ['Goods', 'Services'], default: 'Goods' },

    category_id: { type: String, index: true },
    sub_category_id: String,
    brand: String,

    primary_unit: { type: String, required: true, default: 'Pcs' },
    secondary_unit: String,
    conversion_factor: Number,

    selling_price: { type: Number, default: 0 },
    purchase_price: { type: Number, default: 0 },
    mrp: Number,
    min_selling_price: Number,

    hsn_code: { type: String, index: true },
    sac_code: String,
    tax_rate: { type: Number, default: 18.00 },
    tax_inclusive: { type: Boolean, default: false },
    cess_rate: { type: Number, default: 0 },

    track_inventory: { type: Boolean, default: true },
    opening_stock: { type: Number, default: 0 },
    current_stock: { type: Number, default: 0 },
    min_stock_level: { type: Number, default: 0 },
    max_stock_level: Number,
    reorder_point: Number,
    reorder_quantity: Number,

    track_batches: { type: Boolean, default: false },
    track_serial_numbers: { type: Boolean, default: false },
    track_expiry: { type: Boolean, default: false },

    image_url: String,
    status: { type: String, enum: ['Active', 'Inactive', 'Discontinued'], default: 'Active' },

    organizationId: { type: String, required: true, index: true },
    created_by: { type: String, required: true },
}, {
    collection: 'inventory',
    timestamps: true
});

ItemSchema.index({ organizationId: 1, item_code: 1 }, { unique: true });
ItemSchema.index({ organizationId: 1, item_name: 'text', item_code: 'text', item_description: 'text' });

export const Item = models.Item || model<IItem>('Item', ItemSchema);
