import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      subscription_tier: user.subscription_tier,
      subscription_status: user.subscription_status,
      notification_preferences: user.notification_preferences,
      full_name: user.full_name,
      phone_number: user.phone_number,
      avatar_url: user.avatar_url,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const db = await getDb();

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.full_name !== undefined) updateData.full_name = body.full_name;
    if (body.phone_number !== undefined) updateData.phone_number = body.phone_number;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.notification_preferences !== undefined) updateData.notification_preferences = body.notification_preferences;
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;

    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: updateData }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
