import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import type { WithId } from "mongodb";
import type { PermissionMap } from "@/lib/permissions";

// Re-export for backward compatibility with other files
export { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

// ─── Refresh token cookie name ──────────────────────────────────
export const REFRESH_COOKIE_NAME = "refresh_token";

// ─── Session Configuration ──────────────────────────────────────
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours (access session)
const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days (refresh token)
const SLIDING_WINDOW_MS = 1000 * 60 * 60 * 4; // Renew if >4 hours old

export type SessionDoc = {
  _id: string; // session id
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  // Refresh token
  refreshToken?: string;
  refreshExpiresAt?: Date;
  // Session tracking fields
  organizationId?: string;
  role?: "Admin" | "Staff";
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  lastActiveAt?: Date;
  // Security
  rotatedAt?: Date; // Last time session was rotated
  provider?: string; // "credentials" | "google" | "microsoft-entra-id"
};

// Company details interface
export interface CompanyDetails {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  gstin?: string;
  pan?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  upiId?: string;
}

export type UserDoc = {
  _id: string;
  email: string;
  passwordHash: string;
  role: "Admin" | "Staff";
  subscription_tier: "starter" | "pro";
  subscription_status?: string;
  notification_preferences?: Record<string, unknown>;
  fullName?: string;
  phone?: string;
  full_name?: string; // Legacy support
  phone_number?: string; // Legacy support
  avatar_url?: string;
  company_details?: CompanyDetails;
  createdAt: Date;
  updatedAt: Date;
  // RBAC fields
  organizationId?: string;
  adminId?: string; // Staff users: the admin who created them
  employeeId?: string;
  department?: string;
  designation?: string;
  permissions?: PermissionMap;
  permissionTemplateId?: string;
  status?: "active" | "inactive" | "suspended" | "pending_setup";
  firstLoginCompleted?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  lastLogin?: Date;
  lastActiveAt?: Date;
  passwordChangedAt?: Date;
  otpDeliveryMethod?: "email" | "sms" | "authenticator";
  invitedBy?: string;
  invitationId?: string;
};

/**
 * Returns the correct data-scoping ID for the current user.
 * - Admin users → their own _id (they own the data)
 * - Staff users → their adminId (they see admin's data)
 *
 * This MUST be used in place of raw `user._id.toString()` in ALL
 * data-fetching API routes so Staff can see admin data.
 */
export function getDataOwnerId(user: WithId<UserDoc> | UserDoc): string {
  if (user.role === "Staff" && user.adminId) {
    return user.adminId;
  }
  return String(user._id);
}

// ─── Create Session with Refresh Token ──────────────────────────

export async function createSession(
  userId: string,
  metadata?: {
    organizationId?: string;
    role?: "Admin" | "Staff";
    ipAddress?: string;
    userAgent?: string;
    provider?: string;
  }
) {
  const db = await getDb();
  const sessionId = globalThis.crypto.randomUUID();
  const refreshToken = globalThis.crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const refreshExpiresAt = new Date(now.getTime() + REFRESH_TTL_MS);

  await db.collection<SessionDoc>("sessions").insertOne({
    _id: sessionId,
    userId,
    createdAt: now,
    expiresAt,
    refreshToken,
    refreshExpiresAt,
    organizationId: metadata?.organizationId,
    role: metadata?.role,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
    lastActiveAt: now,
    rotatedAt: now,
    provider: metadata?.provider || "credentials",
  });

  const jar = await cookies();

  // Set session cookie (shorter-lived)
  jar.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  // Set refresh token cookie (longer-lived)
  jar.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: refreshExpiresAt,
  });

  return sessionId;
}

// ─── Rotate Session (Refresh Token Strategy) ────────────────────

export async function rotateSession(
  oldSessionId: string
): Promise<string | null> {
  const db = await getDb();
  const oldSession = await db
    .collection<SessionDoc>("sessions")
    .findOne({ _id: oldSessionId });

  if (!oldSession) return null;

  // Delete old session
  await db.collection<SessionDoc>("sessions").deleteOne({ _id: oldSessionId });

  // Create new session inheriting metadata
  return createSession(oldSession.userId, {
    organizationId: oldSession.organizationId,
    role: oldSession.role,
    ipAddress: oldSession.ipAddress,
    userAgent: oldSession.userAgent,
    provider: oldSession.provider,
  });
}

