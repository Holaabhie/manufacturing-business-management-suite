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
  createLinksSchema,
} from "@/modules/banking";
import { ensureBankingIndexes } from "@/lib/migrations/ensureBankingIndexes";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireRole(ALLOWED_ROLES);
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
    }

    const { id } = await params;
    const tenantId = getDataOwnerId(result.user);
    const service = getBankingService();

    const tx = await service.getTransactionById(id, tenantId);
    if (!tx) {
      return NextResponse.json({ error: "Bank transaction not found" }, { status: 404 });
    }

    const links = await service.getLinksForTransaction(id, tenantId);
    return NextResponse.json({ links });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Error fetching transaction links:", error);
    return NextResponse.json({ error: "Failed to fetch transaction links" }, { status: 500 });
  }
}

export const POST = withIdempotency(
  async (
    request: NextRequest,
    context?: { params?: Promise<{ id: string }> }
  ) => {
    try {
      ensureBankingIndexes().catch(() => {});

      const result = await requireRole(ALLOWED_ROLES);
      if (result.error || !result.user) {
        return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
      }

      // Next.js Route Handler params extraction
      let id = "";
      if (context?.params) {
        const resolvedParams = await context.params;
        id = resolvedParams?.id || "";
      }
      if (!id) {
        const parts = request.nextUrl.pathname.split("/");
        // /api/banking/transactions/[id]/links
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
      const userAny = user as any;
      const createdBy = userAny.fullName || userAny.name || user.email || String(user._id);

      const body = await request.json();
      const parsed = createLinksSchema.parse(body);

      const idempotencyKey = request.headers.get("idempotency-key") || null;
      const service = getBankingService();
      const createdLinks = await service.createLinks(
        id,
        tenantId,
        parsed.links,
        createdBy,
        idempotencyKey
      );

      // Audit log
      await logDataOperation({
        organizationId: tenantId,
        userId: String(user._id),
        userName: createdBy,
        userRole: (userAny.role === "Admin" || userAny.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: userAny.role || user.role,
        action: `Matched ${createdLinks.length} payment(s) to transaction ${id}`,
        actionType: "create",
        module: "banking",
        resourceId: id,
        resourceType: "bank_match_link",
        afterState: { links: createdLinks } as unknown as Record<string, unknown>,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
      });

      return NextResponse.json({ links: createdLinks }, { status: 201 });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues?.[0]?.message || "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      if (error instanceof AppError) {
        return NextResponse.json(
          { error: error.message, ...(error.details || {}), ...((error as any).metadata || {}) },
          { status: error.statusCode }
        );
      }
      console.error("Error creating match links:", error);
      return NextResponse.json({ error: "Failed to match transaction" }, { status: 500 });
    }
  },
  { getUserId: getBankingTenantUserId }
);
