import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import {
  getSessionUser,
  destroySession,
  createSession,
  type UserDoc,
} from "@/lib/auth-session";

/**
 * POST /api/auth/switch-account
 *
 * Switches the current session to a different linked account.
 * 1. Validates the caller is authenticated
 * 2. Verifies the target user exists, is active, and is linked
 * 3. Destroys the current session
 * 4. Creates a new session for the target user
 * 5. Returns target user role + id for client-side redirect
 */
export async function POST(req: Request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const targetUserId = body?.targetUserId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "targetUserId is required" },
        { status: 400 }
      );
    }

    // Cannot switch to the same account
    if (targetUserId === String(currentUser._id)) {
      return NextResponse.json(
        { error: "Already using this account" },
        { status: 400 }
      );
    }

    // Verify the target is in the current user's linked accounts
    const linkedIds: string[] = (currentUser as any).linkedAccountIds || [];
    if (!linkedIds.includes(targetUserId)) {
      return NextResponse.json(
        { error: "This account is not linked to your profile" },
        { status: 403 }
      );
    }

    // Fetch target user from DB
    const db = await getDb();
    const targetUser = await db
      .collection<UserDoc>("users")
      .findOne({ _id: targetUserId as any });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target account not found" },
        { status: 404 }
      );
    }

    // Check target user status
    if (
      targetUser.status === "inactive" ||
      targetUser.status === "suspended"
    ) {
      return NextResponse.json(
        { error: "Target account is deactivated or suspended" },
        { status: 403 }
      );
    }

    // Destroy current session
    await destroySession();

    // Create new session for target user
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || undefined;

    await createSession(String(targetUser._id), {
      organizationId: targetUser.organizationId,
      role: targetUser.role,
      ipAddress,
      userAgent,
      provider: "account-switch",
    });

    // Update last login on target user
    await db.collection<UserDoc>("users").updateOne(
      { _id: targetUser._id },
      {
        $set: {
          lastLogin: new Date(),
          lastActiveAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      ok: true,
      user: {
        id: String(targetUser._id),
        email: targetUser.email,
        role: targetUser.role,
        fullName: targetUser.fullName || targetUser.full_name,
      },
    });
  } catch (e: any) {
    console.error("[switch-account] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to switch account" },
      { status: 500 }
    );
  }
}
