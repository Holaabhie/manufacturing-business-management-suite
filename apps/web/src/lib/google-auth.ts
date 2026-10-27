import { getDb } from "@/lib/mongodb";
import type { UserDoc } from "@/lib/auth-session";
import { generateId } from "@/lib/uuid";

export interface GoogleUserProfile {
  email: string;
  googleId: string;
  name?: string | null;
  picture?: string | null;
  emailVerified?: boolean;
}

export interface GoogleAuthResult {
  user: UserDoc & { _id: string; company_setup_complete?: boolean };
  isNewUser: boolean;
}

/**
 * Finds or creates an Admin user signing in via Google (OAuth or One Tap).
 * - Normalizes email.
 * - Rejects unverified email (emailVerified !== true).
 * - Links googleId and updates timestamps if user exists.
 * - If user does not exist, creates a new Admin user with phone OMITTED.
 * - Uses shared database connection pool to eliminate BSON version mismatch.
 */
export async function findOrCreateGoogleAdminUser({
  email,
  googleId,
  name,
  picture,
  emailVerified = true,
}: GoogleUserProfile): Promise<GoogleAuthResult> {
  if (emailVerified !== true) {
    throw new Error("Google account email is not verified");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const db = await getDb();
  const usersCollection = db.collection<UserDoc>("users");

  const existingUser = await usersCollection.findOne({ email: normalizedEmail });

  if (existingUser) {
    const updateFields: Record<string, unknown> = {
      googleId,
      isEmailVerified: true,
      lastLogin: new Date(),
      lastActiveAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
      ...(picture && !existingUser.avatar_url ? { avatar_url: picture } : {}),
    };
    await usersCollection.updateOne(
      { _id: existingUser._id },
      { $set: updateFields as Partial<UserDoc> }
    );
    const updated = await usersCollection.findOne({ _id: existingUser._id });
    if (!updated) {
      throw new Error("Failed to retrieve updated user");
    }
    return {
      user: { ...updated, _id: String(updated._id) },
      isNewUser: false,
    };
  }

  // Create new Admin user — phone is explicitly OMITTED so it never conflicts with unique indexes
  const now = new Date();
  const newUserId = generateId();

  const newDoc: UserDoc = {
    _id: newUserId,
    email: normalizedEmail,
    fullName: name || normalizedEmail.split("@")[0],
    role: "Admin",
    status: "active",
    subscription_tier: "starter",
    subscription_status: "active",
    firstLoginCompleted: true,
    company_setup_complete: false,
    failedLoginAttempts: 0,
    lastLogin: now,
    lastActiveAt: now,
    avatar_url: picture || "",
    createdAt: now,
    updatedAt: now,
    notification_preferences: {
      stock_alerts: true,
      daily_reports: false,
      order_alerts: true,
      emailNotifications: true,
      pushNotifications: false,
    },
  };

  await usersCollection.insertOne(newDoc);

  return {
    user: newDoc,
    isNewUser: true,
  };
}
