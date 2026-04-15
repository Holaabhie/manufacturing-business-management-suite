import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/auth-session";

/**
 * POST /api/auth/complete-setup
 *
 * Called when a first-time staff user completes the 4-step onboarding flow.
 * Finalizes the account by:
 *   - Setting firstLoginCompleted = true
 *   - Setting status = "active"
 *   - Optionally updating profile fields (fullName, phone, otpMethod)
 *   - Recording terms acceptance timestamp
 */
export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized — no active session" },
                { status: 401 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const { termsAccepted, fullName, phoneNumber, otpMethod } = body ?? {};

        if (!termsAccepted) {
            return NextResponse.json(
                { error: "You must accept the terms of use" },
                { status: 400 }
            );
        }

        // ─── Build the update payload ──────────────────────────────
        const updateFields: Record<string, any> = {
            firstLoginCompleted: true,
            status: "active",
            termsAcceptedAt: new Date(),
            updatedAt: new Date(),
        };

        // Save optional profile fields if provided (canonical names only)
        if (fullName && typeof fullName === "string" && fullName.trim()) {
            updateFields.fullName = fullName.trim();
        }
        if (phoneNumber && typeof phoneNumber === "string" && phoneNumber.trim()) {
            updateFields.phone = phoneNumber.trim();
        }
        if (otpMethod && ["email", "sms", "authenticator"].includes(otpMethod)) {
            updateFields.otpDeliveryMethod = otpMethod;
        }

        // ─── Update user document ──────────────────────────────────
        const db = await getDb();
        await db.collection("users").updateOne(
            { _id: user._id as any },
            { $set: updateFields }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[complete-setup] Error:", error);
        return NextResponse.json(
            { error: error?.message ?? "Failed to complete setup" },
            { status: 500 }
        );
    }
}
