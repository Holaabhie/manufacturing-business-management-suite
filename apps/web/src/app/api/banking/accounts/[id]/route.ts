import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { AppError } from "@/shared/lib/errors";
import { ZodError } from "zod";
import { getBankingService } from "@/modules/banking";

const WRITE_ROLES = ["Owner", "Admin"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireRole(WRITE_ROLES);
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
    }

    const user = result.user;
    const tenantId = getDataOwnerId(user);
    const service = getBankingService();
    const existing = await service.getAccountById(id, tenantId);
    if (!existing) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    const body = await request.json();
    const updated = await service.updateAccount(id, tenantId, body);

    // Audit log
    await logDataOperation({
      organizationId: tenantId,
      userId: String(user._id),
      userName: user.fullName || user.email || "Unknown User",
      userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
      action: `Updated bank account ${updated.name}`,
      actionType: "update",
      module: "banking",
      resourceId: updated.id,
      resourceType: "bank_account",
      beforeState: existing,
      afterState: updated,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues?.[0]?.message || "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: (error as Error).message, code: error.code, details: error.details },
        { status: error.statusCode }
      );
    }
    console.error("Error updating bank account:", error);
    return NextResponse.json({ error: "Failed to update bank account" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireRole(WRITE_ROLES);
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
    }

    const user = result.user;
    const tenantId = getDataOwnerId(user);
    const service = getBankingService();
    const existing = await service.getAccountById(id, tenantId);
    if (!existing) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    await service.deleteAccount(id, tenantId);

    // Audit log
    await logDataOperation({
      organizationId: tenantId,
      userId: String(user._id),
      userName: user.fullName || user.email || "Unknown User",
      userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
      action: `Deleted bank account ${existing.name}`,
      actionType: "delete",
      module: "banking",
      resourceId: existing.id,
      resourceType: "bank_account",
      beforeState: existing,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ success: true, message: "Bank account deleted" });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: (error as Error).message, code: error.code, details: error.details },
        { status: error.statusCode }
      );
    }
    console.error("Error deleting bank account:", error);
    return NextResponse.json({ error: "Failed to delete bank account" }, { status: 500 });
  }
}
