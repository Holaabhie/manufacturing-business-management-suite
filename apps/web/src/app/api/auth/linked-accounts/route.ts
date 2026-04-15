import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getDb } from "@/lib/mongodb";
import { getSessionUser, type UserDoc } from "@/lib/auth-session";

/**
 * GET /api/auth/linked-accounts
 *
 * Returns all accounts linked to the current user.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const linkedIds: string[] = (user as any).linkedAccountIds || [];
    if (linkedIds.length === 0) {
      return NextResponse.json({ accounts: [], currentUserId: String(user._id) });
    }

    const db = await getDb();
    const linkedUsers = await db
      .collection<UserDoc>("users")
      .find(
        { _id: { $in: linkedIds as any[] } },
        {
          projection: {
            _id: 1,
            email: 1,
            role: 1,
            fullName: 1,
            full_name: 1,
            avatar_url: 1,
            status: 1,
          },
        }
      )
      .toArray();

    const accounts = linkedUsers
      .filter((u) => u.status !== "inactive" && u.status !== "suspended")
      .map((u) => ({
        id: String(u._id),
        email: u.email,
        role: u.role,
        fullName: u.fullName || u.full_name || "",
        avatar_url: u.avatar_url || "",
      }));

    return NextResponse.json({
      accounts,
      currentUserId: String(user._id),
    });
  } catch (e: any) {
    console.error("[linked-accounts GET] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch linked accounts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/linked-accounts
 *
 * Links a new account to the current user by verifying credentials.
 * Body: { email, password, loginType? } or { employeeId, password, loginType: "staff" }
 *
 * On success, both users get each other's ID in their linkedAccountIds array.
 */
export async function POST(req: Request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const loginType = String(body?.loginType ?? "admin");
    const employeeId = String(body?.employeeId ?? "").trim();

    const db = await getDb();
    let targetUser: UserDoc | null = null;

    // Find the target user
    if (loginType === "staff") {
      if (!employeeId || !password) {
        return NextResponse.json(
          { error: "Employee ID and password are required" },
          { status: 400 }
        );
      }
      targetUser = (await db.collection<UserDoc>("users").findOne({
        employeeId,
        role: "Staff",
      })) as UserDoc | null;
    } else {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required" },
          { status: 400 }
        );
      }
      targetUser = (await db
        .collection<UserDoc>("users")
        .findOne({ email })) as UserDoc | null;
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Cannot link to self
    if (String(targetUser._id) === String(currentUser._id)) {
      return NextResponse.json(
        { error: "Cannot link your own account" },
        { status: 400 }
      );
    }

    // Check if already linked
    const existingLinked: string[] =
      (currentUser as any).linkedAccountIds || [];
    if (existingLinked.includes(String(targetUser._id))) {
      return NextResponse.json(
        { error: "This account is already linked" },
        { status: 400 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(
      password,
      targetUser.passwordHash
    );
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check target user status
    if (
      targetUser.status === "inactive" ||
      targetUser.status === "suspended"
    ) {
      return NextResponse.json(
        { error: "That account is deactivated or suspended" },
        { status: 403 }
      );
    }

    const targetId = String(targetUser._id);
    const currentId = String(currentUser._id);

    // Add bidirectional link
    await db.collection<UserDoc>("users").updateOne(
      { _id: currentUser._id },
      { $addToSet: { linkedAccountIds: targetId } as any }
    );
    await db.collection<UserDoc>("users").updateOne(
      { _id: targetUser._id },
      { $addToSet: { linkedAccountIds: currentId } as any }
    );

    return NextResponse.json({
      ok: true,
      account: {
        id: targetId,
        email: targetUser.email,
        role: targetUser.role,
        fullName: targetUser.fullName || targetUser.full_name || "",
        avatar_url: targetUser.avatar_url || "",
      },
    });
  } catch (e: any) {
    console.error("[linked-accounts POST] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to link account" },
      { status: 500 }
    );
  }
}
