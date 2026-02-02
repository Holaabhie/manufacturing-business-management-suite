import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { createSession, type UserDoc } from "@/lib/auth-session";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection<UserDoc>("users").findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const now = new Date();
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await db.collection<UserDoc>("users").insertOne({
      _id: userId,
      email,
      passwordHash,
      role: "Admin",
      subscription_tier: "starter",
      subscription_status: "active",
      notification_preferences: {
        stock_alerts: true,
        order_alerts: true,
        emailNotifications: true,
        pushNotifications: false,
      },
      createdAt: now,
      updatedAt: now,
    });

    await createSession(userId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Registration failed" }, { status: 500 });
  }
}

