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
