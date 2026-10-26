import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { getDb, isDbUnavailableError } from "@/lib/mongodb";
import { createSession, type UserDoc } from "@/lib/auth-session";
import { logAuthEvent, getClientIp } from "@/lib/audit";
import {
  checkRateLimitMongo,
  getHashedRateLimitKey,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { checkPasswordOrError } from "@/lib/password-policy";
import {
  RegisterSchema,
  normalizeIndianPhone,
} from "@/lib/auth-schemas";

export async function POST(req: Request) {
  try {
    const ipAddress = getClientIp(req);
    const rateLimitKey = getHashedRateLimitKey("register", ipAddress);
    const rateCheck = await checkRateLimitMongo(rateLimitKey, "register");
    if (rateCheck.limited) {
      return rateLimitResponse(rateCheck.retryAfterMs);
    }

    const rawBody = await req.json().catch(() => null);
    const parseResult = RegisterSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const firstErr = parseResult.error.issues[0];
      const field = firstErr?.path[0] as string;
      return NextResponse.json(
        {
          success: false,
          error: firstErr?.message || "Invalid registration data",
          fieldErrors: field ? { [field]: firstErr.message } : undefined,
        },
        { status: 400 }
      );
    }

    const { email, password, fullName, phone } = parseResult.data;

    // Normalize phone to E.164
    const phoneNorm = normalizeIndianPhone(phone);
    if (!phoneNorm) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid 10-digit Indian phone number",
          fieldErrors: { phone: "INVALID_PHONE" },
        },
        { status: 400 }
      );
    }

    // Rate limit per phone & per email identifier
    const phoneRateKey = getHashedRateLimitKey("register-phone", phoneNorm.e164);
    const phoneRateCheck = await checkRateLimitMongo(phoneRateKey, "register");
    if (phoneRateCheck.limited) {
      return rateLimitResponse(phoneRateCheck.retryAfterMs);
    }

    const emailRateKey = getHashedRateLimitKey("register-email", email.toLowerCase());
    const emailRateCheck = await checkRateLimitMongo(emailRateKey, "register");
    if (emailRateCheck.limited) {
      return rateLimitResponse(emailRateCheck.retryAfterMs);
    }

    // Check password policy
    const passwordError = checkPasswordOrError(password, {
      email,
      fullName: fullName || undefined,
    });
    if (passwordError) {
      return NextResponse.json(
        {
          success: false,
          error: passwordError,
          fieldErrors: { password: "WEAK_PASSWORD" },
        },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const db = await getDb();

    // Check email uniqueness (case-insensitive)
    const existingEmail = await db
      .collection<UserDoc>("users")
      .findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Email already registered",
          fieldErrors: { email: "EMAIL_TAKEN" },
        },
        { status: 409 }
      );
    }

    // Check phone uniqueness across candidate variations
    const existingPhone = await db
      .collection<UserDoc>("users")
      .findOne({
        $or: [
          { phone: { $in: phoneNorm.candidates } },
          { phone_number: { $in: phoneNorm.candidates } },
        ],
      });
    if (existingPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number already registered with another account",
          fieldErrors: { phone: "PHONE_TAKEN" },
        },
        { status: 409 }
      );
    }

    // Create User with normalized E.164 phone
    const now = new Date();
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);

    await db.collection<UserDoc>("users").insertOne({
      _id: userId,
      email: email.toLowerCase(),
      passwordHash,
      role: "Admin",
      subscription_tier: "starter",
      subscription_status: "active",
      fullName: fullName || undefined,
      phone: phoneNorm.e164,
      company_setup_complete: false,
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
    });

    // Create session (persistent for registration auto-login)
    await createSession(userId, {
      role: "Admin",
      ipAddress,
      userAgent,
      provider: "credentials",
      rememberMe: true,
    });

    // Audit log
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

    return NextResponse.json({ ok: true, success: true, company_setup_complete: false });
  } catch (e: unknown) {
    console.error("[register] Error:", e);
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again in a moment.", success: false },
        { status: 503 }
      );
    }
    const message = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    );
  }
}
