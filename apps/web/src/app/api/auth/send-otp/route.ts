import { NextResponse, after } from "next/server";
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

    let rawPhone = parseResult.data.phone;
    const { purpose, email, userId } = parseResult.data;
    const db = await getDb();

    // If phone not provided directly, lookup user by email or userId
    if (!rawPhone && (email || userId)) {
      const query: any = {};
      if (email) query.email = email.toLowerCase();
      if (userId) query._id = userId;

      const userDoc = await db.collection("users").findOne(query);
      if (userDoc && (userDoc.phone || userDoc.phone_number)) {
        rawPhone = userDoc.phone || userDoc.phone_number;
      } else {
        return NextResponse.json(
          { error: "No registered phone number found on this account for OTP verification" },
          { status: 400 }
        );
      }
    }

    // 3. Indian Phone Normalization
    const phoneNorm = normalizeIndianPhone(rawPhone);
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

    // 6. User Status Verification
    let userExists = true;

    if (purpose === "login" || purpose === "forgot-password" || purpose === "step-up") {
      const user = await db.collection("users").findOne({
        $or: [
          { phone: { $in: phoneNorm.candidates } },
          { phone_number: { $in: phoneNorm.candidates } },
        ],
      });

      if (!user) {
        userExists = false;
      } else if (purpose === "login" && (user.status === "inactive" || user.status === "suspended")) {
        return NextResponse.json(
          { error: "Your account has been deactivated. Contact your administrator." },
          { status: 403 }
        );
      }
    }

    // 7. Dispatch OTP via unified verification service in background (after response)
    // Both existing and non-existing accounts return immediately with uniform latency,
    // eliminating external SMS provider latency side-channels
    const verifier = getVerificationService();

    if (userExists) {
      const dispatchTask = async () => {
        try {
          const verifResult = await verifier.startVerification(phoneNorm.e164, "sms");
          if (verifResult.providerError) {
            const maskedPhone = `***${phoneNorm.e164.slice(-4)}`;
            console.error(
              `[send-otp] SMS Provider failure for phone ${maskedPhone}: ${verifResult.error}`
            );
            // Record failure in metrics
            if (db) {
              await db.collection("metrics").updateOne(
                { _id: "sms_dispatch" as any },
                {
                  $inc: { failures: 1 },
                  $set: { lastFailureAt: new Date(), lastError: verifResult.error, updatedAt: new Date() },
                  $setOnInsert: { createdAt: new Date() },
                },
                { upsert: true }
              );
            }
          }
        } catch (err: any) {
          const maskedPhone = `***${phoneNorm.e164.slice(-4)}`;
          console.error(`[send-otp] Background dispatch error for phone ${maskedPhone}:`, err.message);
        }
      };

      try {
        after(dispatchTask);
      } catch {
        // Fallback for contexts without Next.js request scope (e.g. unit tests): run non-blocking promise
        dispatchTask().catch(() => {});
      }
    } else {
      // Uniform code execution: execute equivalent cryptographic hashing and lookup
      const crypto = require("crypto");
      crypto.createHmac("sha256", "timing-defense-secret").update(phoneNorm.e164).digest("hex");
      await db.collection("otps").findOne({ identifier: phoneNorm.e164 });
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