/**
 * withIdempotency — Next.js API Route Wrapper
 * ──────────────────────────────────────────────
 * Wraps a POST/PUT/PATCH handler with idempotency protection.
 *
 * Usage:
 *   export const POST = withIdempotency(async (request) => {
 *     // Your handler logic
 *     return NextResponse.json({ id: "123" });
 *   });
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { logger } from "@/infrastructure/logging/logger";
import {
    findIdempotencyKey,
    createIdempotencyKey,
    completeIdempotencyKey,
    deleteIdempotencyKey,
} from "@/lib/idempotency";

interface IdempotencyOptions {
    /** If true, the handler rejects requests without the header */
    required?: boolean;
    /** Extract user ID from the request. Default: checks custom session cookie. */
    getUserId?: (request: NextRequest) => Promise<string>;
}

/**
 * Hash a request body for fingerprinting.
 */
function hashBody(body: unknown): string | null {
    if (!body || (typeof body === "object" && Object.keys(body as object).length === 0)) {
        return null;
    }
    const sorted = JSON.stringify(body, Object.keys(body as object).sort());
    return crypto.createHash("sha256").update(sorted).digest("hex");
}

/**
 * Default user ID extractor — tries multiple auth mechanisms.
 */
async function defaultGetUserId(request: NextRequest): Promise<string> {
    // Try the custom session cookie
    const sessionCookie = request.cookies.get("session_id")?.value;
    if (sessionCookie) return sessionCookie;

    // Try Authorization header (Bearer token)
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice(7).substring(0, 32); // Use first 32 chars as user fingerprint
    }

    // Fallback: IP-based (not ideal, but prevents anonymous abuse)
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    return `anon_${ip}`;
}

/**
 * Wrap a Next.js API route handler with idempotency protection.
 */
export function withIdempotency(
    handler: (request: NextRequest) => Promise<NextResponse>,
    options: IdempotencyOptions = {},
) {
    const { required = false, getUserId = defaultGetUserId } = options;

    return async function idempotentHandler(request: NextRequest): Promise<NextResponse> {
        const idempotencyKey = request.headers.get("idempotency-key");

        // ── No key provided ─────────────────────────────────
        if (!idempotencyKey) {
            if (required) {
                return NextResponse.json(
                    {
                        error: "Missing Idempotency-Key header",
                        message: "This endpoint requires an Idempotency-Key header (UUID v4).",
                        code: "IDEMPOTENCY_KEY_REQUIRED",
                    },
                    { status: 400 },
                );
            }
            return handler(request);
        }

        // ── Validate UUID format ────────────────────────────
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(idempotencyKey)) {
            return NextResponse.json(
                {
                    error: "Invalid Idempotency-Key format",
                    message: "Must be a valid UUID v4.",
                    code: "IDEMPOTENCY_KEY_INVALID",
                },
                { status: 400 },
            );
        }

        const userId = await getUserId(request);

        try {
            // ── Check existing key ────────────────────────────
            const existing = await findIdempotencyKey(idempotencyKey, userId);

            if (existing) {
                if (existing.status === "completed") {
                    logger.debug('Idempotency cache hit', { key: idempotencyKey.slice(0, 8) });
                    return NextResponse.json(
                        { ...existing.responseBody, _idempotent: true },
                        { status: existing.statusCode },
                    );
                }

                if (existing.status === "processing") {
                    logger.warn('Idempotency concurrent request blocked', { key: idempotencyKey.slice(0, 8) });
                    return NextResponse.json(
                        {
                            error: "Request is already being processed",
                            code: "IDEMPOTENCY_CONCURRENT",
                        },
                        { status: 409 },
                    );
                }
            }

            // ── Lock as "processing" ──────────────────────────
            const clonedBody = await request.clone().json().catch(() => ({}));
            const requestHash = hashBody(clonedBody);

            const created = await createIdempotencyKey({
                key: idempotencyKey,
                userId,
                method: request.method,
                path: request.nextUrl.pathname,
                requestHash,
            });

            if (!created) {
                // Race condition — another request got there first
                return NextResponse.json(
                    {
                        error: "Duplicate submission detected",
                        code: "IDEMPOTENCY_DUPLICATE",
                    },
                    { status: 409 },
                );
            }

            // ── Execute the actual handler ────────────────────
            const response = await handler(request);

            // ── Cache the response ────────────────────────────
            try {
                const responseClone = response.clone();
                const responseBody = await responseClone.json().catch(() => ({}));
                await completeIdempotencyKey(
                    idempotencyKey,
                    userId,
                    response.status,
                    responseBody,
                );
            } catch {
                // Non-JSON response — still complete the key to prevent retries
                await completeIdempotencyKey(idempotencyKey, userId, response.status, {});
            }

            return response;
        } catch (err) {
            // Clean up on error
            await deleteIdempotencyKey(idempotencyKey, userId).catch(() => { });
            throw err;
        }
    };
}
