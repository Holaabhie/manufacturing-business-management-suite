/**
 * Enterprise Rate Limiter for API v1 Routes
 * ─────────────────────────────────────────────────────────
 * Sliding-window rate limiting with configurable tiers.
 *
 * Features:
 * - Per-user + per-IP rate limiting
 * - Configurable windows and limits per route type
 * - Proper Retry-After headers
 * - Rate limit headers (X-RateLimit-*)
 * - In-memory store (swap to Redis for multi-instance deployments)
 *
 * Usage:
 *   import { withRateLimit } from "@/shared/middleware/rate-limiter";
 *
 *   export const GET = withRateLimit(
 *     withApiRoute(async (request) => { ... }),
 *     { tier: "standard" }
 *   );
 */

import { type NextRequest, NextResponse } from "next/server";
import { RateLimitError } from "@/shared/lib/errors";
import { envelope } from "@/shared/types/api";

// ─── Rate Limit Tiers ───────────────────────────────────────────

export interface RateLimitConfig {
    /** Maximum requests allowed in the window */
    maxRequests: number;
    /** Window duration in milliseconds */
    windowMs: number;
    /** Identifier: "ip" | "user" | "both" */
    identifyBy: "ip" | "user" | "both";
}

export const RATE_LIMIT_TIERS: Record<string, RateLimitConfig> = {
    /** Standard API routes — 100 req / 60s per user */
    standard: {
        maxRequests: 100,
        windowMs: 60_000,
        identifyBy: "both",
    },
    /** Auth endpoints — strict to prevent brute force: 10 req / 60s per IP */
    auth: {
        maxRequests: 10,
        windowMs: 60_000,
        identifyBy: "ip",
    },
    /** Write operations — moderate: 30 req / 60s per user */
    write: {
        maxRequests: 30,
        windowMs: 60_000,
        identifyBy: "both",
    },
    /** Read/list operations — generous: 200 req / 60s per user */
    read: {
        maxRequests: 200,
        windowMs: 60_000,
        identifyBy: "both",
    },
    /** Export/PDF generation — expensive: 5 req / 60s per user */
    expensive: {
        maxRequests: 5,
        windowMs: 60_000,
        identifyBy: "user",
    },
};

// ─── In-Memory Store ────────────────────────────────────────────

interface RateLimitEntry {
    tokens: number;
    lastRefill: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number): void {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    for (const [key, entry] of store.entries()) {
        if (now - entry.lastRefill > windowMs * 2) {
            store.delete(key);
        }
    }
}

// ─── Token Bucket Algorithm ─────────────────────────────────────

function checkLimit(
    identifier: string,
    config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetMs: number } {
    cleanup(config.windowMs);

    const now = Date.now();
    const entry = store.get(identifier);

    if (!entry || now - entry.lastRefill >= config.windowMs) {
        // New window — full tokens
        store.set(identifier, { tokens: config.maxRequests - 1, lastRefill: now });
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetMs: config.windowMs,
        };
    }

    if (entry.tokens > 0) {
        entry.tokens -= 1;
        return {
            allowed: true,
            remaining: entry.tokens,
            resetMs: config.windowMs - (now - entry.lastRefill),
        };
    }

    // Rate limited
    const resetMs = config.windowMs - (now - entry.lastRefill);
    return { allowed: false, remaining: 0, resetMs };
}

// ─── Identifier Extraction ──────────────────────────────────────

function getIp(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

function getUserId(request: NextRequest): string | null {
    const sessionCookie = request.cookies.get("session_id")?.value;
    return sessionCookie || null;
}

function buildIdentifier(
    request: NextRequest,
    config: RateLimitConfig,
    routeKey: string,
): string {
    const parts = [routeKey];

    if (config.identifyBy === "ip" || config.identifyBy === "both") {
        parts.push(`ip:${getIp(request)}`);
    }
    if (config.identifyBy === "user" || config.identifyBy === "both") {
        const userId = getUserId(request);
        if (userId) parts.push(`user:${userId}`);
        else parts.push(`ip:${getIp(request)}`);
    }

    return parts.join(":");
}

// ─── Middleware Wrapper ─────────────────────────────────────────

// ─── Middleware Wrapper ─────────────────────────────────────────

type RouteHandler<C = any> = (
    request: NextRequest,
    context: C,
) => Promise<NextResponse>;

interface RateLimitOptions {
    /** Rate limit tier name or custom config */
    tier?: string | RateLimitConfig;
    /** Custom route key for bucket isolation. Defaults to the request path. */
    routeKey?: string;
}

export function withRateLimit<C = any>(
    handler: RouteHandler<C>,
    options: RateLimitOptions = {},
): RouteHandler<C> {
    const config: RateLimitConfig =
        typeof options.tier === "string"
            ? RATE_LIMIT_TIERS[options.tier] || RATE_LIMIT_TIERS.standard
            : options.tier || RATE_LIMIT_TIERS.standard;

    return async function rateLimitedHandler(
        request: NextRequest,
        context: C,
    ): Promise<NextResponse> {
        const routeKey = options.routeKey || request.nextUrl.pathname;
        const identifier = buildIdentifier(request, config, routeKey);
        const result = checkLimit(identifier, config);

        if (!result.allowed) {
            const retryAfterSec = Math.ceil(result.resetMs / 1000);
            const response = envelope.fromAppError(
                new RateLimitError(result.resetMs),
            );
            response.headers.set("Retry-After", String(retryAfterSec));
            response.headers.set("X-RateLimit-Limit", String(config.maxRequests));
            response.headers.set("X-RateLimit-Remaining", "0");
            response.headers.set(
                "X-RateLimit-Reset",
                String(Math.ceil((Date.now() + result.resetMs) / 1000)),
            );
            return response;
        }

        // Execute the handler
        const response = await handler(request, context);

        // Add rate limit headers to every response
        response.headers.set("X-RateLimit-Limit", String(config.maxRequests));
        response.headers.set("X-RateLimit-Remaining", String(result.remaining));
        response.headers.set(
            "X-RateLimit-Reset",
            String(Math.ceil((Date.now() + result.resetMs) / 1000)),
        );

        return response;
    };
}
