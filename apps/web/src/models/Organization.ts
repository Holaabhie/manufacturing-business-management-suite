import { Schema, model, models, Document } from 'mongoose';

export interface IOrganization extends Document {
    // Core identity
    name: string;
    slug: string;
    masterKey: string; // Hashed master key for admin login verification

    // Branding
    logoUrl?: string;
    primaryColor?: string;

    // Business details
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    pan?: string;
    website?: string;
    industry?: string;

    // Security settings
    settings: {
        // Password policy
        passwordMinLength: number;
        passwordRequireUppercase: boolean;
        passwordRequireNumber: boolean;
        passwordRequireSpecial: boolean;
        passwordExpiryDays: number; // 0 = never expires

        // OTP settings
        staffOtpRequired: boolean;
        otpExpiryMinutes: number;
        maxOtpResendAttempts: number;

        // Session settings
        adminSessionTimeoutMinutes: number;
        staffSessionTimeoutMinutes: number;
        idleTimeoutMinutes: number;
        singleSessionEnforcement: boolean;

        // Login security
        adminMaxFailedAttempts: number;
        staffMaxFailedAttempts: number;
        adminLockoutMinutes: number;
        staffLockoutMinutes: number;

        // Data controls
        maxExportsPerDay: number;
        exportWatermark: boolean;

        // Notifications
        emailNotificationsEnabled: boolean;
        securityAlerts: boolean;
    };

    // Subscription
    subscriptionTier: 'starter' | 'pro' | 'enterprise';
    subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled';

    // Metadata
    createdBy: string; // User ID of the founding admin
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const DEFAULT_SETTINGS = {
    // Password policy
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: false,
    passwordExpiryDays: 0,

    // OTP settings
    staffOtpRequired: true,
    otpExpiryMinutes: 5,
    maxOtpResendAttempts: 3,

    // Session settings
    adminSessionTimeoutMinutes: 60,
    staffSessionTimeoutMinutes: 30,
    idleTimeoutMinutes: 30,
    singleSessionEnforcement: false,

    // Login security
    adminMaxFailedAttempts: 5,
    staffMaxFailedAttempts: 5,
    adminLockoutMinutes: 15,
    staffLockoutMinutes: 30,

    // Data controls
    maxExportsPerDay: 50,
    exportWatermark: false,

    // Notifications
    emailNotificationsEnabled: true,
    securityAlerts: true,
};

const OrganizationSchema = new Schema<IOrganization>({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    masterKey: {
        type: String,
        required: true,
    },

    // Branding
    logoUrl: String,
    primaryColor: { type: String, default: '#4f46e5' },

    // Business details
    address: String,
    phone: String,
    email: { type: String, lowercase: true, trim: true },
    gstin: String,
    pan: String,
    website: String,
    industry: String,

    // Security settings
    settings: {
        type: Object,
        default: DEFAULT_SETTINGS,
    },

    // Subscription
    subscriptionTier: {
        type: String,
        enum: ['starter', 'pro', 'enterprise'],
        default: 'starter',
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'trialing', 'past_due', 'canceled'],
        default: 'active',
    },

    // Metadata
    createdBy: { type: String, required: true },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
});

// Indexes
OrganizationSchema.index({ slug: 1 }, { unique: true });
OrganizationSchema.index({ createdBy: 1 });
OrganizationSchema.index({ isActive: 1 });

export { DEFAULT_SETTINGS as ORG_DEFAULT_SETTINGS };
export const Organization = models.Organization || model<IOrganization>('Organization', OrganizationSchema);
