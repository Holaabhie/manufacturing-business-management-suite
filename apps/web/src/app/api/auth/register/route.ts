import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { createSession, type UserDoc } from "@/lib/auth-session";
import { logAuthEvent, getClientIp } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const fullName = String(body?.fullName ?? "").trim();
    const phone = String(body?.phone ?? "").trim();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;

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
      fullName: fullName || undefined, // Match Mongoose schema: fullName
      phone: phone || undefined,       // Match Mongoose schema: phone
      // RBAC defaults for new Admin registration
      status: "active",
      firstLoginCompleted: true,
      failedLoginAttempts: 0,
      lastLogin: now,
      lastActiveAt: now,
      notification_preferences: {
        stock_alerts: true,
        order_alerts: true,
        emailNotifications: true,
        pushNotifications: false,
      },
      createdAt: now,
      updatedAt: now,
    } as any);

    await createSession(userId, {
      role: "Admin",
      ipAddress,
      userAgent,
    });

    // Log registration
    logAuthEvent({
      organizationId: "",
      userId,
      userName: fullName || email,
      userRole: "Admin",
      action: "New admin account registered",
      actionType: "login",
      ipAddress,
      userAgent,
      severity: "info",
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Registration failed" }, { status: 500 });
  }
}
