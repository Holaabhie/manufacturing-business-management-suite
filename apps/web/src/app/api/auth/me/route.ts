import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { isDbUnavailableError } from "@/lib/mongodb";
import { resolvePermissions, type FlatPermissionMap } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Resolve permissions based on role + custom overrides
    const resolvedPermissions = resolvePermissions(
      user.role,
      user.customPermissions as FlatPermissionMap
    );

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName || user.full_name,
        phone: user.phone || user.phone_number,
        avatar_url: user.avatar_url,
        role: user.role,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        notification_preferences: user.notification_preferences,
        company_details: user.company_details,
        createdAt: user.createdAt,
        // RBAC fields
        organizationId: user.organizationId,
        adminId: user.adminId, // Staff: the admin who owns data
        employeeId: user.employeeId,
        department: user.department,
        permissions: user.permissions,
        customPermissions: user.customPermissions,
        resolvedPermissions,
        permissionTemplateId: user.permissionTemplateId,
        status: user.status,
        isActive: user.isActive !== false, // default true for existing users
        firstLoginCompleted: user.firstLoginCompleted,
        company_setup_complete: (user as any).company_setup_complete,
        otpDeliveryMethod: user.otpDeliveryMethod,
      },
    });
  } catch (error: any) {
    console.error("[me] Error:", error);
    if (isDbUnavailableError(error)) {
      return NextResponse.json(
        { error: "Service temporarily unavailable", user: null, success: false },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to get user data" },
      { status: 500 }
    );
  }
}
