import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getDb } from "@/lib/mongodb";
import { getSessionUser, type UserDoc, destroyAllUserSessions } from "@/lib/auth-session";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { checkPasswordOrError } from "@/lib/password-policy";
import { logAuthEvent, getClientIp } from "@/lib/audit";

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized — no active session" },
                { status: 401 }
            );
        }

        const body = await req.json().catch(() => null);
        const currentPassword = String(body?.currentPassword ?? "").trim();
        const newPassword = String(body?.newPassword ?? "");

        if (!newPassword) {
            return NextResponse.json(
                { success: false, message: "New password is required" },
                { status: 400 }
            );
        }

        // ─── Password Policy Enforcement ────────────────────────────
        const passwordError = checkPasswordOrError(newPassword, {
            email: user.email,
            fullName: user.fullName || user.full_name || undefined,
        });
        if (passwordError) {
            return NextResponse.json({ success: false, message: passwordError }, { status: 400 });
        }

        const ipAddress = getClientIp(req);
        const userAgent = req.headers.get("user-agent") || undefined;
        const db = await getDb();

        // If user already has a password, require current password verification
        // (Skip for first-time staff setup where passwordHash may not exist yet)
        if (user.passwordHash && currentPassword) {
            const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isValid) {
                logAuthEvent({
                    organizationId: (user as any).organizationId || "",
                    userId: user._id as string,
                    userName: user.fullName || user.full_name || user.email,
                    userRole: user.role as any,
                    action: "Failed password change — wrong current password",
                    actionType: "security",
                    ipAddress,
                    userAgent,
                    severity: "warning",
                });

                return NextResponse.json(
                    { success: false, message: "Current password is incorrect" },
                    { status: 401 }
                );
            }
        }

        // Check that new password is different from current
        if (user.passwordHash) {
            const isSame = await bcrypt.compare(newPassword, user.passwordHash);
            if (isSame) {
                return NextResponse.json(
                    { success: false, message: "New password must be different from current password" },
                    { status: 400 }
                );
            }
        }

        // ─── Hash & Update ──────────────────────────────────────────
        const passwordHash = await bcrypt.hash(newPassword, 12);

        const updateFields: Record<string, any> = {
            passwordHash,
            passwordChangedAt: new Date(),
            updatedAt: new Date(),
        };

        // For first-time staff setup, also mark setup step complete
        if (!user.firstLoginCompleted || user.status === "pending_setup") {
            updateFields["setupSteps.passwordChanged"] = true;
        }

        await db.collection<UserDoc>("users").updateOne(
            { _id: user._id },
            { $set: updateFields }
        );

        // Invalidate all other sessions (security: force re-login on other devices)
        const { cookies } = await import("next/headers");
        const jar = await cookies();
        const currentSessionId = jar.get(SESSION_COOKIE_NAME)?.value;
        if (currentSessionId) {
            // Remove all sessions except current one
            await db.collection("sessions").deleteMany({
                userId: user._id as string,
                _id: { $ne: currentSessionId } as any,
            });
        } else {
            // Fallback: destroy all sessions
            await destroyAllUserSessions(user._id as string);
        }

        // Audit log
        logAuthEvent({
            organizationId: (user as any).organizationId || "",
            userId: user._id as string,
            userName: user.fullName || user.full_name || user.email,
            userRole: user.role as any,
            action: "Password changed successfully",
            actionType: "security",
            ipAddress,
            userAgent,
            severity: "info",
        });

        return NextResponse.json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error: any) {
        console.error("[change-password] Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Failed to change password" },
            { status: 500 }
        );
    }
}
