import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getDb, isDbUnavailableError } from "@/lib/mongodb";
import { createSession, type UserDoc } from "@/lib/auth-session";
import { logAuthEvent, getClientIp } from "@/lib/audit";
import {
  checkRateLimitMongo,
  getHashedRateLimitKey,
  getClientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { LoginSchema } from "@/lib/auth-schemas";
import { checkPasswordOrError } from "@/lib/password-policy";
import { detectSuspiciousLogin } from "@/lib/suspicious-login";

export async function POST(req: Request) {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;

    // ─── IP Rate Limiting ───────────────────────────────────────
    const ipRateLimitKey = getHashedRateLimitKey("login-ip", ipAddress);
    const rateCheck = await checkRateLimitMongo(ipRateLimitKey, "login");
    if (rateCheck.limited) {
      return rateLimitResponse(rateCheck.retryAfterMs);
    }

    const rawBody = await req.json().catch(() => null);
    const parseResult = LoginSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || "Invalid login credentials",
        },
        { status: 400 }
      );
    }

    const { email = "", password, loginType, employeeId = "", masterKey = "", rememberMe = false } = parseResult.data;

    // ─── Account / Identifier Rate Limiting (keyed by IP + identifier to prevent denial-of-service lockout) ───
    const identifier = (loginType === "staff" ? (employeeId || email) : email).trim().toLowerCase();
    const idRateLimitKey = getHashedRateLimitKey("login-ip-id", `${ipAddress}:${identifier}`);
    const idRateCheck = await checkRateLimitMongo(idRateLimitKey, "login");
    if (idRateCheck.limited) {
      return rateLimitResponse(idRateCheck.retryAfterMs);
    }

    // ─── Per-Identifier Backstop Rate Limit (30 attempts/hr across all IPs) ───
    // Does NOT hard lock the account, but requires OTP step-up to prevent brute-force attacks
    const backstopKey = getHashedRateLimitKey("login-backstop", identifier);
    const backstopCheck = await checkRateLimitMongo(backstopKey, "loginBackstop");
    if (backstopCheck.limited) {
      return NextResponse.json(
        {
          success: false,
          error: "High volume of failed login attempts detected on this account. Please use OTP login or wait before trying password login again.",
          stepUp: "otp",
          retryAfter: Math.ceil(backstopCheck.retryAfterMs / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(backstopCheck.retryAfterMs / 1000)),
          },
        }
      );
    }

    const db = await getDb();
    let user: UserDoc | null = null;

    // ─── Find User ──────────────────────────────────────────────
    if (loginType === "staff") {
      // Staff identifier dual-lookup: accept email or employeeId
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
      rememberMe: Boolean(rememberMe),
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
      company_setup_complete: user.company_setup_complete,
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
