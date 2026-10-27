import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { AppError } from "@/shared/lib/errors";
import {
  getBankingService,
  getBankingTenantUserId,
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
        // /api/banking/transactions/[id]/unexclude
        const txIndex = parts.indexOf("transactions");
        if (txIndex !== -1 && parts[txIndex + 1]) {
          id = parts[txIndex + 1];
        }
      }

      if (!id) {
        return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
      }

      const user = result.user;
      const tenantId = getDataOwnerId(user);
      const createdBy = user.fullName || user.email || String(user._id);

      const service = getBankingService();
      const tx = await service.unexcludeTransaction(id, tenantId);

      // Audit log
      await logDataOperation({
        organizationId: tenantId,
        userId: String(user._id),
        userName: createdBy,
        userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
        action: `Unexcluded bank transaction ${id}`,
        actionType: "update",
        module: "banking",
        resourceId: id,
        resourceType: "bank_transaction",
        afterState: tx,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
      });

      return NextResponse.json({ transaction: tx });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return NextResponse.json({ error: (error as Error).message }, { status: error.statusCode });
      }
      console.error("Error unexcluding transaction:", error);
      return NextResponse.json({ error: "Failed to unexclude transaction" }, { status: 500 });
    }
  },
  { getUserId: getBankingTenantUserId }
);
