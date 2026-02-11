import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import type { WithId } from "mongodb";
import type { PermissionMap } from "@/lib/permissions";

// Re-export for backward compatibility with other files
export { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export type SessionDoc = {
  _id: string; // session id
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  // ─── New session tracking fields ──────────────────────────────
  organizationId?: string;
  role?: "Admin" | "Staff";
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  lastActiveAt?: Date;
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
  fullName?: string; // Standardized to camelCase
  phone?: string;    // Standardized to match Mongoose schema
  full_name?: string; // Legacy support
  phone_number?: string; // Legacy support
  avatar_url?: string;
  company_details?: CompanyDetails;
  createdAt: Date;
  updatedAt: Date;
  // ─── New RBAC fields ──────────────────────────────────────────
  organizationId?: string;
  employeeId?: string;
  department?: string;
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

export async function createSession(userId: string, metadata?: {
  organizationId?: string;
  role?: "Admin" | "Staff";
  ipAddress?: string;
  userAgent?: string;
}) {
  const db = await getDb();
  const sessionId = globalThis.crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days

  await db.collection<SessionDoc>("sessions").insertOne({
    _id: sessionId,
    userId,
    createdAt: now,
    expiresAt,
    // New tracking fields
    organizationId: metadata?.organizationId,
    role: metadata?.role,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
    lastActiveAt: now,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return sessionId;
}

export async function destroySession() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    const db = await getDb();
    await db.collection<SessionDoc>("sessions").deleteOne({ _id: sessionId });
  }
  jar.delete(SESSION_COOKIE_NAME);
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
  return db.collection<SessionDoc>("sessions")
    .find({ userId, expiresAt: { $gt: new Date() } })
    .sort({ lastActiveAt: -1 })
    .toArray() as unknown as SessionDoc[];
}

export async function getSessionUser(): Promise<WithId<UserDoc> | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const db = await getDb();
  const session = await db.collection<SessionDoc>("sessions").findOne({ _id: sessionId });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.collection<SessionDoc>("sessions").deleteOne({ _id: sessionId });
    jar.delete(SESSION_COOKIE_NAME);
    return null;
  }

  // Update last active timestamp (non-blocking)
  db.collection<SessionDoc>("sessions").updateOne(
    { _id: sessionId },
    { $set: { lastActiveAt: new Date() } }
  ).catch(() => { }); // Don't fail if update fails

  const user = await db.collection<UserDoc>("users").findOne({ _id: session.userId });

  // Check if user is deactivated/suspended
  if (user && (user.status === 'inactive' || user.status === 'suspended')) {
    await db.collection<SessionDoc>("sessions").deleteOne({ _id: sessionId });
    jar.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return user;
}
