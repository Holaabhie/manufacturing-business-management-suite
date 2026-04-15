/**
 * Idempotency Middleware — Express
 * ──────────────────────────────────
 * Production-grade idempotency protection for POST/PUT/PATCH requests.
 *
 * Usage:
 *   router.post('/api/invoices', idempotency, createInvoice);
 *
 * Flow:
 *   1. Client sends "Idempotency-Key: <uuid>" header
 *   2. Middleware checks MongoDB for existing key
 *   3. If key exists and completed → return cached response
 *   4. If key exists and processing → return 409 (concurrent)
 *   5. If key not found → lock it as "processing", proceed with next()
 *   6. After handler responds → cache the response under this key
 *
 * If no Idempotency-Key header is present, the request proceeds
 * normally (backward compatible, but unprotected).
 */

const crypto = require('crypto');
const IdempotencyKey = require('../models/IdempotencyKey');

// ── Configuration ─────────────────────────────────────────
const IDEMPOTENCY_HEADER = 'idempotency-key';
const KEY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a SHA-256 hash of the request body for fingerprinting.
 * This ensures the same key can't be reused with a different payload.
 */
function hashBody(body) {
    if (!body || Object.keys(body).length === 0) return null;
    const str = JSON.stringify(body, Object.keys(body).sort());
    return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Idempotency middleware factory.
 * 
 * @param {Object} options
 * @param {boolean} options.required     — If true, reject requests without the header (default: false)
 * @param {boolean} options.validateHash — If true, check body hash matches (default: true)
 */
function idempotency(options = {}) {
    const { required = false, validateHash = true } = options;

    return async function idempotencyMiddleware(req, res, next) {
        // Only apply to mutating methods
        if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
            return next();
        }

        const idempotencyKey = req.headers[IDEMPOTENCY_HEADER];

        // ── No key provided ───────────────────────────────
        if (!idempotencyKey) {
            if (required) {
                return res.status(400).json({
                    error: 'Missing Idempotency-Key header',
                    message: 'This endpoint requires an Idempotency-Key header (UUID v4) to prevent duplicate submissions.',
                    code: 'IDEMPOTENCY_KEY_REQUIRED',
                });
            }
            // Not required → proceed without protection
            return next();
        }

        // ── Validate UUID format ──────────────────────────
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(idempotencyKey)) {
            return res.status(400).json({
                error: 'Invalid Idempotency-Key format',
                message: 'Idempotency-Key must be a valid UUID v4.',
                code: 'IDEMPOTENCY_KEY_INVALID',
            });
        }

        // ── Extract user ID ───────────────────────────────
        // Works with JWT-decoded user or session user
        const userId = req.user?.id || req.user?._id?.toString() || req.session?.user?.email || 'anonymous';
        const requestHash = validateHash ? hashBody(req.body) : null;

        try {
            // ── Check for existing key ────────────────────
            const existing = await IdempotencyKey.findOne({
                key: idempotencyKey,
                userId,
            });

            if (existing) {
                // Validate that the body hasn't changed (optional)
                if (validateHash && requestHash && existing.requestHash && existing.requestHash !== requestHash) {
                    console.warn(
                        `[idempotency] Key reuse with different payload: key=${idempotencyKey} user=${userId}`
                    );
                    return res.status(422).json({
                        error: 'Idempotency key reused with different payload',
                        message: 'Each idempotency key must be used with the same request body.',
                        code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
                    });
                }

                if (existing.status === 'completed') {
                    // ✅ Return cached response
                    console.log(
                        `[idempotency] Returning cached response: key=${idempotencyKey} status=${existing.statusCode}`
                    );
                    return res.status(existing.statusCode).json({
                        ...existing.responseBody,
                        _idempotent: true, // Signal to client that this was a cached response
                    });
                }

                if (existing.status === 'processing') {
                    // ⏳ Another request with the same key is still processing
                    console.warn(
                        `[idempotency] Concurrent duplicate blocked: key=${idempotencyKey} user=${userId}`
                    );
                    return res.status(409).json({
                        error: 'Request is already being processed',
                        message: 'A request with this idempotency key is currently being processed. Please wait.',
                        code: 'IDEMPOTENCY_CONCURRENT',
                    });
                }
            }

            // ── Lock the key as "processing" ──────────────
            try {
                await IdempotencyKey.create({
                    key: idempotencyKey,
                    userId,
                    method: req.method,
                    path: req.originalUrl || req.path,
                    requestHash,
                    statusCode: 0,
                    responseBody: {},
                    status: 'processing',
                    expiresAt: new Date(Date.now() + KEY_TTL_MS),
                });
            } catch (createErr) {
                // Race condition: another process created the key between findOne and create
                if (createErr.code === 11000) {
                    console.warn(
                        `[idempotency] Race condition caught: key=${idempotencyKey} user=${userId}`
                    );
                    return res.status(409).json({
                        error: 'Duplicate submission detected',
                        message: 'This request has already been submitted.',
                        code: 'IDEMPOTENCY_DUPLICATE',
                    });
                }
                throw createErr;
            }

            // ── Intercept response to cache it ────────────
            const originalJson = res.json.bind(res);
            res.json = function (body) {
                // Cache the response asynchronously (don't block the response)
                IdempotencyKey.updateOne(
                    { key: idempotencyKey, userId },
                    {
                        statusCode: res.statusCode,
                        responseBody: body,
                        status: 'completed',
                    }
                ).catch((err) => {
                    console.error(`[idempotency] Failed to cache response: key=${idempotencyKey}`, err);
                });

                return originalJson(body);
            };

            // ── Proceed to the actual handler ─────────────
            next();
        } catch (err) {
            console.error('[idempotency] Middleware error:', err);

            // Clean up the processing key on error
            await IdempotencyKey.deleteOne({ key: idempotencyKey, userId }).catch(() => { });

            next(err);
        }
    };
}

module.exports = idempotency;
