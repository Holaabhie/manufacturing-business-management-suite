import { NextResponse } from "next/server";
import { ensureCsrfToken } from "@/lib/csrf";

/**
 * GET /api/csrf
 *
 * Returns the current custom CSRF token (also sets it as a cookie if not present).
 * Kept separate from /api/auth/csrf which is reserved for NextAuth.js.
 */
export async function GET() {
    try {
        const token = await ensureCsrfToken();
        return NextResponse.json({ csrfToken: token });
    } catch (error: any) {
        console.error("[csrf] Error:", error);
        return NextResponse.json(
            { error: "Failed to generate CSRF token" },
            { status: 500 }
        );
    }
}
