/**
 * TallyPairingCode — Mongoose Model
 * ─────────────────────────────────────────────────────────
 * Short-lived pairing codes that allow a local Tally bridge
 * (Electron) to authenticate itself with the cloud.
 *
 * Security:
 * - Only the SHA-256 hash of the code is stored.
 * - TTL index auto-deletes expired codes (~60s after expiry).
 * - Per-IP rate limiting on the pair endpoint prevents brute force.
 */

import { Schema, model, models, type Document } from "mongoose";

export interface ITallyPairingCode extends Document {
    organizationId: string;
    codeHash: string;         // SHA-256 hex digest of the 8-char normalized code
    createdBy: string;        // userId who generated it
    expiresAt: Date;
    usedAt?: Date;            // Set atomically on successful pair
    failedAttempts: number;   // Schema field, unused (throttling via rate limiter)
}

const TallyPairingCodeSchema = new Schema<ITallyPairingCode>(
    {
        organizationId: { type: String, required: true, index: true },
        codeHash: { type: String, required: true },
        createdBy: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        usedAt: { type: Date, default: null },
        failedAttempts: { type: Number, default: 0 },
    },
    { timestamps: false },
);

// Unique lookup by hash
TallyPairingCodeSchema.index({ codeHash: 1 }, { unique: true });

// TTL — MongoDB automatically removes documents after expiresAt
TallyPairingCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TallyPairingCode =
    models.TallyPairingCode ||
    model<ITallyPairingCode>("TallyPairingCode", TallyPairingCodeSchema);