// ─── Refresh Token Flow ─────────────────────────────────────────

export async function refreshSession(): Promise<{
  success: boolean;
  error?: string;
}> {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return { success: false, error: "No refresh token" };
  }

  const db = await getDb();
  const session = await db
    .collection<SessionDoc>("sessions")
    .findOne({ refreshToken });

  if (!session) {
    // Potential stolen token — clear cookies
    jar.delete(SESSION_COOKIE_NAME);
    jar.delete(REFRESH_COOKIE_NAME);
    return { success: false, error: "Invalid refresh token" };
  }

  // Check if refresh token expired
  if (
    session.refreshExpiresAt &&
    session.refreshExpiresAt.getTime() < Date.now()
  ) {
    await db.collection<SessionDoc>("sessions").deleteOne({ _id: session._id });
    jar.delete(SESSION_COOKIE_NAME);
    jar.delete(REFRESH_COOKIE_NAME);
    return { success: false, error: "Refresh token expired" };
  }

  // Check if user still active
  const user = await db
    .collection<UserDoc>("users")
    .findOne({ _id: session.userId });
  if (!user || user.status === "inactive" || user.status === "suspended") {
    await db
      .collection<SessionDoc>("sessions")
      .deleteMany({ userId: session.userId });
    jar.delete(SESSION_COOKIE_NAME);
    jar.delete(REFRESH_COOKIE_NAME);
    return { success: false, error: "Account deactivated" };
  }

  // Rotate session — new session ID, new refresh token
  await rotateSession(session._id);
  return { success: true };
}

// ─── Destroy Session ────────────────────────────────────────────

export async function destroySession() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    const db = await getDb();
    await db.collection<SessionDoc>("sessions").deleteOne({ _id: sessionId });
  }
  jar.delete(SESSION_COOKIE_NAME);
  jar.delete(REFRESH_COOKIE_NAME);
}

/**
 * Destroy all sessions for a specific user (used when Admin deactivates Staff).
 */
export async function destroyAllUserSessions(userId: string) {
  const db = await getDb();
  await db.collection<SessionDoc>("sessions").deleteMany({ userId });
}

/**
 * Get all active sessions for a user (for Admin session management).
 */
export async function getUserSessions(userId: string): Promise<SessionDoc[]> {
  const db = await getDb();
  return db
    .collection<SessionDoc>("sessions")
    .find({ userId, expiresAt: { $gt: new Date() } })
    .sort({ lastActiveAt: -1 })
    .toArray() as unknown as SessionDoc[];
}

// ─── Get Session User (with Sliding Window Renewal) ─────────────

export async function getSessionUser(): Promise<WithId<UserDoc> | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    // Try refresh token
    const refreshToken = jar.get(REFRESH_COOKIE_NAME)?.value;
    if (refreshToken) {
      const refreshResult = await refreshSession();
      if (refreshResult.success) {
        // Re-read the new session cookie
        const newSessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
        if (newSessionId) {
          return getSessionUserById(newSessionId);
        }
      }
    }

    // ── Fallback: Bridge NextAuth (OAuth) session ────────────────
    // When a user logs in via Google/Microsoft, they have a valid NextAuth
    // JWT but may not have a custom session cookie. Auto-bridge it here.
    return tryNextAuthBridge();
  }

  // If custom session exists but is invalid/expired, getSessionUserById
  // will attempt refresh. If that also fails, try NextAuth bridge.
  const user = await getSessionUserById(sessionId);
  if (user) return user;

  return tryNextAuthBridge();
}

/**
 * Attempt to bridge a NextAuth JWT session into the custom session system.
 * Called when no valid custom session exists but the user might have a
 * valid NextAuth OAuth session (Google, Microsoft, etc.).
 *
 * Also handles DEV_MODE auto-login: when DEV_MODE=true, automatically
 * authenticates as the first Admin user in the database.
 */
