import { NextResponse } from "next/server";
import { getSessionUser, type UserDoc, type MongoUserDoc } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getEffectiveTier } from "@/lib/entitlements";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const effectiveTier = await getEffectiveTier(user);

    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      subscription_tier: effectiveTier,
      subscription_status: user.subscription_status,
      notification_preferences: user.notification_preferences,
      full_name: user.full_name,
      phone_number: user.phone_number,
      avatar_url: user.avatar_url,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error: unknown) {
    console.error("Error fetching profile:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch profile";
    return NextResponse.json({ error: message }, { status: 500 });
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

    const updateData: Partial<UserDoc> = {
      updatedAt: new Date(),
    };

    if (typeof body.full_name === "string") updateData.full_name = body.full_name;
    if (typeof body.phone_number === "string") updateData.phone_number = body.phone_number;
    if (body.notification_preferences && typeof body.notification_preferences === "object") {
      updateData.notification_preferences = body.notification_preferences as Record<string, unknown>;
    }
    if (typeof body.avatar_url === "string") updateData.avatar_url = body.avatar_url;

    const userQueryId = ObjectId.isValid(user._id) ? new ObjectId(user._id) : user._id;
    await db.collection<MongoUserDoc>("users").updateOne(
      { _id: userQueryId },
      { $set: updateData }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error updating profile:", error);
    const message = error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

