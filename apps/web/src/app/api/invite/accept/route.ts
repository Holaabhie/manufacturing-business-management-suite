import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { createSession } from "@/lib/auth-session";
import { resolvePermissions, type FlatPermissionMap } from "@/lib/permissions";

/**
 * GET /api/invite/accept?token=xxx
 * Validate an invitation token and return invitation details.
 * 
 * Edge cases:
 * - invite_expired: token exists but expiresAt < now
 * - invite_used: invitation.status === "accepted"
 * - invite_invalid: token not found or revoked
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json(
                { error: "invite_invalid", message: "No invitation token provided" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const invitation = await db.collection("invitations").findOne({ token });

        if (!invitation) {
            return NextResponse.json(
                { error: "invite_invalid", message: "Invalid invitation link" },
                { status: 404 }
            );
        }

        // Edge case 2: Already accepted
        if (invitation.status === "accepted") {
            return NextResponse.json(
                { error: "invite_used", message: "This invite has already been used. Try logging in instead." },
                { status: 410 }
            );
        }

        // Edge case: Revoked
        if (invitation.status === "revoked") {
            return NextResponse.json(
                { error: "invite_revoked", message: "This invitation has been revoked." },
                { status: 410 }
            );
        }

        // Edge case 1: Expired
        if (new Date(invitation.expiresAt).getTime() < Date.now()) {
            // Also update status in DB
            await db.collection("invitations").updateOne(
                { _id: invitation._id },
                { $set: { status: "expired", updatedAt: new Date() } }
            );

            return NextResponse.json(
                { error: "invite_expired", message: "This invite link has expired. Ask your admin to send a new one." },
                { status: 410 }
            );
        }

        // Valid invitation — return details for the setup form
        return NextResponse.json({
            invitation: {
                email: invitation.email,
                role: invitation.role,
                invitedByName: invitation.invitedByName,
                expiresAt: invitation.expiresAt,
            },
        });
    } catch (error: any) {
        console.error("[invite/accept GET] Error:", error);
        return NextResponse.json({ error: "server_error", message: "Something went wrong" }, { status: 500 });
    }
}

/**
 * POST /api/invite/accept
 * Accept an invitation, create the user, and start a session.
 * 
 * Body: { token, fullName, password }
 * 
 * Edge cases:
 * - invite_expired: token expired
 * - invite_used: already accepted
 * - email_exists: user with invitation.email already registered
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, fullName, password } = body;

        if (!token) {
            return NextResponse.json(
                { error: "invite_invalid", message: "No invitation token provided" },
                { status: 400 }
            );
        }

        if (!fullName || !fullName.trim()) {
            return NextResponse.json(
                { error: "validation", message: "Full name is required" },
                { status: 400 }
            );
        }

        if (!password || password.length < 6) {
            return NextResponse.json(
                { error: "validation", message: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const invitation = await db.collection("invitations").findOne({ token });

        if (!invitation) {
            return NextResponse.json(
                { error: "invite_invalid", message: "Invalid invitation link" },
                { status: 404 }
            );
        }

        // Edge case 2: Already accepted
        if (invitation.status === "accepted") {
            return NextResponse.json(
                { error: "invite_used", message: "This invite has already been used. Try logging in instead." },
                { status: 410 }
            );
        }

        // Edge case: Revoked
        if (invitation.status === "revoked") {
            return NextResponse.json(
                { error: "invite_revoked", message: "This invitation has been revoked." },
                { status: 410 }
            );
        }

        // Edge case 1: Expired
        if (new Date(invitation.expiresAt).getTime() < Date.now()) {
            await db.collection("invitations").updateOne(
                { _id: invitation._id },
                { $set: { status: "expired", updatedAt: new Date() } }
            );

            return NextResponse.json(
                { error: "invite_expired", message: "This invite link has expired. Ask your admin to send a new one." },
                { status: 410 }
            );
        }

        // Edge case 3: Email already registered
        const existingUser = await db.collection("users").findOne({
            email: invitation.email.toLowerCase().trim(),
        });
        if (existingUser) {
            return NextResponse.json(
                { error: "email_exists", message: "An account with this email already exists. Please log in." },
                { status: 409 }
            );
        }

        // Hash password
        const bcrypt = await import("bcrypt");
        const passwordHash = await bcrypt.hash(password, 12);

        // Create the user with pre-set role and customPermissions from invitation
        const now = new Date();
        const newUser = {
            email: invitation.email.toLowerCase().trim(),
            phone: "", // Will be set in profile later
            fullName: fullName.trim(),
            passwordHash,
            role: invitation.role || "Staff",
            customPermissions: invitation.customPermissions || undefined,
            organizationId: invitation.organizationId,
            adminId: invitation.invitedBy, // Link to the admin who invited them
            status: "active",
            isActive: true,
            subscription_tier: "starter",
            isEmailVerified: true, // Email verified via invitation
            isPhoneVerified: false,
            firstLoginCompleted: true,
            company_setup_complete: true, // Skip setup for invited users
            failedLoginAttempts: 0,
            invitedBy: invitation.invitedBy,
            invitationId: String(invitation._id),
            lastLogin: now,
            lastActiveAt: now,
            createdAt: now,
            updatedAt: now,
        };

        const result = await db.collection("users").insertOne(newUser);
        const userId = result.insertedId.toString();

        // Mark invitation as accepted
        await db.collection("invitations").updateOne(
            { _id: invitation._id },
            {
                $set: {
                    status: "accepted",
                    acceptedAt: now,
                    acceptedUserId: userId,
                    updatedAt: now,
                },
            }
        );

        // Create session for the new user
        await createSession(userId, {
            organizationId: invitation.organizationId,
            role: invitation.role || "Staff",
            provider: "invitation",
        });

        return NextResponse.json({
            success: true,
            redirect: "/dashboard",
        });
    } catch (error: any) {
        console.error("[invite/accept POST] Error:", error);
        return NextResponse.json({ error: "server_error", message: "Something went wrong" }, { status: 500 });
    }
}
