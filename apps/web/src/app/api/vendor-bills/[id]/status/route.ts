import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId, getSessionUser } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getVendorBillService, getVendorBillTenantUserId } from "@/modules/vendor-bills";
import { AppError } from "@/shared/lib/errors";
import { ZodError } from "zod";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export const POST = withIdempotency(
    async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const result = await requireRole(ALLOWED_ROLES);
            if (result.error || !result.user) {
                return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
            }
            const user = result.user;
            const tenantId = getDataOwnerId(user);
            const { id } = await context.params;

            const body = await request.json();
            const { status, void_reason } = body;

            const svc = getVendorBillService();
            const updated = await svc.updateStatus(id, tenantId, status, void_reason);

            // Audit row
            await logDataOperation({
                organizationId: tenantId,
                userId: String(user._id),
                userName: user.fullName || user.fullName || user.email || "Unknown User",
                userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
                action: `Updated status of vendor bill ${updated.bill_number} to ${status}${void_reason ? ` (Reason: ${void_reason})` : ""}`,
                actionType: "update",
                module: "vendor_bills",
                resourceId: updated.id,
                resourceType: "vendor_bill",
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
                    { error: error.message, code: error.code, details: error.details },
                    { status: error.statusCode }
                );
            }
            const statusCode = (error as { statusCode?: number })?.statusCode;
            if (statusCode) {
                return NextResponse.json({ error: (error as Error).message }, { status: statusCode });
            }
            console.error("Error updating vendor bill status:", error);
            return NextResponse.json({ error: "Failed to update vendor bill status" }, { status: 500 });
        }
    },
    {
        getUserId: getVendorBillTenantUserId,
    }
);
