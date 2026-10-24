/**
 * Rate Limiter — In-memory sliding window implementation
 *
 * Uses a Map of IP → { count, windowStart } entries.
 * Automatically cleans up stale entries every 5 minutes.
 *
 * For production at scale, swap the Map with Redis (same API shape).
 */

interface RateLimitEntry {
    count: number;
    windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// ─── Auto-cleanup stale entries ─────────────────────────────────
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    for (const [key, entry] of store) {
        if (now - entry.windowStart > windowMs * 2) {
            store.delete(key);
        }
    }
}

// ─── Rate limit configurations ──────────────────────────────────

export const RATE_LIMITS = {
    /** Login: 10 attempts per 15 minutes per IP */
    login: { windowMs: 15 * 60 * 1000, maxRequests: 10 },

    /** Registration: 3 registrations per 60 minutes per IP */
    register: { windowMs: 60 * 60 * 1000, maxRequests: 3 },

    /** OTP send: 5 sends per 10 minutes per IP */
    otpSend: { windowMs: 10 * 60 * 1000, maxRequests: 5 },

    /** OTP verify: 10 attempts per 15 minutes */
    otpVerify: { windowMs: 15 * 60 * 1000, maxRequests: 10 },

    /** Password reset: 5 per 30 minutes */
    passwordReset: { windowMs: 30 * 60 * 1000, maxRequests: 5 },

    /** OTP resend cooldown: 1 request per 60 seconds per phone */
    otpCooldown: { windowMs: 60 * 1000, maxRequests: 1 },

    /** Per-identifier backstop: 30 attempts per hour across all IPs (triggers step-up, prevents lockout DoS) */
    loginBackstop: { windowMs: 60 * 60 * 1000, maxRequests: 30 },

    /** General API: 200 requests per 2 minutes */
    api: { windowMs: 2 * 60 * 1000, maxRequests: 200 },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Check if a request should be rate limited.
 *
 * @param key Unique identifier (usually IP + route)
 * @param type Rate limit configuration to apply
 * @returns { limited, remaining, retryAfterMs }
 */
export function checkRateLimit(
    key: string,
    type: RateLimitType
): {
    limited: boolean;
    remaining: number;
    retryAfterMs: number;
} {
    const config = RATE_LIMITS[type];
    const now = Date.now();

    cleanup(config.windowMs);

    const entry = store.get(key);

    if (!entry || now - entry.windowStart > config.windowMs) {
        // New window
        store.set(key, { count: 1, windowStart: now });
        return {
            limited: false,
            remaining: config.maxRequests - 1,
            retryAfterMs: 0,
        };
    }

    entry.count++;

    if (entry.count > config.maxRequests) {
        const retryAfterMs = config.windowMs - (now - entry.windowStart);
        return {
            limited: true,
            remaining: 0,
            retryAfterMs: Math.max(retryAfterMs, 0),
        };
    }

    return {
        limited: false,
        remaining: config.maxRequests - entry.count,
        retryAfterMs: 0,
    };
}

/**
 * Extract rate limit key from a Request.
 * Uses X-Forwarded-For, X-Real-IP, or falls back to "unknown".
 */
export function getRateLimitKey(req: Request, suffix: string): string {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded
        ? forwarded.split(",")[0]?.trim()
        : req.headers.get("x-real-ip") || "unknown";
    return `${ip}:${suffix}`;
}

/**
 * JSON response for rate-limited requests.
 */
export function rateLimitResponse(retryAfterMs: number) {
    const { NextResponse } = require("next/server");
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
        {
            error: "Too many requests. Please try again later.",
            retryAfter: retryAfterSec,
        },
        {
            status: 429,
            headers: {
                "Retry-After": String(retryAfterSec),
                "X-RateLimit-Remaining": "0",
            },
        }
    );
}

// ─── MongoDB-Backed Distributed Rate Limiter ────────────────────
let rateLimitIndexEnsured = false;

/**
 * Extract client IP from a Request using trusted hosting proxy headers.
 * Prioritizes non-spoofable edge headers (x-vercel-forwarded-for, x-real-ip),
 * and uses the rightmost hop of x-forwarded-for to prevent client header spoofing.
 */
export function getClientIpFromRequest(req: Request): string {
    // 1. Trusted Vercel Edge proxy header (set by Vercel edge, client cannot spoof)
    const vercelIp = req.headers.get("x-vercel-forwarded-for");
    if (vercelIp) {
        const first = vercelIp.split(",")[0]?.trim();
        if (first) return first;
    }

    // 2. Direct reverse proxy header (set by upstream nginx / reverse proxy)
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();

    // 3. Fallback: Rightmost entry of x-forwarded-for (added by nearest trusted proxy)
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
        const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
        if (parts.length > 0) {
            return parts[parts.length - 1];
        }
    }

    return "unknown";
}

/**
 * Generate a privacy-preserving rate limit key using SHA-256 hash.
 */
export function getHashedRateLimitKey(action: string, identifier: string): string {
    const crypto = require("crypto");
    const hash = crypto
        .createHash("sha256")
        .update(identifier.trim().toLowerCase())
        .digest("hex")
        .slice(0, 32);
    return `${action}:${hash}`;
}

/**
 * Check rate limit backed by MongoDB with atomic findOneAndUpdate and TTL index.
 * Falls back to in-memory checkRateLimit if database is unreachable.
 */
export async function checkRateLimitMongo(
    key: string,
    type: RateLimitType
): Promise<{
    limited: boolean;
    remaining: number;
    retryAfterMs: number;
}> {
    try {
        const { getDb } = await import("@/lib/mongodb");
        const db = await getDb();

        if (!rateLimitIndexEnsured) {
            db.collection("rate_limits")
                .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
                .catch(() => {});
            rateLimitIndexEnsured = true;
        }

        const config = RATE_LIMITS[type];
        const now = new Date();
        const expiresAt = new Date(now.getTime() + config.windowMs);

        // Try to increment existing active window
        const updated = await db.collection("rate_limits").findOneAndUpdate(
            { _id: key as any, expiresAt: { $gt: now } },
            { $inc: { count: 1 } },
            { returnDocument: "after" }
        );

        let doc: any = updated;

        if (!doc) {
            // Window expired or first request — upsert a new window
            try {
                await db.collection("rate_limits").updateOne(
                    { _id: key as any },
                    {
                        $set: { count: 1, expiresAt, updatedAt: now },
                        $setOnInsert: { createdAt: now },
                    },
                    { upsert: true }
                );
                return {
                    limited: false,
                    remaining: config.maxRequests - 1,
                    retryAfterMs: 0,
                };
            } catch {
                doc = await db.collection("rate_limits").findOneAndUpdate(
                    { _id: key as any },
                    { $inc: { count: 1 } },
                    { returnDocument: "after" }
                );
            }
        }

        if (!doc) {
            return checkRateLimit(key, type);
        }

        const count = doc.count || 1;
        if (count > config.maxRequests) {
            const docExpires = doc.expiresAt instanceof Date ? doc.expiresAt : new Date(doc.expiresAt);
            const retryAfterMs = Math.max(0, docExpires.getTime() - now.getTime());
            return {
                limited: true,
                remaining: 0,
                retryAfterMs,
            };
        }

        return {
            limited: false,
            remaining: Math.max(0, config.maxRequests - count),
            retryAfterMs: 0,
        };
    } catch {
        // Fall back gracefully to in-memory store
        return checkRateLimit(key, type);
    }
}