async function tryNextAuthBridge(): Promise<WithId<UserDoc> | null> {
  // 1. Try NextAuth session bridge
  try {
    const { auth } = await import("@/auth");
    const nextAuthSession = await auth();

    if (nextAuthSession?.user?.email) {
      const db = await getDb();
      const user = await db
        .collection<UserDoc>("users")
        .findOne({ email: nextAuthSession.user.email });

      if (user) {
        // Auto-create a custom session so future API calls work directly
        await createSession(String(user._id), {
          role: user.role,
          organizationId: user.organizationId,
          provider: "nextauth-bridge",
        });
        return user as WithId<UserDoc>;
      }
    }
  } catch {
    // NextAuth not available — continue to dev mode fallback
  }

  // 2. DEV_MODE auto-login — find first Admin user and auto-authenticate
  //    SECURITY: The dev-mode module already crashes the app at startup
  //    if DEV_MODE=true in production, so this is safe.
  try {
    const { isDevMode } = await import("@/lib/features/dev-mode");
    if (isDevMode()) {
      const db = await getDb();
      const adminUser = await db
        .collection<UserDoc>("users")
        .findOne({ role: "Admin" }, { sort: { createdAt: -1 } });

      if (adminUser) {
        console.warn("⚠️ DEV_MODE: Auto-authenticating as", adminUser.email);
        await createSession(String(adminUser._id), {
          role: adminUser.role,
          organizationId: adminUser.organizationId,
          provider: "dev-mode-auto",
        });
        return adminUser as WithId<UserDoc>;
      }
    }
  } catch (e) {
    console.warn("[getSessionUser] DEV_MODE auto-login failed:", e instanceof Error ? e.message : String(e));
  }

  return null;
}

/**
 * Internal: resolve session → user by session ID
 */
async function getSessionUserById(
  sessionId: string
): Promise<WithId<UserDoc> | null> {
  const db = await getDb();
  const session = await db
    .collection<SessionDoc>("sessions")
    .findOne({ _id: sessionId });
  if (!session) return null;

  // Check expiry
  if (session.expiresAt.getTime() < Date.now()) {
    // Try refresh
    const refreshResult = await refreshSession();
    if (!refreshResult.success) {
      await db
        .collection<SessionDoc>("sessions")
        .deleteOne({ _id: sessionId });
      const jar = await cookies();
      jar.delete(SESSION_COOKIE_NAME);
      jar.delete(REFRESH_COOKIE_NAME);
      return null;
    }
    // After refresh, re-read new session
    const jar = await cookies();
    const newSessionId = jar.get(SESSION_COOKIE_NAME)?.value;
    if (newSessionId && newSessionId !== sessionId) {
      return getSessionUserById(newSessionId);
    }
    return null;
  }

  // Sliding window — extend session if past half-life
  const age = Date.now() - session.createdAt.getTime();
  if (age > SLIDING_WINDOW_MS) {
    const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    db.collection<SessionDoc>("sessions")
      .updateOne(
        { _id: sessionId },
        {
          $set: {
            expiresAt: newExpiresAt,
            lastActiveAt: new Date(),
          },
        }
      )
      .catch(() => { }); // Non-blocking
  } else {
    // Just update lastActiveAt
    db.collection<SessionDoc>("sessions")
      .updateOne({ _id: sessionId }, { $set: { lastActiveAt: new Date() } })
      .catch(() => { });
  }

  const user = await db
    .collection<UserDoc>("users")
    .findOne({ _id: session.userId });

  // Check if user is deactivated/suspended
  if (
    user &&
    (user.status === "inactive" || user.status === "suspended")
  ) {
    await db
      .collection<SessionDoc>("sessions")
      .deleteOne({ _id: sessionId });
    const jar = await cookies();
    jar.delete(SESSION_COOKIE_NAME);
    jar.delete(REFRESH_COOKIE_NAME);
    return null;
  }

  return user;
}
