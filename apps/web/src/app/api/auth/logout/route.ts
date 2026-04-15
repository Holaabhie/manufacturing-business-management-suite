import { NextResponse } from "next/server";
import { destroySession, getSessionUser } from "@/lib/auth-session";
import { logAuthEvent, getClientIp } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    // Get user before destroying session for audit log
    const user = await getSessionUser();

    // Destroy session and clear both cookies
    await destroySession();

    // Audit log
    if (user) {
      const ipAddress = getClientIp(req);
      const userAgent = req.headers.get("user-agent") || undefined;

      logAuthEvent({
        organizationId: (user as any).organizationId || "",
        userId: user._id as string,
        userName: user.fullName || user.full_name || user.email,
        userRole: user.role,
        action: "Logged out",
        actionType: "logout",
        ipAddress,
        userAgent,
        severity: "info",
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Always return OK for logout even on error
    return NextResponse.json({ ok: true });
  }
}
