import { NextResponse } from "next/server";
import { getSessionUser, type UserDoc, type MongoUserDoc } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const db = await getDb();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const userQueryId = ObjectId.isValid(user._id) ? new ObjectId(user._id) : user._id;
    await db.collection<MongoUserDoc>("users").updateOne(
      { _id: userQueryId },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error updating password:", error);
    const message = error instanceof Error ? error.message : "Failed to update password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
