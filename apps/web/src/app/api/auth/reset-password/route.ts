import { NextResponse } from "next/server";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const phone = String(body?.phone ?? "").trim();
    const newPassword = String(body?.newPassword ?? "").trim();

    if (!phone || !newPassword) {
      return NextResponse.json({ error: "Phone number and new password are required" }, { status: 400 });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    await connectToDatabase();

    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return NextResponse.json({ error: "No account found with this phone number" }, { status: 404 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json({ 
      success: true, 
      message: "Password reset successfully" 
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to reset password" 
    }, { status: 500 });
  }
}