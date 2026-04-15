/**
 * CORS Configuration for API v1
 * ─────────────────────────────────────────────────────────
 * Handles CORS preflight requests and adds proper headers.
 * Only applies to /api/v1/* routes.
 *
 * Usage:
 *   // In an API route that needs CORS:
 *   export const OPTIONS = corsHandler;
 *
 *   export const GET = withCors(
 *     withApiRoute(async (request) => { ... })
 *   );
 */

import { type NextRequest, NextResponse } from "next/server";

// ─── Allowed Origins ────────────────────────────────────────────

const ALLOWED_ORIGINS: string[] = [
    // Add your production domains here
    // "https://app.manufacturing-os.com",
    // "https://staging.manufacturing-os.com",
];

function getAllowedOrigins(): string[] {
    const origins = [...ALLOWED_ORIGINS];

    // In development, allow localhost
    if (process.env.NODE_ENV !== "production") {
        origins.push(
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5000",
            "http://127.0.0.1:3000",
        );
    }

    // Allow the configured NEXTAUTH_URL
    if (process.env.NEXTAUTH_URL) {
        origins.push(process.env.NEXTAUTH_URL);
    }

    return origins;
}

function isOriginAllowed(origin: string | null): boolean {
    if (!origin) return false;
    const allowed = getAllowedOrigins();
    return allowed.includes(origin);
}

// ─── CORS Headers ───────────────────────────────────────────────

function addCorsHeaders(
    response: NextResponse,
    origin: string | null,
): NextResponse {
    if (origin && isOriginAllowed(origin)) {
        response.headers.set("Access-Control-Allow-Origin", origin);
    }

    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-CSRF-Token, Idempotency-Key, X-Request-ID",
    );
    response.headers.set("Access-Control-Expose-Headers",
        "X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
    );
    response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours preflight cache
    response.headers.set("Access-Control-Allow-Credentials", "true");

    return response;
}

// ─── OPTIONS Handler ────────────────────────────────────────────

export function corsHandler(request: NextRequest): NextResponse {
    const origin = request.headers.get("origin");
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, origin);
}

// ─── CORS Wrapper ───────────────────────────────────────────────

type RouteHandler = (
    request: NextRequest,
    context?: unknown,
) => Promise<NextResponse>;

export function withCors(handler: RouteHandler): RouteHandler {
    return async function corsWrappedHandler(
        request: NextRequest,
        context?: unknown,
    ): Promise<NextResponse> {
        const origin = request.headers.get("origin");
        const response = await handler(request, context);
        return addCorsHeaders(response, origin);
    };
}
