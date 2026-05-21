import { Schema, model, models, Document } from 'mongoose';

export interface ICompanyProfile extends Document {
    company_name: string;
    trade_name?: string;
    logo_url?: string;
    favicon_url?: string;

    // Registration & Compliance
    gst_number?: string;
    pan_number?: string;
    cin_number?: string;
    udyam_number?: string;
    msme_category?: 'Micro' | 'Small' | 'Medium' | 'Large';
    incorporation_date?: Date;

    // Address — Registered
    reg_address_line_1?: string;
    reg_address_line_2?: string;
    reg_city?: string;
    reg_state?: string;
    reg_pincode?: string;
    reg_country?: string;

    // Address — Factory/Operational
    factory_address_line_1?: string;
    factory_address_line_2?: string;
    factory_city?: string;
    factory_state?: string;
    factory_pincode?: string;

    // Contact
    primary_phone?: string;
    secondary_phone?: string;
    primary_email?: string;
    support_email?: string;
    website?: string;

    // Business Configuration
    industry_type?: string;
    business_type?: 'Manufacturer' | 'Trader' | 'Service' | 'Retailer' | 'Wholesaler' | 'Distributor' | 'Other';
    business_types?: string[];
    active_modules?: string[];
    default_currency: string;
    financial_year_start: 'January' | 'April';

    // Tally/Zoho Parity: Tax Configuration
    tax_regime?: 'Regular' | 'Composition' | 'Unregistered';
    default_tax_rate: number;
    tds_applicable: boolean;
    tcs_applicable: boolean;
    reverse_charge_liable: boolean;

    // Branding
    brand_primary_color: string;
    brand_secondary_color: string;
    brand_accent_color: string;

    // Document Preferences
    invoice_prefix: string;
    order_prefix: string;
    purchase_prefix: string;
    quotation_prefix: string;
    invoice_terms?: string;
    default_payment_terms: number;

    // Banking (Primary)
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    bank_branch?: string;
    upi_id?: string;

    // Tally Prime Integration
    tally_company_name?: string;
    tally_bridge_url?: string;
    tally_auth_token?: string;

    // System
    organizationId: string; // Linking to multitenant org
    is_onboarding_complete: boolean;
    onboarding_step: number;
    completed_by_user_id?: string;

    createdAt: Date;
    updatedAt: Date;
}

const CompanyProfileSchema = new Schema<ICompanyProfile>({
    company_name: { type: String, required: true },
    trade_name: String,
    logo_url: String,
    favicon_url: String,

    gst_number: String,
    pan_number: String,
    cin_number: String,
    udyam_number: String,
    msme_category: { type: String, enum: ['Micro', 'Small', 'Medium', 'Large'] },
    incorporation_date: Date,

    reg_address_line_1: String,
    reg_address_line_2: String,
    reg_city: String,
    reg_state: String,
    reg_pincode: String,
    reg_country: { type: String, default: 'India' },

    factory_address_line_1: String,
    factory_address_line_2: String,
    factory_city: String,
    factory_state: String,
    factory_pincode: String,

    primary_phone: String,
    secondary_phone: String,
    primary_email: String,
    support_email: String,
    website: String,

    industry_type: String,
    business_type: {
        type: String,
        enum: ['Manufacturer', 'Trader', 'Service', 'Retailer', 'Wholesaler', 'Distributor', 'Other']
    },
    business_types: [{ type: String }],
    active_modules: [{ type: String }],
    default_currency: { type: String, default: 'INR' },
    financial_year_start: { type: String, enum: ['January', 'April'], default: 'April' },

    tax_regime: { type: String, enum: ['Regular', 'Composition', 'Unregistered'], default: 'Regular' },
    default_tax_rate: { type: Number, default: 18.00 },
    tds_applicable: { type: Boolean, default: false },
    tcs_applicable: { type: Boolean, default: false },
    reverse_charge_liable: { type: Boolean, default: false },

    brand_primary_color: { type: String, default: '#2563EB' },
    brand_secondary_color: { type: String, default: '#1E40AF' },
    brand_accent_color: { type: String, default: '#F59E0B' },

    invoice_prefix: { type: String, default: 'INV-' },
    order_prefix: { type: String, default: 'ORD-' },
    purchase_prefix: { type: String, default: 'PO-' },
    quotation_prefix: { type: String, default: 'QTN-' },
    invoice_terms: String,
    default_payment_terms: { type: Number, default: 30 },

    bank_name: String,
    bank_account_number: String,
    bank_ifsc: String,
    bank_branch: String,
    upi_id: String,

    // Tally Prime Integration
    tally_company_name: String,
    tally_bridge_url: { type: String, default: 'http://localhost:4567' },
    tally_auth_token: String,

    organizationId: { type: String, required: true, index: true },
    is_onboarding_complete: { type: Boolean, default: false },
    onboarding_step: { type: Number, default: 0 },
    completed_by_user_id: String,
}, {
    timestamps: true
});

CompanyProfileSchema.index({ organizationId: 1 }, { unique: true });

export const CompanyProfile = models.CompanyProfile || model<ICompanyProfile>('CompanyProfile', CompanyProfileSchema);
