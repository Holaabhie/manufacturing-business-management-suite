import { Schema, model, models, Document } from 'mongoose';
import type { PermissionMap } from '@/lib/permissions';

export interface IPermissionTemplate extends Document {
    name: string;
    description: string;
    organizationId: string;
    permissions: PermissionMap;
    isDefault: boolean; // System-provided template (cannot be deleted)
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const PermissionTemplateSchema = new Schema<IPermissionTemplate>({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    organizationId: {
        type: String,
        required: true,
        index: true,
    },
    permissions: {
        type: Schema.Types.Mixed,
        required: true,
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

// Compound index for org + name uniqueness
PermissionTemplateSchema.index(
    { organizationId: 1, name: 1 },
    { unique: true }
);

export const PermissionTemplate =
    models.PermissionTemplate ||
    model<IPermissionTemplate>('PermissionTemplate', PermissionTemplateSchema);
