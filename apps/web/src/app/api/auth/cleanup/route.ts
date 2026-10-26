import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionUser } from "@/lib/auth-session";
import { runSessionCleanup } from "@/lib/session-cleanup";

export const maxDuration = 30;

function isCronAuthorized(request: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return false;

    const authHeader = request.headers.get("authorization");
    if (!authHeader) return false;

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return false;

    const provided = match[1];
    const expectedBuf = Buffer.from(cronSecret, "utf8");
    const providedBuf = Buffer.from(provided, "utf8");

    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * GET /api/auth/cleanup
 *
 * Automated cron trigger (e.g. Vercel Cron). Requires Bearer CRON_SECRET only.
 */
export async function GET(request: NextRequest) {
    try {
        if (!isCronAuthorized(request)) {
            return NextResponse.json(
                { error: "Unauthorized: Invalid or missing Bearer token" },
                { status: 401 }
            );
        }

        const result = await runSessionCleanup();

        return NextResponse.json({
            ok: true,
            ...result,
        });
    } catch (error: unknown) {
        console.error("[cleanup] Error:", error);
        return NextResponse.json(
            { error: "Cleanup failed" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/auth/cleanup
 *
 * Manual or programmatic trigger. Allowed for Admin users or Bearer CRON_SECRET.
 */
export async function POST(request: NextRequest) {
    try {
        const isCron = isCronAuthorized(request);
        if (!isCron) {
            const user = await getSessionUser();
            if (!user || user.role !== "Admin") {
                return NextResponse.json(
                    { error: "Unauthorized — Admin only" },
                    { status: 401 }
                );
            }
        }

        const result = await runSessionCleanup();

        return NextResponse.json({
            ok: true,
            ...result,
        });
    } catch (error: unknown) {
        console.error("[cleanup] Error:", error);
        return NextResponse.json(
            { error: "Cleanup failed" },
            { status: 500 }
        );
    }
}
