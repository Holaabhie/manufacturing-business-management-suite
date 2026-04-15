import { Schema, model, models, Document } from 'mongoose';

export interface ILedgerGroup extends Document {
    name: string;
    parent_id?: string;
    nature: 'Assets' | 'Liabilities' | 'Income' | 'Expense';
    is_system: boolean;
    affects_gross_profit: boolean;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
}

const LedgerGroupSchema = new Schema<ILedgerGroup>({
    name: { type: String, required: true },
    parent_id: String,
    nature: { type: String, enum: ['Assets', 'Liabilities', 'Income', 'Expense'], required: true },
    is_system: { type: Boolean, default: false },
    affects_gross_profit: { type: Boolean, default: false },
    organizationId: { type: String, required: true, index: true },
}, {
    timestamps: true
});

LedgerGroupSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const LedgerGroup = models.LedgerGroup || model<ILedgerGroup>('LedgerGroup', LedgerGroupSchema);

export interface ILedger extends Document {
    name: string;
    ledger_group_id: string; // Ref: LedgerGroup

    // Linked party (if applicable)
    party_id?: string;

    // Linked bank (if applicable)
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;

    opening_balance: number;
    balance_type: 'Debit' | 'Credit';
    current_balance: number;

    is_system: boolean;
    is_active: boolean;

    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
}

const LedgerSchema = new Schema<ILedger>({
    name: { type: String, required: true },
    ledger_group_id: { type: String, required: true, index: true },

    party_id: String,

    bank_name: String,
    account_number: String,
    ifsc_code: String,

    opening_balance: { type: Number, default: 0 },
    balance_type: { type: String, enum: ['Debit', 'Credit'], default: 'Debit' },
    current_balance: { type: Number, default: 0 },

    is_system: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },

    organizationId: { type: String, required: true, index: true },
}, {
    timestamps: true
});

LedgerSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Ledger = models.Ledger || model<ILedger>('Ledger', LedgerSchema);
