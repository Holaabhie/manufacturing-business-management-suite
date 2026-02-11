import { Schema, model, models, Document } from 'mongoose';

export interface IInvitation extends Document {
    organizationId: string;

    // Staff details
    email: string;
    phone?: string;
    fullName: string;
    employeeId: string;
    department?: string;

    // Role & permissions
    role: 'Staff'; // Only Staff can be invited; Admin is set during org creation
    permissionTemplateId?: string;

    // Invitation details
    token: string;          // Unique invitation token for the accept link
    status: 'pending' | 'accepted' | 'expired' | 'revoked';

    // Tracking
    invitedBy: string;      // Admin user ID
    invitedByName: string;  // Admin name for display
    expiresAt: Date;
    acceptedAt?: Date;
    acceptedUserId?: string; // User ID created upon acceptance

    // Metadata
    temporaryPassword: string; // Hashed temporary password
    resendCount: number;
    lastResentAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>({
    organizationId: {
        type: String,
        required: true,
        index: true,
    },

    // Staff details
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    employeeId: {
        type: String,
        required: true,
        trim: true,
    },
    department: {
        type: String,
        trim: true,
    },

    // Role & permissions
    role: {
        type: String,
        enum: ['Staff'],
        default: 'Staff',
        required: true,
    },
    permissionTemplateId: String,

    // Invitation details
    token: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'expired', 'revoked'],
        default: 'pending',
        index: true,
    },

    // Tracking
    invitedBy: {
        type: String,
        required: true,
    },
    invitedByName: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    acceptedAt: Date,
    acceptedUserId: String,

    // Metadata
    temporaryPassword: {
        type: String,
        required: true,
    },
    resendCount: {
        type: Number,
        default: 0,
    },
    lastResentAt: Date,
}, {
    timestamps: true,
});

// Compound indexes
InvitationSchema.index({ organizationId: 1, status: 1 });
InvitationSchema.index({ organizationId: 1, email: 1 });
InvitationSchema.index({ token: 1 }, { unique: true });
InvitationSchema.index({ expiresAt: 1 });

export const Invitation =
    models.Invitation || model<IInvitation>('Invitation', InvitationSchema);
