import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { getDb, isDbUnavailableError } from "@/lib/mongodb";
import { createSession, type UserDoc } from "@/lib/auth-session";
import { logAuthEvent, getClientIp } from "@/lib/audit";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { checkPasswordOrError } from "@/lib/password-policy";

export async function POST(req: Request) {
  try {
    // ─── Rate Limiting ──────────────────────────────────────────
    const rateLimitKey = getRateLimitKey(req, "register");
    const rateCheck = checkRateLimit(rateLimitKey, "register");
    if (rateCheck.limited) {
      return rateLimitResponse(rateCheck.retryAfterMs);
    }

    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const fullName = String(body?.fullName ?? "").trim();
    const phone = String(body?.phone ?? "").trim();

    // ─── Input Validation ───────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // ─── Password Policy Enforcement ────────────────────────────
    const passwordError = checkPasswordOrError(password, {
      email,
      fullName: fullName || undefined,
    });
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
        { status: 400 }
      );
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;

    const db = await getDb();

    // ─── Check Existing User ────────────────────────────────────
    const existing = await db
      .collection<UserDoc>("users")
      .findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // ─── Create User ────────────────────────────────────────────
    const now = new Date();
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12); // 12 rounds for stronger hash

    await db.collection<UserDoc>("users").insertOne({
      _id: userId,
      email,
      passwordHash,
      role: "Admin",
      subscription_tier: "starter",
      subscription_status: "active",
      fullName: fullName || undefined,
      phone: phone || undefined,
      // Company setup tracking
      company_setup_complete: false,
      // RBAC defaults
      status: "active",
      firstLoginCompleted: true,
      failedLoginAttempts: 0,
      lastLogin: now,
      lastActiveAt: now,
      passwordChangedAt: now,
      notification_preferences: {
        stock_alerts: true,
        order_alerts: true,
        emailNotifications: true,
        pushNotifications: false,
      },
      createdAt: now,
      updatedAt: now,
    } as any);

    // ─── Create Session ─────────────────────────────────────────
    await createSession(userId, {
      role: "Admin",
      ipAddress,
      userAgent,
      provider: "credentials",
    });

    // ─── Audit Log ──────────────────────────────────────────────
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
    console.error("[register] Error:", e);
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again in a moment.", success: false },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: e?.message ?? "Registration failed" },
      { status: 500 }
    );
  }
}
