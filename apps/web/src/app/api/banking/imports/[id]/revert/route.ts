import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { AppError } from "@/shared/lib/errors";
import { ZodError } from "zod";
import { getBankingService, revertImportSchema } from "@/modules/banking";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireRole(ALLOWED_ROLES);
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
    }

    const user = result.user;
    const tenantId = getDataOwnerId(user);
    const userAny = user as any;
    const revertedBy = userAny.fullName || userAny.name || user.email || String(user._id);

    const body = await request.json().catch(() => ({}));
    const validated = revertImportSchema.parse(body);

    const service = getBankingService();
    const existing = await service.getImportById(id, tenantId);
    if (!existing) {
      return NextResponse.json({ error: "Bank statement import not found" }, { status: 404 });
    }

    const reverted = await service.revertImport(
      id,
      tenantId,
      revertedBy,
      validated.reason
    );

    // Audit log
    await logDataOperation({
      organizationId: tenantId,
      userId: String(user._id),
      userName: userAny.fullName || userAny.name || user.email || "Unknown User",
      userRole: (userAny.role === "Admin" || userAny.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: userAny.role || user.role,
      action: `Reverted bank statement import ${reverted.file_name}: ${validated.reason}`,
      actionType: "update",
      module: "banking",
      resourceId: reverted.id,
      resourceType: "bank_statement_import",
      beforeState: existing as unknown as Record<string, unknown>,
      afterState: reverted as unknown as Record<string, unknown>,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json(reverted);
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
    console.error("Error reverting statement import:", error);
    return NextResponse.json({ error: "Failed to revert statement import" }, { status: 500 });
  }
}
