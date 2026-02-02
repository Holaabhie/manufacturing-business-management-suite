import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import type { WithId } from "mongodb";

// Re-export for backward compatibility with other files
export { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export type SessionDoc = {
  _id: string; // session id
  userId: string;
  createdAt: Date;
  expiresAt: Date;
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
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
  company_details?: CompanyDetails;
  createdAt: Date;
  updatedAt: Date;
};

export async function createSession(userId: string) {
  const db = await getDb();
  const sessionId = globalThis.crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days

  await db.collection<SessionDoc>("sessions").insertOne({
    _id: sessionId,
    userId,
    createdAt: now,
    expiresAt,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
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

  return db.collection<UserDoc>("users").findOne({ _id: session.userId });
}

