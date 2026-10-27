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
  acceptVarianceSchema,
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
        // /api/banking/transactions/[id]/accept-variance
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

      const body = await request.json();
      const parsed = acceptVarianceSchema.parse(body);

      const service = getBankingService();
      const tx = await service.acceptVariance(
        id,
        tenantId,
        parsed.reason,
        createdBy
      );

      // Audit log
      await logDataOperation({
        organizationId: tenantId,
        userId: String(user._id),
        userName: createdBy,
        userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
        action: `Accepted variance for transaction ${id} (${parsed.reason})`,
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
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues?.[0]?.message || "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      if (error instanceof AppError) {
        return NextResponse.json({ error: (error as Error).message }, { status: error.statusCode });
      }
      console.error("Error accepting variance:", error);
      return NextResponse.json({ error: "Failed to accept variance" }, { status: 500 });
    }
  },
  { getUserId: getBankingTenantUserId }
);
