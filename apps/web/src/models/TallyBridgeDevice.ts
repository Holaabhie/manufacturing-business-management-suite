/**
 * TallyBridgeDevice — Mongoose Model
 * ─────────────────────────────────────────────────────────
 * Represents a paired Tally bridge desktop app instance.
 *
 * Security:
 * - Only the SHA-256 hash of the bearer token is stored.
 * - tokenHash is NEVER returned in any API response.
 * - Revocation is soft (revokedAt set, token becomes invalid).
 */

import { Schema, model, models, type Document } from "mongoose";

export interface ITallyBridgeDevice extends Document {
    organizationId: string;
    name: string;
    tokenHash: string;        // SHA-256 hex digest of "tbr_..." token
    platform: string;         // "win32", "darwin", "linux"
    appVersion: string;
    createdAt: Date;
    lastSeenAt: Date;
    revokedAt?: Date;
    tally: {
        reachable: boolean;
        host: string;
        port: number;
        companies: string[];
        activeCompany?: string;
        lastError?: string;
    };
}

const TallyBridgeDeviceSchema = new Schema<ITallyBridgeDevice>(
    {
        organizationId: { type: String, required: true },
        name: { type: String, required: true },
        tokenHash: { type: String, required: true },
        platform: { type: String, required: true },
        appVersion: { type: String, required: true },
        createdAt: { type: Date, default: () => new Date() },
        lastSeenAt: { type: Date, default: () => new Date() },
        revokedAt: { type: Date, default: null },
        tally: {
            type: new Schema(
                {
                    reachable: { type: Boolean, default: false },
                    host: { type: String, default: "localhost" },
                    port: { type: Number, default: 9000 },
                    companies: {
                        type: [String],
                        default: [],
                        validate: {
                            validator: (v: string[]) => v.length <= 50,
                            message: "companies array capped at 50",
                        },
                    },
                    activeCompany: { type: String, default: null },
                    lastError: { type: String, default: null },
                },
                { _id: false },
            ),
            default: () => ({
                reachable: false,
                host: "localhost",
                port: 9000,
                companies: [],
            }),
        },
    },
    { timestamps: false },
);

// Token lookup (unique)
TallyBridgeDeviceSchema.index({ tokenHash: 1 }, { unique: true });

// Tenant-scoped queries
TallyBridgeDeviceSchema.index({ organizationId: 1 });

export const TallyBridgeDevice =
    models.TallyBridgeDevice ||
    model<ITallyBridgeDevice>("TallyBridgeDevice", TallyBridgeDeviceSchema);
