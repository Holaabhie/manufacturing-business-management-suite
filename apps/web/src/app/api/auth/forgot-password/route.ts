import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { MongoUserDoc } from "@/lib/auth-session";
import {
  checkRateLimitMongo,
  getHashedRateLimitKey,
  getClientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  ForgotPasswordSchema,
  normalizeIndianPhone,
} from "@/lib/auth-schemas";
import { getVerificationService } from "@/services/verification.service";

export async function POST(req: Request) {
  try {
    const ip = getClientIpFromRequest(req);
    const ipRateLimitKey = getHashedRateLimitKey("forgot-password-ip", ip);
    const ipCheck = await checkRateLimitMongo(ipRateLimitKey, "passwordReset");
    if (ipCheck.limited) {
      return rateLimitResponse(ipCheck.retryAfterMs);
    }

    const rawBody = await req.json().catch(() => null);
    const parseResult = ForgotPasswordSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid phone number format" },
        { status: 400 }
      );
    }

    const { phone } = parseResult.data;
    const phoneNorm = normalizeIndianPhone(phone);

    // If phone formatting completely fails
    if (!phoneNorm) {
      await new Promise((r) => setTimeout(r, 120));
      return NextResponse.json({
        success: true,
        message: "If an account exists with this phone number, an OTP has been sent.",
      });
    }

    // Rate limit per phone number identifier
    const phoneRateLimitKey = getHashedRateLimitKey("forgot-password-phone", phoneNorm.e164);
    const phoneCheck = await checkRateLimitMongo(phoneRateLimitKey, "passwordReset");
    if (phoneCheck.limited) {
      return rateLimitResponse(phoneCheck.retryAfterMs);
    }

    // 60-second resend cooldown (SMS Bombing defense)
    const cooldownKey = getHashedRateLimitKey("otp-cooldown", phoneNorm.e164);
    const cooldownCheck = await checkRateLimitMongo(cooldownKey, "otpCooldown");
    if (cooldownCheck.limited) {
      const retryAfterSec = Math.ceil(cooldownCheck.retryAfterMs / 1000);
      return NextResponse.json(
        {
          error: `Please wait ${retryAfterSec} seconds before requesting another OTP`,
          retryAfter: retryAfterSec,
        },
        { status: 429 }
      );
    }

    const db = await getDb();

    // Query candidate phone formats across legacy phone and phone_number fields
    const candidateUsers = await db
      .collection<MongoUserDoc>("users")
      .find({
        $or: [
          { phone: { $in: phoneNorm.candidates } },
          { phone_number: { $in: phoneNorm.candidates } },
        ],
      })
      .toArray();

    const activeUsers = candidateUsers.filter(
      (u) => u.status !== "inactive" && u.status !== "suspended"
    );

    // Requirement 8: If more than one ACTIVE account matches the phone: do not guess.
    // Send no OTP, return generic response, log server-side.
    if (activeUsers.length > 1) {
      console.warn(
        `[forgot-password] Multiple active accounts (${activeUsers.length}) found for phone ${phoneNorm.e164}. Failing closed.`
      );
      await new Promise((r) => setTimeout(r, 120));
      return NextResponse.json({
        success: true,
        message: "If an account exists with this phone number, an OTP has been sent.",
      });
    }

    if (activeUsers.length === 0) {
      // Unknown phone: timing defense to match existing phone duration
      await new Promise((r) => setTimeout(r, 120));
      return NextResponse.json({
        success: true,
        message: "If an account exists with this phone number, an OTP has been sent.",
      });
    }

    const user = activeUsers[0];

    // Requirement 9: Google-only accounts (no passwordHash): only allow setting password
    // if phone is verified; otherwise fail closed with generic response.
    if (!user.passwordHash) {
      const isPhoneVerified =
        user.isPhoneVerified === true || user.phoneVerified === true;
      if (!isPhoneVerified) {
        console.warn(
          `[forgot-password] Unverified phone for OAuth account ${user.email}. Refusing OTP.`
        );
        await new Promise((r) => setTimeout(r, 120));
        return NextResponse.json({
          success: true,
          message: "If an account exists with this phone number, an OTP has been sent.",
        });
      }
    }

    // Invalidate earlier pending reset tokens for this user/phone
    await db.collection("password_resets").deleteMany({
      $or: [{ userId: String(user._id) }, { phone: phoneNorm.e164 }],
    });

    // Start verification
    const verifier = getVerificationService();
    const verifResult = await verifier.startVerification(phoneNorm.e164, "sms");

    if (verifResult.providerError) {
      console.error(
        `[forgot-password] SMS Provider failure for phone ${phoneNorm.e164}: ${verifResult.error}`
      );
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this phone number, an OTP has been sent.",
    });
  } catch (error: unknown) {
    console.error("[forgot-password] Error:", error);
    return NextResponse.json(
      { error: "Failed to process request. Please try again later." },
      { status: 500 }
    );
  }
}