import { NextResponse } from "next/server";
import { TwilioService } from "@/services/twilio.service";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { createSession } from "@/lib/auth-session";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const phone = String(body?.phone ?? "").trim();
    const otp = String(body?.otp ?? "").trim();
    const purpose = String(body?.purpose ?? "login");

    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone number and OTP are required" }, { status: 400 });
    }

    if (!['login', 'forgot-password'].includes(purpose)) {
      return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
    }

    await connectToDatabase();

    // Verify OTP
    const isValid = await TwilioService.verifyOtp(phone, otp, purpose as 'login' | 'forgot-password');

    if (!isValid) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // Handle different purposes
    if (purpose === 'login') {
      // Find or create user for login
      let user = await User.findOne({ phone });

      if (!user) {
        // Create new user with phone verification
        user = new User({
          phone,
          isPhoneVerified: true,
          role: "Staff",
          subscription_tier: "starter"
        });
        await user.save();
      } else {
        // Update phone verification status
        user.isPhoneVerified = true;
        await user.save();
      }

      // Create session with metadata
      await createSession(user._id.toString(), {
        organizationId: user.organizationId,
        role: user.role,
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
          isPhoneVerified: user.isPhoneVerified
        }
      });
    } else if (purpose === 'forgot-password') {
      // For forgot password, just verify OTP and return success
      return NextResponse.json({
        success: true,
        message: "OTP verified successfully. You can now reset your password."
      });
    }

    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({
      error: error.message || "Failed to verify OTP"
    }, { status: 500 });
  }
}