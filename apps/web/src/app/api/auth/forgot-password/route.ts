import { NextResponse } from "next/server";
import { TwilioService } from "@/services/twilio.service";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const phone = String(body?.phone ?? "").trim();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return NextResponse.json({ error: "No account found with this phone number" }, { status: 404 });
    }

    // Send OTP for password reset
    await TwilioService.sendOtp(phone, 'forgot-password');
    
    return NextResponse.json({ 
      success: true, 
      message: "OTP sent to your phone for password reset" 
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to initiate password reset" 
    }, { status: 500 });
  }
}