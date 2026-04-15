import { NextResponse } from "next/server";
import { TwilioService } from "@/services/twilio.service";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(req, "forgot-password");
    const rateCheck = checkRateLimit(rateLimitKey, "passwordReset");
    if (rateCheck.limited) {
      return rateLimitResponse(rateCheck.retryAfterMs);
    }

    const body = await req.json().catch(() => null);
    const phone = String(body?.phone ?? "").trim();

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user exists — but return generic message either way
    // to prevent user enumeration attacks
    const user = await User.findOne({ phone });

    if (user) {
      // Check if user is active before sending OTP
      if (user.status !== "inactive" && user.status !== "suspended") {
        await TwilioService.sendOtp(phone, "forgot-password");
      }
    }

    // Always return success to prevent user enumeration
    return NextResponse.json({
      success: true,
      message:
        "If an account exists with this phone number, an OTP has been sent.",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to initiate password reset",
      },
      { status: 500 }
    );
  }
}