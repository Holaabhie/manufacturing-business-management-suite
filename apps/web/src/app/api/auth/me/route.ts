import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { ADMIN_PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  // Resolve effective permissions
  const isAdmin = user.role === "Admin";
  const permissions = isAdmin
    ? ADMIN_PERMISSIONS
    : (user as any).permissions ?? null;

  return NextResponse.json({
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      subscription_tier: user.subscription_tier,
      full_name: user.fullName ?? (user as any).full_name ?? null,
      phone_number: user.phone ?? (user as any).phone_number ?? null,
      avatar_url: user.avatar_url ?? null,
      notification_preferences: user.notification_preferences ?? null,
      // ─── New RBAC fields ──────────────────────────────────────
      organizationId: (user as any).organizationId ?? null,
      employeeId: (user as any).employeeId ?? null,
      department: (user as any).department ?? null,
      status: (user as any).status ?? "active",
      permissions,
      firstLoginCompleted: (user as any).firstLoginCompleted ?? true,
    },
  });
}
