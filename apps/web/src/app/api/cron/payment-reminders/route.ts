import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getReminderService, DEFAULT_CRON_ORDER_LIMIT } from "@/modules/reminders";

export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
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

export async function POST(request: NextRequest) {
    try {
        if (!isAuthorized(request)) {
            return NextResponse.json(
                { error: "Unauthorized: Invalid or missing Bearer token" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get("limit");
        const asOf = searchParams.get("asOf") || searchParams.get("as_of") || undefined;
        const tenantId = searchParams.get("tenantId") || undefined;

        let orderLimit = DEFAULT_CRON_ORDER_LIMIT;
        if (limitParam) {
            const parsed = parseInt(limitParam, 10);
            if (!isNaN(parsed) && parsed > 0) {
                orderLimit = parsed;
            }
        }

        const service = getReminderService();
        const summary = await service.runCron({
            orderLimit,
            asOfDateStr: asOf,
            tenantIdFilter: tenantId,
        });

        return NextResponse.json({
            success: true,
            summary,
        });
    } catch (err: unknown) {
        console.error("[Cron Payment Reminders] Error:", err);
        return NextResponse.json(
            { error: (err as Error)?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

export const GET = POST;
