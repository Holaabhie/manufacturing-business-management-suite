import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import {
  checkRateLimitMongo,
  getHashedRateLimitKey,
  getClientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  SendOtpSchema,
  normalizeIndianPhone,
} from "@/lib/auth-schemas";
import { getVerificationService } from "@/services/verification.service";

export async function POST(req: Request) {
  try {
    const ip = getClientIpFromRequest(req);

    // 1. IP Rate Limiting (5 sends per 10 min)
    const ipRateLimitKey = getHashedRateLimitKey("send-otp-ip", ip);
    const ipCheck = await checkRateLimitMongo(ipRateLimitKey, "otpSend");
    if (ipCheck.limited) {
      return rateLimitResponse(ipCheck.retryAfterMs);
    }

    // 2. Validate JSON & Schema
    const rawBody = await req.json().catch(() => null);
    const parseResult = SendOtpSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid phone number or request format" },
        { status: 400 }
      );
    }

    const { phone, purpose } = parseResult.data;

    // 3. Indian Phone Normalization
    const phoneNorm = normalizeIndianPhone(phone);
    if (!phoneNorm) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Indian phone number" },
        { status: 400 }
      );
    }

    // 4. Phone Rate Limiting (5 sends per 10 min per phone number)
    const phoneRateLimitKey = getHashedRateLimitKey("send-otp-phone", phoneNorm.e164);
    const phoneCheck = await checkRateLimitMongo(phoneRateLimitKey, "otpSend");
    if (phoneCheck.limited) {
      return rateLimitResponse(phoneCheck.retryAfterMs);
    }

    // 5. 60-Second Resend Cooldown (SMS Bombing defense)
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

    // 6. User Status Verification
    if (purpose === "login") {
      const user = await db.collection("users").findOne({
        $or: [
          { phone: { $in: phoneNorm.candidates } },
          { phone_number: { $in: phoneNorm.candidates } },
        ],
      });

      if (!user) {
        // Timing-safe user enumeration defense: identical response whether user exists or not
        await new Promise((r) => setTimeout(r, 120));
        return NextResponse.json({
          success: true,
          message: "OTP sent successfully",
        });
      }

      if (user.status === "inactive" || user.status === "suspended") {
        return NextResponse.json(
          { error: "Your account has been deactivated. Contact your administrator." },
          { status: 403 }
        );
      }
    }

    if (purpose === "forgot-password") {
      const user = await db.collection("users").findOne({
        $or: [
          { phone: { $in: phoneNorm.candidates } },
          { phone_number: { $in: phoneNorm.candidates } },
        ],
      });

      if (!user) {
        // Timing-safe user enumeration defense
        await new Promise((r) => setTimeout(r, 120));
        return NextResponse.json({
          success: true,
          message: "If an account exists with this phone number, an OTP has been sent.",
        });
      }
    }

    // 7. Dispatch OTP via unified verification service (Twilio Verify / Local HMAC)
    const verifier = getVerificationService();
    const verifResult = await verifier.startVerification(phoneNorm.e164, "sms");

    if (verifResult.providerError) {
      console.error(
        `[send-otp] SMS Provider failure for phone ${phoneNorm.e164}: ${verifResult.error}`
      );
    }

    return NextResponse.json({
      success: true,
      message: purpose === "forgot-password"
        ? "If an account exists with this phone number, an OTP has been sent."
        : "OTP sent successfully",
    });
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to send OTP",
      },
      { status: 500 }
    );
  }
}