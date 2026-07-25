import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getDb, isDbUnavailableError } from "@/lib/mongodb";
import { createSession, type UserDoc } from "@/lib/auth-session";
import { logAuthEvent, getClientIp } from "@/lib/audit";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { checkPasswordOrError } from "@/lib/password-policy";
import { detectSuspiciousLogin } from "@/lib/suspicious-login";

export async function POST(req: Request) {
  try {
    // ─── Rate Limiting ──────────────────────────────────────────
    const rateLimitKey = getRateLimitKey(req, "login");
    const rateCheck = checkRateLimit(rateLimitKey, "login");
    if (rateCheck.limited) {
      return rateLimitResponse(rateCheck.retryAfterMs);
    }

    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const loginType = String(body?.loginType ?? "admin"); // "admin" or "staff"
    const employeeId = String(body?.employeeId ?? "").trim();
    const masterKey = String(body?.masterKey ?? "").trim();

    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;

    // ─── Validation ─────────────────────────────────────────────
    if (loginType === "staff") {
      // Staff login: identifier (employeeId or email) + password
      const identifier = (body?.employeeId || body?.email || "").toString().trim();
      if (!identifier || !password) {
        return NextResponse.json(
          { success: false, message: "Employee ID or email and password are required" },
          { status: 400 }
        );
      }
    } else {
      // Admin login: email + password
      if (!email || !password) {
        return NextResponse.json(
          { success: false, message: "Email and password are required" },
          { status: 400 }
        );
      }
    }

    const db = await getDb();
    let user: UserDoc | null = null;

    // ─── Find User ──────────────────────────────────────────────
    if (loginType === "staff") {
      // Staff identifier dual-lookup: accept email or employeeId
      const identifier = (body?.employeeId || body?.email || "").toString().trim();
      user = (await db.collection<UserDoc>("users").findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { employeeId: identifier },
        ],
        role: "Staff",
      })) as UserDoc | null;

      // ─── Collision Guard ────────────────────────────────────────
      if (
        user &&
        user.employeeId === identifier &&
        user.email !== identifier.toLowerCase()
      ) {
        const count = await db
          .collection("users")
          .countDocuments({ employeeId: identifier, role: "Staff" });
        if (count > 1) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Multiple accounts found with this Employee ID. Please log in with your email address.",
            },
            { status: 409 }
          );
        }
      }
    } else {
      user = (await db
        .collection<UserDoc>("users")
        .findOne({ email })) as UserDoc | null;
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            loginType === "staff"
              ? "Invalid employee ID or password"
              : "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // ─── Account Status Check ───────────────────────────────────
    if (user.status === "inactive") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account has been deactivated. Contact your administrator.",
        },
        { status: 403 }
      );
    }
    if (user.status === "suspended") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account has been suspended. Contact your administrator.",
        },
        { status: 403 }
      );
    }

    // ─── Account Lockout Check ──────────────────────────────────
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.lockedUntil).getTime() - Date.now()) / (1000 * 60)
      );

      // Log security event
      logAuthEvent({
        organizationId: user.organizationId || "",
        userId: user._id,
        userName: user.fullName || user.full_name || user.email,
        userRole: user.role as any,
        action: "Login attempt on locked account",
        actionType: "security",
        ipAddress,
        userAgent,
        severity: "warning",
        details: `Account locked for ${remainingMinutes} more minutes`,
      });

      return NextResponse.json(
        {
          success: false,
          message: `Account temporarily locked. Try again in ${remainingMinutes} minute(s).`,
          locked: true,
          remainingMinutes,
        },
        { status: 423 }
      );
    }

    // ─── Password Verification ──────────────────────────────────
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      // Increment failed attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = 5;
      const lockoutMinutes = user.role === "Admin" ? 15 : 30;

      const updateFields: Record<string, any> = {
        failedLoginAttempts: failedAttempts,
      };

      if (failedAttempts >= maxAttempts) {
        updateFields.lockedUntil = new Date(
          Date.now() + lockoutMinutes * 60 * 1000
        );
      }

      await db.collection<UserDoc>("users").updateOne(
        { _id: user._id },
        { $set: updateFields }
      );

      // Log failed attempt
      logAuthEvent({
        organizationId: user.organizationId || "",
        userId: user._id,
        userName: user.fullName || user.full_name || user.email,
        userRole: user.role as any,
        action: `Failed login attempt (${failedAttempts}/${maxAttempts})`,
        actionType: "security",
        ipAddress,
        userAgent,
        severity: failedAttempts >= maxAttempts ? "critical" : "warning",
        details:
          failedAttempts >= maxAttempts
            ? `Account locked for ${lockoutMinutes} minutes`
            : undefined,
      });

      if (failedAttempts >= maxAttempts) {
        return NextResponse.json(
          {
            success: false,
            message: `Too many failed attempts. Account locked for ${lockoutMinutes} minutes.`,
            locked: true,
          },
          { status: 423 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            loginType === "staff"
              ? "Invalid employee ID or password"
              : "Invalid email or password",
          attemptsRemaining: maxAttempts - failedAttempts,
        },
        { status: 401 }
      );
    }

    // ─── Admin Master Key Verification (if provided) ────────────
    if (loginType === "admin" && user.role === "Admin" && masterKey) {
      // Verify master key against organization
      if (user.organizationId) {
        const org = await db.collection("organizations").findOne({
          _id: user.organizationId as any,
        });
        if (org && org.masterKey) {
          const masterKeyValid = await bcrypt.compare(masterKey, org.masterKey);
          if (!masterKeyValid) {
            logAuthEvent({
              organizationId: user.organizationId,
              userId: user._id,
              userName: user.fullName || user.full_name || user.email,
              userRole: "Admin",
              action: "Invalid master key during login",
              actionType: "security",
              ipAddress,
              userAgent,
              severity: "critical",
            });

            return NextResponse.json(
              { success: false, message: "Invalid organization master key" },
              { status: 401 }
            );
          }
        }
      }
    }

    // ─── Role Mismatch Prevention ───────────────────────────────
    if (loginType === "admin" && user.role !== "Admin") {
      return NextResponse.json(
        { success: false, message: "This login portal is for administrators only" },
        { status: 403 }
      );
    }
    if (loginType === "staff" && user.role !== "Staff") {
      return NextResponse.json(
        { success: false, message: "This login portal is for staff members only" },
        { status: 403 }
      );
    }

    // ─── Staff OTP Requirement Check ────────────────────────────
    if (loginType === "staff" && user.role === "Staff") {
      // Check if org requires OTP for staff
      let otpRequired = false;
      if (user.organizationId) {
        const org = await db.collection("organizations").findOne({
          _id: user.organizationId as any,
        });
        otpRequired = org?.settings?.staffOtpRequired ?? false;
      }

      if (otpRequired) {
        // Don't create session yet — return OTP required flag
        // The frontend will show OTP screen and call /api/auth/send-otp
        return NextResponse.json({
          ok: false,
          otpRequired: true,
          userId: user._id,
          otpDeliveryMethod: user.otpDeliveryMethod || "email",
          message: "OTP verification required",
        });
      }
    }

    // ─── Suspicious Login Detection ────────────────────────────
    const suspiciousResult = await detectSuspiciousLogin({
      userId: user._id,
      userName: user.fullName || user.full_name || user.email,
      userRole: user.role as any,
      organizationId: user.organizationId || "",
      ipAddress,
      userAgent,
      email: user.email,
    });

    if (suspiciousResult.action === "block") {
      return NextResponse.json(
        {
          success: false,
          message: "Login blocked due to unusual activity. Please verify your identity or contact support.",
          suspicious: true,
          reasons: suspiciousResult.reasons,
        },
        { status: 403 }
      );
    }

    // ─── Successful Login ───────────────────────────────────────
    // Reset failed attempts
    await db.collection<UserDoc>("users").updateOne(
      { _id: user._id },
      {
        $set: {
          failedLoginAttempts: 0,
          lockedUntil: undefined,
          lastLogin: new Date(),
          lastActiveAt: new Date(),
        },
      }
    );

    // Create session with metadata
    await createSession(user._id, {
      organizationId: user.organizationId,
      role: user.role,
      ipAddress,
      userAgent,
      provider: "credentials",
    });

    // Log successful login
    logAuthEvent({
      organizationId: user.organizationId || "",
      userId: user._id,
      userName: user.fullName || user.full_name || user.email,
      userRole: user.role as any,
      action: "Logged in successfully",
      actionType: "login",
      ipAddress,
      userAgent,
      severity: "info",
    });

    return NextResponse.json({
      ok: true,
      // Return setup status for Staff first-time login redirect
      firstLoginCompleted: user.firstLoginCompleted ?? true,
      role: user.role,
    });
  } catch (e: any) {
    console.error("[login] Error:", e);
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { success: false, message: "Service temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, message: e?.message ?? "Login failed" },
      { status: 500 }
    );
  }
}
