import { Schema, model, models, Document } from 'mongoose';

export interface IJournalEntryLine {
    ledger_id: string; // Ref: Ledger
    debit_amount: number;
    credit_amount: number;
    party_id?: string;
    narration?: string;
}

export interface IJournalEntry extends Document {
    entry_number: string;
    entry_date: Date;
    voucher_type: 'Sales' | 'Purchase' | 'Receipt' | 'Payment' | 'Journal' | 'Contra' | 'Credit Note' | 'Debit Note';

    // Source document
    reference_type?: string;
    reference_id?: string;

    narration?: string;
    total_amount: number;

    lines: IJournalEntryLine[]; // Embedded lines to ensure transaction consistency

    is_posted: boolean;
    organizationId: string;
    created_by: string; // User ID
    createdAt: Date;
    updatedAt: Date;
}

const JournalEntryLineSchema = new Schema<IJournalEntryLine>({
    ledger_id: { type: String, required: true },
    debit_amount: { type: Number, default: 0 },
    credit_amount: { type: Number, default: 0 },
    party_id: String,
    narration: String,
});

const JournalEntrySchema = new Schema<IJournalEntry>({
    entry_number: { type: String, required: true },
    entry_date: { type: Date, required: true, index: true },
    voucher_type: {
        type: String,
        enum: ['Sales', 'Purchase', 'Receipt', 'Payment', 'Journal', 'Contra', 'Credit Note', 'Debit Note'],
        required: true
    },

    reference_type: String,
    reference_id: { type: String, index: true },

    narration: String,
    total_amount: { type: Number, required: true },

    lines: { type: [JournalEntryLineSchema], required: true },

    is_posted: { type: Boolean, default: true },

    organizationId: { type: String, required: true, index: true },
    created_by: { type: String, required: true },
}, {
    timestamps: true
});

JournalEntrySchema.index({ organizationId: 1, entry_number: 1 }, { unique: true });

export const JournalEntry = models.JournalEntry || model<IJournalEntry>('JournalEntry', JournalEntrySchema);
