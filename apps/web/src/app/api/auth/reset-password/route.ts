import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcrypt";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { checkPasswordOrError } from "@/lib/password-policy";
import { logAuthEvent, getClientIp } from "@/lib/audit";

/**
 * POST /api/auth/reset-password
 *
 * Requires a valid OTP verification token to proceed.
 * The flow is:
 *   1. User submits phone → /api/auth/forgot-password → OTP sent
 *   2. User verifies OTP → /api/auth/verify-otp → returns otpVerified token
 *   3. User submits new password + phone + otpVerified token → this endpoint
 *
 * SECURITY: We check that the OTP was verified within the last 10 minutes
 * by looking at the `otpVerified` collection timestamp.
 */
export async function POST(req: Request) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(req, "password-reset");
    const rateCheck = checkRateLimit(rateLimitKey, "passwordReset");
    if (rateCheck.limited) {
      return rateLimitResponse(rateCheck.retryAfterMs);
    }

    const body = await req.json().catch(() => null);
    const phone = String(body?.phone ?? "").trim();
    const newPassword = String(body?.newPassword ?? "");
    const resetToken = String(body?.resetToken ?? "").trim();

    if (!phone || !newPassword) {
      return NextResponse.json(
        { error: "Phone number and new password are required" },
        { status: 400 }
      );
    }

    // ─── Password Policy Enforcement ────────────────────────────
    const passwordError = checkPasswordOrError(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;
    const db = await getDb();

    // ─── Verify Reset Token ─────────────────────────────────────
    // The reset token is created when OTP is verified for 'forgot-password' purpose
    const resetEntry = await db.collection("password_reset_tokens").findOne({
      phone,
      token: resetToken,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetEntry) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired reset token. Please verify your OTP again.",
        },
        { status: 400 }
      );
    }

    // ─── Find User ──────────────────────────────────────────────
    const user = await db.collection("users").findOne({ phone });
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this phone number" },
        { status: 404 }
      );
    }

    // ─── Hash & Update Password ─────────────────────────────────
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: undefined,
          updatedAt: new Date(),
        },
      }
    );

    // Mark reset token as used
    await db.collection("password_reset_tokens").updateOne(
      { _id: resetEntry._id },
      { $set: { used: true, usedAt: new Date() } }
    );

    // Invalidate ALL sessions for this user (force re-login everywhere)
    await db.collection("sessions").deleteMany({ userId: String(user._id) });

    // Log the event
    logAuthEvent({
      organizationId: (user as any).organizationId || "",
      userId: String(user._id),
      userName: (user as any).fullName || (user as any).email || phone,
      userRole: (user as any).role || "Admin",
      action: "Password reset successfully",
      actionType: "security",
      ipAddress,
      userAgent,
      severity: "warning",
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}