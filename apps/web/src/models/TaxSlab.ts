import { Schema, model, models, Document } from 'mongoose';

export interface ITaxSlab extends Document {
    name: string;
    rate: number;
    tax_type: 'GST' | 'IGST' | 'Cess' | 'TDS' | 'TCS' | 'Custom';
    is_active: boolean;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
}

const TaxSlabSchema = new Schema<ITaxSlab>({
    name: { type: String, required: true },
    rate: { type: Number, required: true },
    tax_type: {
        type: String,
        enum: ['GST', 'IGST', 'Cess', 'TDS', 'TCS', 'Custom'],
        default: 'GST'
    },
    is_active: { type: Boolean, default: true },
    organizationId: { type: String, required: true, index: true },
}, { timestamps: true });

TaxSlabSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const TaxSlab = models.TaxSlab || model<ITaxSlab>('TaxSlab', TaxSlabSchema);

// Unit of measure
export interface IUnitOfMeasure extends Document {
    name: string;
    symbol: string;
    category: 'Length' | 'Weight' | 'Volume' | 'Quantity' | 'Area' | 'Time' | 'Other';
    is_default: boolean;
    organizationId: string;
    createdAt: Date;
}

const UnitOfMeasureSchema = new Schema<IUnitOfMeasure>({
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    category: {
        type: String,
        enum: ['Length', 'Weight', 'Volume', 'Quantity', 'Area', 'Time', 'Other'],
        default: 'Quantity'
    },
    is_default: { type: Boolean, default: false },
    organizationId: { type: String, required: true, index: true },
}, { timestamps: true });

UnitOfMeasureSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const UnitOfMeasure = models.UnitOfMeasure || model<IUnitOfMeasure>('UnitOfMeasure', UnitOfMeasureSchema);
