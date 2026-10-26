import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { MongoUserDoc } from "@/lib/auth-session";
import {
  checkRateLimitMongo,
  getHashedRateLimitKey,
  getClientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  ResetPasswordSchema,
  normalizeIndianPhone,
} from "@/lib/auth-schemas";
import { checkPasswordOrError } from "@/lib/password-policy";
import { logAuthEvent } from "@/lib/audit";
import { EmailAdapter } from "@/lib/notifications/channels/email-adapter";

export async function POST(req: Request) {
  try {
    const ip = getClientIpFromRequest(req);
    const ipRateLimitKey = getHashedRateLimitKey("reset-password-ip", ip);
    const ipCheck = await checkRateLimitMongo(ipRateLimitKey, "passwordReset");
    if (ipCheck.limited) {
      return rateLimitResponse(ipCheck.retryAfterMs);
    }

    const rawBody = await req.json().catch(() => null);
    const parseResult = ResetPasswordSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid reset password request" },
        { status: 400 }
      );
    }

    const { phone, newPassword, resetToken } = parseResult.data;
    const phoneNorm = normalizeIndianPhone(phone);
    if (!phoneNorm) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Rate limit per phone number
    const phoneRateLimitKey = getHashedRateLimitKey("reset-password-phone", phoneNorm.e164);
    const phoneCheck = await checkRateLimitMongo(phoneRateLimitKey, "passwordReset");
    if (phoneCheck.limited) {
      return rateLimitResponse(phoneCheck.retryAfterMs);
    }

    // Check password policy
    const passwordError = checkPasswordOrError(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const db = await getDb();

    // Verify reset token by computing SHA-256 hash
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const resetEntry = await db.collection("password_resets").findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetEntry) {
      return NextResponse.json(
        {
          error: "Invalid or expired reset token. Please verify your OTP again.",
        },
        { status: 400 }
      );
    }

    // Find user
    let user: MongoUserDoc | null = null;
    if (resetEntry.userId) {
      user = await db.collection<MongoUserDoc>("users").findOne({ _id: resetEntry.userId });
    }
    if (!user) {
      user = await db.collection<MongoUserDoc>("users").findOne({
        $or: [
          { phone: { $in: phoneNorm.candidates } },
          { phone_number: { $in: phoneNorm.candidates } },
        ],
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "No account found associated with this request" },
        { status: 404 }
      );
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const now = new Date();

    await db.collection<MongoUserDoc>("users").updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash,
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: undefined,
          updatedAt: now,
        },
      }
    );

    // Single-use token: invalidate the reset token and any remaining OTPs
    await db.collection("password_resets").deleteMany({
      $or: [
        { _id: resetEntry._id },
        { tokenHash },
        { userId: String(user._id) },
        { phone: phoneNorm.e164 },
      ],
    });
    await db.collection("otps").deleteMany({ identifier: phoneNorm.e164 });

    // Invalidate ALL sessions for this user (force re-login everywhere)
    const strId = String(user._id);
    const objId = ObjectId.isValid(strId) ? new ObjectId(strId) : null;
    await db.collection<{ userId: string | ObjectId }>("sessions").deleteMany({
      $or: [
        { userId: strId },
        ...(objId ? [{ userId: objId }] : []),
      ],
    });

    // Audit log
    logAuthEvent({
      organizationId: user.organizationId || "",
      userId: String(user._id),
      userName: user.fullName || user.email || phoneNorm.e164,
      userRole: user.role === "Staff" ? "Staff" : "Admin",
      action: "Password reset successfully via OTP",
      actionType: "security",
      ipAddress: ip,
      userAgent,
      severity: "warning",
    });

    // Send "Password changed" notification email if user has email
    if (user.email) {
      const emailAdapter = new EmailAdapter();
      emailAdapter
        .send({
          eventType: "user_deactivated", // generic security notification
          recipientContact: user.email,
          subject: "Your password has been changed",
          message: `Hello ${user.fullName || "User"},\n\nYour account password was successfully reset on ${now.toLocaleString()}. If you did not make this change, please contact support immediately.\n\nAll existing sessions have been signed out.`,
        })
        .catch((e) => console.warn("[reset-password] Failed to dispatch email:", e));
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error: unknown) {
    console.error("[reset-password] Error:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}