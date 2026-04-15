import { Schema, model, models, Document } from 'mongoose';

export interface IPaymentTransaction extends Document {
    transaction_number: string;
    transaction_type: 'Receipt' | 'Payment' | 'Refund' | 'Adjustment';

    // Link to source
    reference_type: 'SalesOrder' | 'PurchaseOrder' | 'Invoice' | 'Bill' | 'Expense' | 'Other';
    reference_id: string; // ID of the referenced document

    // Party
    party_type: 'Customer' | 'Supplier' | 'Other';
    party_id: string; // ID of the Party

    // Amounts
    amount: number;
    currency: string;
    exchange_rate: number;
    amount_in_base: number;

    // TDS (Tally parity)
    tds_applicable: boolean;
    tds_section?: string;
    tds_rate: number;
    tds_amount: number;
    net_amount: number; // Final amount after TDS

    // Payment Details
    payment_mode: 'Cash' | 'Bank Transfer' | 'NEFT' | 'RTGS' | 'UPI' | 'Cheque' | 'Demand Draft' | 'Credit Card' | 'Debit Card' | 'Online' | 'Wallet' | 'Other';
    payment_date: Date;

    // Banking Details (for reconciliation)
    bank_name?: string;
    cheque_number?: string;
    cheque_date?: Date;
    transaction_ref?: string;
    utr_number?: string;

    // Status
    status: 'Completed' | 'Pending Clearance' | 'Bounced' | 'Cancelled';
    clearance_date?: Date;

    // Metadata
    notes?: string;
    attachment_url?: string;
    recorded_by: string; // User ID
    approved_by?: string; // User ID

    // Accounting (Tally parity)
    debit_ledger_id?: string;
    credit_ledger_id?: string;

    // Deletion tracking
    is_deleted: boolean;
    deleted_at?: Date;
    deleted_by?: string;

    organizationId: string;

    createdAt: Date;
    updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>({
    transaction_number: { type: String, required: true, unique: true },
    transaction_type: { type: String, enum: ['Receipt', 'Payment', 'Refund', 'Adjustment'], required: true },

    reference_type: { type: String, enum: ['SalesOrder', 'PurchaseOrder', 'Invoice', 'Bill', 'Expense', 'Other'], required: true },
    reference_id: { type: String, required: true, index: true },

    party_type: { type: String, enum: ['Customer', 'Supplier', 'Other'], required: true },
    party_id: { type: String, required: true, index: true },

    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    exchange_rate: { type: Number, default: 1.0000 },
    amount_in_base: { type: Number, required: true },

    tds_applicable: { type: Boolean, default: false },
    tds_section: String,
    tds_rate: { type: Number, default: 0 },
    tds_amount: { type: Number, default: 0 },
    net_amount: { type: Number, required: true },

    payment_mode: { type: String, enum: ['Cash', 'Bank Transfer', 'NEFT', 'RTGS', 'UPI', 'Cheque', 'Demand Draft', 'Credit Card', 'Debit Card', 'Online', 'Wallet', 'Other'], required: true },
    payment_date: { type: Date, required: true, index: true },

    bank_name: String,
    cheque_number: String,
    cheque_date: Date,
    transaction_ref: String,
    utr_number: String,

    status: { type: String, enum: ['Completed', 'Pending Clearance', 'Bounced', 'Cancelled'], default: 'Completed' },
    clearance_date: Date,

    notes: String,
    attachment_url: String,
    recorded_by: { type: String, required: true },
    approved_by: String,

    debit_ledger_id: String,
    credit_ledger_id: String,

    is_deleted: { type: Boolean, default: false },
    deleted_at: Date,
    deleted_by: String,

    organizationId: { type: String, required: true, index: true },
}, {
    timestamps: true
});

export const PaymentTransaction = models.PaymentTransaction || model<IPaymentTransaction>('PaymentTransaction', PaymentTransactionSchema);
