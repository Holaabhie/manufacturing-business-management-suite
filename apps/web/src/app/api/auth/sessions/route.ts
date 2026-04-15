import { NextResponse } from "next/server";
import { getSessionUser, getUserSessions, destroyAllUserSessions } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

/**
 * GET /api/auth/sessions — List all active sessions for current user
 */
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const sessions = await getUserSessions(user._id as string);

        // Sanitize output — don't expose refresh tokens
        const safeSessions = sessions.map((s) => ({
            id: s._id,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            lastActiveAt: s.lastActiveAt,
            ipAddress: s.ipAddress,
            deviceType: s.deviceType,
            browser: s.browser,
            provider: s.provider,
        }));

        return NextResponse.json({ sessions: safeSessions });
    } catch (error: any) {
        console.error("[sessions] GET error:", error);
        return NextResponse.json(
            { error: "Failed to fetch sessions" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/auth/sessions — Revoke a specific session or all sessions
 */
export async function DELETE(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json().catch(() => null);
        const sessionId = body?.sessionId;
        const all = body?.all === true;

        const db = await getDb();

        if (all) {
            // Destroy all sessions for this user
            await destroyAllUserSessions(user._id as string);
            return NextResponse.json({
                ok: true,
                message: "All sessions revoked",
            });
        }

        if (sessionId) {
            // Destroy specific session
            await db
                .collection("sessions")
                .deleteOne({ _id: sessionId, userId: user._id as string });
            return NextResponse.json({
                ok: true,
                message: "Session revoked",
            });
        }

        return NextResponse.json(
            { error: "Provide sessionId or all:true" },
            { status: 400 }
        );
    } catch (error: any) {
        console.error("[sessions] DELETE error:", error);
        return NextResponse.json(
            { error: "Failed to revoke session" },
            { status: 500 }
        );
    }
}
