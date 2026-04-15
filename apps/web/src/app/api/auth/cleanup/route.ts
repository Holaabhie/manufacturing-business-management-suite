import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { runSessionCleanup } from "@/lib/session-cleanup";

/**
 * POST /api/auth/cleanup
 *
 * Triggers session cleanup. Restricted to Admin users.
 * In production, this should be called by a cron job
 * (e.g., Vercel Cron, AWS EventBridge) every 6 hours.
 */
export async function POST() {
    try {
        // Verify caller is an admin (or allow unauthenticated calls with a secret)
        const cronSecret = process.env.CRON_SECRET;
        const user = await getSessionUser();

        if (!user || user.role !== "Admin") {
            // Allow cron jobs with secret header (for production schedulers)
            // For now, just require admin auth
            return NextResponse.json(
                { error: "Unauthorized — Admin only" },
                { status: 401 }
            );
        }

        const result = await runSessionCleanup();

        return NextResponse.json({
            ok: true,
            ...result,
        });
    } catch (error: any) {
        console.error("[cleanup] Error:", error);
        return NextResponse.json(
            { error: "Cleanup failed" },
            { status: 500 }
        );
    }
}
