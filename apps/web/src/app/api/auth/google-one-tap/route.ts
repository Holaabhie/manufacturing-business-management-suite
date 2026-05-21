import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { getDb } from "@/lib/mongodb";
import { createSession } from "@/lib/auth-session";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * POST /api/auth/google-one-tap
 *
 * Verifies a Google One Tap credential token server-side,
 * creates or updates the user record, and sets the session cookie.
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

        const { email, name, picture, sub: googleId } = payload;

        // Connect to DB
        const db = await getDb();

        // Check if user exists
        let user = await db.collection("users").findOne({ email });

        if (user) {
            // Update existing user — link Google ID + update timestamps
            await db.collection("users").updateOne(
                { _id: user._id },
                {
                    $set: {
                        googleId: googleId,
                        isEmailVerified: true,
                        lastLogin: new Date(),
                        lastActiveAt: new Date(),
                        failedLoginAttempts: 0,
                        lockedUntil: null,
                        // Update avatar if not set
                        ...(picture && !user.avatar_url ? { avatar_url: picture } : {}),
                    },
                }
            );
        } else {
            // Create new user via Mongoose model (for schema consistency)
            try {
                await connectToDatabase();
                const { User } = await import("@/models/User");

                const newUser = new User({
                    email,
                    fullName: name || email.split("@")[0],
                    googleId,
                    phone: "",
                    isEmailVerified: true,
                    isPhoneVerified: false,
                    role: "Admin",
                    status: "active",
                    subscription_tier: "starter",
                    firstLoginCompleted: true,
                    company_setup_complete: false,
                    failedLoginAttempts: 0,
                    lastLogin: new Date(),
                    lastActiveAt: new Date(),
                    avatar_url: picture || "",
                });

                const saved = await newUser.save();
                user = await db.collection("users").findOne({ _id: saved._id });
            } catch (err) {
                console.error("[google-one-tap] User creation error:", err);
                return NextResponse.json(
                    { error: "Failed to create account" },
                    { status: 500 }
                );
            }
        }

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
            user: {
                id: userId,
                email: user.email,
                name: user.fullName || user.full_name || name,
                role: user.role,
            },
        });
    } catch (err: any) {
        console.error("[google-one-tap] Verification error:", err);

        // Handle specific Google token errors
        if (err.message?.includes("Token used too late") || err.message?.includes("Invalid token")) {
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
