import { NextRequest } from "next/server";
import { getSessionUser, getDataOwnerId, SESSION_COOKIE_NAME, type SessionDoc, type UserDoc } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

/**
 * Tenant-scoped user ID extractor for banking idempotency.
 * Scopes idempotency keys to the tenant owner ID so multiple sessions
 * of the same organization / tenant share the same idempotency scope.
 */
export async function getBankingTenantUserId(request: NextRequest): Promise<string> {
  try {
    const user = await getSessionUser();
    if (user) {
      return getDataOwnerId(user);
    }
  } catch {
    // Fallback to checking session cookie directly if next/headers cookies() throws
  }

  try {
    const sessionId =
      request.cookies.get(SESSION_COOKIE_NAME)?.value ||
      request.cookies.get("session_id")?.value;
    if (sessionId) {
      const db = await getDb();
      const session = await db.collection<SessionDoc>("sessions").findOne({ _id: sessionId });
      if (session) {
        const u = await db.collection<UserDoc>("users").findOne({ _id: session.userId });
        if (u) return getDataOwnerId(u);
      }
    }
  } catch {
    // Ignore fallback errors
  }

  return "anon_banking";
}
