import { NextResponse } from "next/server";
import { ensureCsrfToken } from "@/lib/csrf";

/**
 * GET /api/auth/csrf
 *
 * Returns the current CSRF token (also sets it as a cookie if not present).
 * The frontend can call this to initialize the CSRF token on page load.
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
