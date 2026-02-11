import { Schema, model, models, Document } from 'mongoose';

export interface IAuditLog extends Document {
    // Identity
    organizationId: string;
    userId: string;
    userName: string;
    userRole: 'Admin' | 'Staff';

    // Action details
    action: string;           // Human-readable: "Created order", "Updated inventory"
    actionType: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'permission_change' | 'system' | 'security';
    module: string;            // Module affected: "orders", "inventory", "auth", etc.
    resourceId?: string;       // ID of the affected resource
    resourceType?: string;     // Type: "order", "inventory_item", "user", etc.

    // State tracking (for edits)
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;

    // Request context
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;       // "desktop", "mobile", "tablet"
    browser?: string;

    // Metadata
    severity: 'info' | 'warning' | 'critical';
    details?: string;          // Additional context

    // Timestamps
    timestamp: Date;
    createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
    organizationId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    userName: {
        type: String,
        required: true,
    },
    userRole: {
        type: String,
        enum: ['Admin', 'Staff'],
        required: true,
    },

    // Action details
    action: {
        type: String,
        required: true,
    },
    actionType: {
        type: String,
        enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'permission_change', 'system', 'security'],
        required: true,
        index: true,
    },
    module: {
        type: String,
        required: true,
        index: true,
    },
    resourceId: String,
    resourceType: String,

    // State tracking
    beforeState: Schema.Types.Mixed,
    afterState: Schema.Types.Mixed,

    // Request context
    ipAddress: String,
    userAgent: String,
    deviceType: String,
    browser: String,

    // Metadata
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info',
    },
    details: String,

    // Timestamps
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
    },
}, {
    timestamps: true,
});

// Compound indexes for efficient querying
AuditLogSchema.index({ organizationId: 1, timestamp: -1 });
AuditLogSchema.index({ organizationId: 1, userId: 1, timestamp: -1 });
AuditLogSchema.index({ organizationId: 1, module: 1, timestamp: -1 });
AuditLogSchema.index({ organizationId: 1, actionType: 1, timestamp: -1 });
AuditLogSchema.index({ organizationId: 1, severity: 1, timestamp: -1 });

// TTL index for automatic log cleanup (default: 365 days, configurable per org)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AuditLog =
    models.AuditLog || model<IAuditLog>('AuditLog', AuditLogSchema);
