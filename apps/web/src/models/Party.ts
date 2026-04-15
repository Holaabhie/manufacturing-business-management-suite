import { Schema, model, models, Document } from 'mongoose';

export interface IParty extends Document {
    party_code: string;
    party_name: string;
    trade_name?: string;
    party_type: 'Customer' | 'Supplier' | 'Both';

    // Contact
    contact_person?: string;
    phone_primary?: string;
    phone_secondary?: string;
    email?: string;
    website?: string;

    // Address — Billing
    billing_address_1?: string;
    billing_address_2?: string;
    billing_city?: string;
    billing_state?: string;
    billing_pincode?: string;
    billing_country: string;

    // Address — Shipping
    shipping_address_1?: string;
    shipping_address_2?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_pincode?: string;
    shipping_country: string;

    // Tax & Compliance
    gst_number?: string;
    gst_type: 'Registered' | 'Unregistered' | 'Composition' | 'SEZ' | 'Overseas' | 'UIN';
    pan_number?: string;
    tds_applicable: boolean;
    tds_section?: string;
    tds_rate: number;

    // Commercial Terms
    credit_limit: number;
    credit_days: number;
    price_list_id?: string;
    discount_percentage: number;

    // Balances
    opening_balance: number;
    current_balance: number;
    total_business: number;

    // Status
    status: 'Active' | 'Inactive' | 'Blocked';

    notes?: string;
    tags?: string;

    organizationId: string;
    created_by: string; // User ID
    createdAt: Date;
    updatedAt: Date;
}

const PartySchema = new Schema<IParty>({
    party_code: { type: String, required: true },
    party_name: { type: String, required: true },
    trade_name: String,
    party_type: { type: String, enum: ['Customer', 'Supplier', 'Both'], required: true },

    contact_person: String,
    phone_primary: String,
    phone_secondary: String,
    email: String,
    website: String,

    billing_address_1: String,
    billing_address_2: String,
    billing_city: String,
    billing_state: String,
    billing_pincode: String,
    billing_country: { type: String, default: 'India' },

    shipping_address_1: String,
    shipping_address_2: String,
    shipping_city: String,
    shipping_state: String,
    shipping_pincode: String,
    shipping_country: { type: String, default: 'India' },

    gst_number: String,
    gst_type: { type: String, enum: ['Registered', 'Unregistered', 'Composition', 'SEZ', 'Overseas', 'UIN'], default: 'Registered' },
    pan_number: String,
    tds_applicable: { type: Boolean, default: false },
    tds_section: String,
    tds_rate: { type: Number, default: 0 },

    credit_limit: { type: Number, default: 0 },
    credit_days: { type: Number, default: 30 },
    price_list_id: String,
    discount_percentage: { type: Number, default: 0 },

    opening_balance: { type: Number, default: 0 },
    current_balance: { type: Number, default: 0 },
    total_business: { type: Number, default: 0 },

    status: { type: String, enum: ['Active', 'Inactive', 'Blocked'], default: 'Active' },

    notes: String,
    tags: String,

    organizationId: { type: String, required: true, index: true },
    created_by: { type: String, required: true },
}, {
    timestamps: true
});

PartySchema.index({ organizationId: 1, party_code: 1 }, { unique: true });
// Ensure search efficiency
PartySchema.index({ organizationId: 1, party_name: 'text', trade_name: 'text', contact_person: 'text', party_code: 'text' });

export const Party = models.Party || model<IParty>('Party', PartySchema);
