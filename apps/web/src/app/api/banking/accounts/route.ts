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
} from "@/modules/banking";
import { ensureBankingIndexes } from "@/lib/migrations/ensureBankingIndexes";

const READ_ROLES = ["Owner", "Admin", "Accountant"];
const WRITE_ROLES = ["Owner", "Admin"];

export async function GET(request: NextRequest) {
  try {
    const result = await requireRole(READ_ROLES);
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
    }

    const tenantId = getDataOwnerId(result.user);
    const service = getBankingService();
    const accounts = await service.listAccounts(tenantId);

    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error("Error fetching bank accounts:", error);
    return NextResponse.json({ error: "Failed to fetch bank accounts" }, { status: 500 });
  }
}

export const POST = withIdempotency(
  async (request: NextRequest) => {
    try {
      ensureBankingIndexes().catch(() => {});

      const result = await requireRole(WRITE_ROLES);
      if (result.error || !result.user) {
        return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
      }

      const user = result.user;
      const tenantId = getDataOwnerId(user);
      const userAny = user as any;
      const createdBy = userAny.fullName || userAny.name || user.email || String(user._id);

      const body = await request.json();
      const service = getBankingService();
      const account = await service.createAccount(tenantId, createdBy, body);

      // Audit log
      await logDataOperation({
        organizationId: tenantId,
        userId: String(user._id),
        userName: userAny.fullName || userAny.name || user.email || "Unknown User",
        userRole: (userAny.role === "Admin" || userAny.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: userAny.role || user.role,
        action: `Created bank account ${account.name} (${account.bank_name} - ${account.account_last4})`,
        actionType: "create",
        module: "banking",
        resourceId: account.id,
        resourceType: "bank_account",
        afterState: account as unknown as Record<string, unknown>,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
      });

      return NextResponse.json(account, { status: 201 });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues?.[0]?.message || "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      if (error instanceof AppError) {
        return NextResponse.json(
          { error: error.message, code: error.code, details: error.details },
          { status: error.statusCode }
        );
      }
      console.error("Error creating bank account:", error);
      return NextResponse.json({ error: "Failed to create bank account" }, { status: 500 });
    }
  },
  {
    getUserId: getBankingTenantUserId,
  }
);
