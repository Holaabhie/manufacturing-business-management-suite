import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { AppError } from "@/shared/lib/errors";
import { ZodError } from "zod";
import {
  getBankingService,
  getBankingTenantUserId,
  unlinkSchema,
} from "@/modules/banking";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export const POST = withIdempotency(
  async (
    request: NextRequest,
    context?: { params?: Promise<{ id: string }> }
  ) => {
    try {
      const result = await requireRole(ALLOWED_ROLES);
      if (result.error || !result.user) {
        return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
      }

      let id = "";
      if (context?.params) {
        const resolvedParams = await context.params;
        id = resolvedParams?.id || "";
      }
      if (!id) {
        const parts = request.nextUrl.pathname.split("/");
        // /api/banking/links/[id]/unlink
        const linkIndex = parts.indexOf("links");
        if (linkIndex !== -1 && parts[linkIndex + 1]) {
          id = parts[linkIndex + 1];
        }
      }

      if (!id) {
        return NextResponse.json({ error: "Link ID is required" }, { status: 400 });
      }

      const user = result.user;
      const tenantId = getDataOwnerId(user);
      const userAny = user as any;
      const unlinkedBy = userAny.fullName || userAny.name || user.email || String(user._id);

      let reason = null;
      try {
        const body = await request.json();
        const parsed = unlinkSchema.parse(body);
        reason = parsed.reason || null;
      } catch {
        // body is optional
      }

      const service = getBankingService();
      const unlinked = await service.unlink(id, tenantId, unlinkedBy, reason);

      // Audit log
      await logDataOperation({
        organizationId: tenantId,
        userId: String(user._id),
        userName: unlinkedBy,
        userRole: (userAny.role === "Admin" || userAny.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: userAny.role || user.role,
        action: `Unlinked payment from transaction ${unlinked.bank_transaction_id}`,
        actionType: "delete",
        module: "banking",
        resourceId: id,
        resourceType: "bank_match_link",
        afterState: unlinked as unknown as Record<string, unknown>,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
      });

      return NextResponse.json({ link: unlinked });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues?.[0]?.message || "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      console.error("Error unlinking payment:", error);
      return NextResponse.json({ error: "Failed to unlink payment" }, { status: 500 });
    }
  },
  { getUserId: getBankingTenantUserId }
);
