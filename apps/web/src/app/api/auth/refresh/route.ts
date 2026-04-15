import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/auth-session";

/**
 * POST /api/auth/refresh
 *
 * Called by the frontend when the access session expires.
 * Uses the refresh token cookie to create a new session.
 */
export async function POST() {
    try {
        const result = await refreshSession();

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || "Session expired. Please log in again." },
                { status: 401 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("[refresh] Error:", error);
        return NextResponse.json(
            { error: "Failed to refresh session" },
            { status: 500 }
        );
    }
}
