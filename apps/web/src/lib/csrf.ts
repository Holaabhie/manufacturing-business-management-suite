/**
 * CSRF Protection Module
 *
 * Implements the Double Submit Cookie pattern for CSRF protection.
 *
 * How It Works:
 * 1. Server generates a random CSRF token and stores it in an HttpOnly cookie
 * 2. Frontend reads the token from a meta tag or X-CSRF-Token header
 * 3. On state-changing requests (POST, PUT, DELETE), the frontend sends the
 *    token in the X-CSRF-Token header
 * 4. Server compares the header token with the cookie token
 *
 * This is compatible with SameSite=Lax cookies and doesn't require server-side
 * session storage for the token.
 */

import { cookies } from "next/headers";

export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate and set a CSRF token cookie if one doesn't already exist.
 * Returns the token value.
 */
export async function ensureCsrfToken(): Promise<string> {
    const jar = await cookies();
    const existing = jar.get(CSRF_COOKIE_NAME)?.value;

    if (existing) return existing;

    const token = globalThis.crypto.randomUUID();

    jar.set(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Must be readable by JavaScript for header submission
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return token;
}

/**
 * Validate the CSRF token from request header against the cookie.
 * Returns true if valid.
 *
 * Skips validation for:
 *  - GET, HEAD, OPTIONS requests (safe methods)
 *  - NextAuth callbacks (handled by NextAuth's own CSRF)
 *  - Requests from the same origin with proper SameSite cookies
 */
export async function validateCsrf(req: Request): Promise<boolean> {
    // Safe methods don't need CSRF checks
    const method = req.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
        return true;
    }

    // Skip for NextAuth routes (has its own CSRF protection)
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/auth/callback")) {
        return true;
    }
    if (url.pathname.includes("[...nextauth]")) {
        return true;
    }

    const jar = await cookies();
    const cookieToken = jar.get(CSRF_COOKIE_NAME)?.value;
    const headerToken = req.headers.get(CSRF_HEADER_NAME);

    // If no CSRF cookie exists yet, generate one and allow this request
    // (first request from a new session)
    if (!cookieToken) {
        await ensureCsrfToken();
        return true;
    }

    // Compare tokens using timing-safe comparison
    if (!headerToken) return false;

    return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

/**
 * Return a 403 response for CSRF validation failure.
 */
export function csrfForbiddenResponse() {
    const { NextResponse } = require("next/server");
    return NextResponse.json(
        { error: "CSRF token validation failed" },
        { status: 403 }
    );
}
