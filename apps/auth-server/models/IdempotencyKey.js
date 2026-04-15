/**
 * IdempotencyKey Model — Mongoose
 * ─────────────────────────────────
 * Stores idempotency keys to prevent duplicate processing.
 *
 * How it works:
 *   1. Client sends a unique UUID in the "Idempotency-Key" header
 *   2. Before processing, the middleware checks if this key exists
 *   3. If found → return the cached response (no re-processing)
 *   4. If not found → process the request, store key + response
 *   5. Keys auto-expire after 24 hours via TTL index
 */

const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema(
    {
        // The unique key sent by the client (UUID v4)
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // Which user made this request (prevents cross-user key reuse)
        userId: {
            type: String,
            required: true,
            index: true,
        },

        // HTTP method + path for additional safety
        method: {
            type: String,
            required: true,
            uppercase: true,
        },
        path: {
            type: String,
            required: true,
        },

        // The cached response from the first successful processing
        statusCode: {
            type: Number,
            required: true,
        },
        responseBody: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },

        // Request fingerprint (hash of the payload) for extra validation
        requestHash: {
            type: String,
            default: null,
        },

        // Processing state to handle concurrent duplicate requests
        // 'processing' → first request is still being handled
        // 'completed'  → response is cached and ready to return
        status: {
            type: String,
            enum: ['processing', 'completed'],
            default: 'processing',
        },

        // Auto-cleanup: TTL index deletes docs after 24 hours
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
            index: { expires: 0 }, // TTL index — MongoDB auto-deletes at expiresAt
        },
    },
    {
        timestamps: true,
        collection: 'idempotency_keys',
    }
);

// Compound index for fast lookups
idempotencyKeySchema.index({ key: 1, userId: 1 }, { unique: true });

const IdempotencyKey = mongoose.model('IdempotencyKey', idempotencyKeySchema);

module.exports = IdempotencyKey;
