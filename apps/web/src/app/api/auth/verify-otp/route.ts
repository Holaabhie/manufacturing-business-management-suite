import { NextResponse } from "next/server";
import { TwilioService } from "@/services/twilio.service";
import { User } from "@/models/User";
import { connectToDatabase, getDb } from "@/lib/mongodb";
import { createSession } from "@/lib/auth-session";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { logAuthEvent, getClientIp } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(req, "verify-otp");
    const rateCheck = checkRateLimit(rateLimitKey, "otpVerify");
    if (rateCheck.limited) {
      return rateLimitResponse(rateCheck.retryAfterMs);
    }

    const body = await req.json().catch(() => null);
    const phone = String(body?.phone ?? "").trim();
    const otp = String(body?.otp ?? "").trim();
    const purpose = String(body?.purpose ?? "login");

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Phone number and OTP are required" },
        { status: 400 }
      );
    }

    if (!["login", "forgot-password"].includes(purpose)) {
      return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;

    await connectToDatabase();

    // Verify OTP
    const isValid = await TwilioService.verifyOtp(
      phone,
      otp,
      purpose as "login" | "forgot-password"
    );

    if (!isValid) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // Handle different purposes
    if (purpose === "login") {
      // Find or create user for login
      let user = await User.findOne({ phone });

      if (!user) {
        // Create new user with phone verification
        user = new User({
          phone,
          isPhoneVerified: true,
          role: "Staff",
          status: "active",
          subscription_tier: "starter",
          failedLoginAttempts: 0,
          lastLogin: new Date(),
          lastActiveAt: new Date(),
        });
        await user.save();
      } else {
        // Update phone verification status and login tracking
        user.isPhoneVerified = true;
        user.lastLogin = new Date();
        user.lastActiveAt = new Date();
        user.failedLoginAttempts = 0;
        user.lockedUntil = undefined;
        await user.save();
      }

      // Create session with metadata
      await createSession(user._id.toString(), {
        organizationId: user.organizationId,
        role: user.role,
        ipAddress,
        userAgent,
        provider: "otp",
      });

      // Log successful OTP login
      logAuthEvent({
        organizationId: user.organizationId || "",
        userId: user._id.toString(),
        userName: user.fullName || phone,
        userRole: user.role,
        action: "Logged in via OTP",
        actionType: "login",
        ipAddress,
        userAgent,
        severity: "info",
      });

      return NextResponse.json({
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          phone: user.phone,
          fullName: user.fullName,
          role: user.role,
          subscription_tier: user.subscription_tier,
          isPhoneVerified: user.isPhoneVerified,
        },
      });
    } else if (purpose === "forgot-password") {
      // Issue a time-limited reset token
      const db = await getDb();
      const resetToken = globalThis.crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

      await db.collection("password_reset_tokens").insertOne({
        phone,
        token: resetToken,
        used: false,
        createdAt: now,
        expiresAt,
      });

      // Log the event
      const user = await User.findOne({ phone });
      if (user) {
        logAuthEvent({
          organizationId: user.organizationId || "",
          userId: user._id.toString(),
          userName: user.fullName || phone,
          userRole: user.role,
          action: "OTP verified for password reset",
          actionType: "security",
          ipAddress,
          userAgent,
          severity: "info",
        });
      }

      return NextResponse.json({
        success: true,
        message:
          "OTP verified successfully. You can now reset your password.",
        resetToken, // Client uses this when calling /api/auth/reset-password
      });
    }

    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to verify OTP",
      },
      { status: 500 }
    );
  }
}