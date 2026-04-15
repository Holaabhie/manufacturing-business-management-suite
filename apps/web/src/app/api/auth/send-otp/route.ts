import { NextResponse } from "next/server";
import { TwilioService } from "@/services/twilio.service";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limiting — prevent OTP spam
    const rateLimitKey = getRateLimitKey(req, "send-otp");
    const rateCheck = checkRateLimit(rateLimitKey, "otpSend");
    if (rateCheck.limited) {
      return rateLimitResponse(rateCheck.retryAfterMs);
    }

    const body = await req.json().catch(() => null);
    const phone = String(body?.phone ?? "").trim();
    const purpose = String(body?.purpose ?? "login");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    if (!["login", "forgot-password"].includes(purpose)) {
      return NextResponse.json(
        { error: "Invalid purpose" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // For login, check if user exists
    if (purpose === "login") {
      const user = await User.findOne({ phone });
      if (!user) {
        return NextResponse.json(
          { error: "No account found with this phone number" },
          { status: 404 }
        );
      }

      // Check if user is active
      if (
        user.status === "inactive" ||
        user.status === "suspended"
      ) {
        return NextResponse.json(
          { error: "Your account has been deactivated. Contact your administrator." },
          { status: 403 }
        );
      }
    }

    // For forgot-password, also check user exists
    if (purpose === "forgot-password") {
      const user = await User.findOne({ phone });
      if (!user) {
        // Don't reveal if user exists — return generic success
        // This prevents user enumeration attacks
        return NextResponse.json({
          success: true,
          message: "If an account exists with this number, an OTP has been sent.",
        });
      }
    }

    // Send OTP
    await TwilioService.sendOtp(
      phone,
      purpose as "login" | "forgot-password"
    );

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
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