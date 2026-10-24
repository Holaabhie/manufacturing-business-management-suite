import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { createSession } from "@/lib/auth-session";
import {
  checkRateLimitMongo,
  getHashedRateLimitKey,
  getClientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  VerifyOtpSchema,
  normalizeIndianPhone,
} from "@/lib/auth-schemas";
import { getVerificationService } from "@/services/verification.service";
import { logAuthEvent } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const ip = getClientIpFromRequest(req);
    const ipRateLimitKey = getHashedRateLimitKey("verify-otp-ip", ip);
    const ipCheck = await checkRateLimitMongo(ipRateLimitKey, "otpVerify");
    if (ipCheck.limited) {
      return rateLimitResponse(ipCheck.retryAfterMs);
    }

    const rawBody = await req.json().catch(() => null);
    const parseResult = VerifyOtpSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid OTP verification request" },
        { status: 400 }
      );
    }

    const { phone, otp, purpose } = parseResult.data;
    const phoneNorm = normalizeIndianPhone(phone);
    if (!phoneNorm) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Rate limit per phone number
    const phoneRateLimitKey = getHashedRateLimitKey("verify-otp-phone", phoneNorm.e164);
    const phoneCheck = await checkRateLimitMongo(phoneRateLimitKey, "otpVerify");
    if (phoneCheck.limited) {
      return rateLimitResponse(phoneCheck.retryAfterMs);
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const db = await getDb();

    // Check verification using unified service
    const verifier = getVerificationService();
    const verifResult = await verifier.checkVerification(phoneNorm.e164, otp);

    if (!verifResult.success) {
      return NextResponse.json(
        {
          error: verifResult.error || "Invalid verification code",
          attemptsRemaining: verifResult.attemptsRemaining,
        },
        { status: 400 }
      );
    }

    // OTP verified successfully!
    if (purpose === "forgot-password") {
      // Find matching user
      const user = await db.collection("users").findOne({
        $or: [
          { phone: { $in: phoneNorm.candidates } },
          { phone_number: { $in: phoneNorm.candidates } },
        ],
      });

      // Requirement 10: Reset token: random 32 bytes, store only its SHA-256 hash, single-use, 10 min expiry
      const rawResetToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawResetToken)
        .digest("hex");

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

      await db.collection("password_resets").insertOne({
        tokenHash,
        phone: phoneNorm.e164,
        userId: user ? String(user._id) : undefined,
        used: false,
        expiresAt,
        createdAt: now,
      });

      if (user) {
        logAuthEvent({
          organizationId: (user as any).organizationId || "",
          userId: String(user._id),
          userName: (user as any).fullName || (user as any).email || phoneNorm.e164,
          userRole: (user as any).role || "Admin",
          action: "OTP verified for password reset",
          actionType: "security",
          ipAddress: ip,
          userAgent,
          severity: "info",
        });
      }

      return NextResponse.json({
        success: true,
        message: "OTP verified successfully. You can now reset your password.",
        resetToken: rawResetToken,
      });
    }

    if (purpose === "login") {
      let user = await db.collection("users").findOne({
        $or: [
          { phone: { $in: phoneNorm.candidates } },
          { phone_number: { $in: phoneNorm.candidates } },
        ],
      });

      const now = new Date();
      if (!user) {
        const newId = crypto.randomUUID();
        await db.collection("users").insertOne({
          _id: newId,
          phone: phoneNorm.e164,
          isPhoneVerified: true,
          role: "Staff",
          status: "active",
          subscription_tier: "starter",
          failedLoginAttempts: 0,
          lastLogin: now,
          lastActiveAt: now,
          createdAt: now,
          updatedAt: now,
        } as any);
        user = await db.collection("users").findOne({ _id: newId });
      } else {
        await db.collection("users").updateOne(
          { _id: user._id },
          {
            $set: {
              isPhoneVerified: true,
              lastLogin: now,
              lastActiveAt: now,
              failedLoginAttempts: 0,
              lockedUntil: undefined,
            },
          }
        );
      }

      if (!user) {
        return NextResponse.json({ error: "Failed to authenticate user" }, { status: 500 });
      }

      await createSession(String(user._id), {
        organizationId: (user as any).organizationId,
        role: user.role,
        ipAddress: ip,
        userAgent,
        provider: "otp",
      });

      logAuthEvent({
        organizationId: (user as any).organizationId || "",
        userId: String(user._id),
        userName: (user as any).fullName || phoneNorm.e164,
        userRole: user.role,
        action: "Logged in via OTP",
        actionType: "login",
        ipAddress: ip,
        userAgent,
        severity: "info",
      });

      return NextResponse.json({
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          phone: user.phone,
          fullName: (user as any).fullName,
          role: user.role,
        },
      });
    }

    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  } catch (error: any) {
    console.error("[verify-otp] Error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP. Please try again." },
      { status: 500 }
    );
  }
}