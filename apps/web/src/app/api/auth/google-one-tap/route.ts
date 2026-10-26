import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { createSession } from "@/lib/auth-session";
import { findOrCreateGoogleAdminUser } from "@/lib/google-auth";

/**
 * POST /api/auth/google-one-tap
 *
 * Verifies a Google One Tap credential token server-side,
 * creates or updates the user record via findOrCreateGoogleAdminUser,
 * and sets the session cookie.
 */

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
    try {
        const { credential } = await request.json();

        if (!credential) {
            return NextResponse.json(
                { error: "Missing credential token" },
                { status: 400 }
            );
        }

        // Verify the Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return NextResponse.json(
                { error: "Invalid token payload" },
                { status: 401 }
            );
        }

        if (!payload.email_verified) {
            return NextResponse.json(
                { error: "Google email is not verified" },
                { status: 403 }
            );
        }

        const { email, name, picture, sub: googleId, email_verified } = payload;

        // Find or create user via unified helper (phone omitted on create, shared pool)
        let authResult;
        try {
            authResult = await findOrCreateGoogleAdminUser({
                email,
                googleId,
                name,
                picture,
                emailVerified: email_verified,
            });
        } catch (err) {
            console.error("[google-one-tap] User creation error:", err);
            return NextResponse.json(
                { error: "Failed to create account" },
                { status: 500 }
            );
        }

        const user = authResult.user;
        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 500 }
            );
        }

        // Create custom session
        const userId = user._id.toString();
        await createSession(userId, {
            role: user.role || "Admin",
            organizationId: user.organizationId,
            provider: "google-one-tap",
        });

        return NextResponse.json({
            success: true,
            isNewUser: authResult.isNewUser,
            user: {
                id: userId,
                email: user.email,
                name: user.fullName || user.full_name || name,
                role: user.role,
                company_setup_complete: user.company_setup_complete,
            },
        });
    } catch (err: unknown) {
        console.error("[google-one-tap] Verification error:", err);

        // Handle specific Google token errors
        const errMsg = err instanceof Error ? err.message : "";
        if (errMsg.includes("Token used too late") || errMsg.includes("Invalid token")) {
            return NextResponse.json(
                { error: "Token expired. Please try again." },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: "Authentication failed" },
            { status: 401 }
        );
    }
}
