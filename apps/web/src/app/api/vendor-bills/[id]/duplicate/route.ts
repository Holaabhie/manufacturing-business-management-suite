import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId, getSessionUser } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getVendorBillService, getVendorBillTenantUserId } from "@/modules/vendor-bills";
import { AppError } from "@/shared/lib/errors";

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
            const createdBy = user.fullName || user.fullName || user.email || String(user._id);
            const { id } = await context.params;

            const svc = getVendorBillService();
            const duplicated = await svc.duplicate(id, tenantId, createdBy);

            // Audit row
            await logDataOperation({
                organizationId: tenantId,
                userId: String(user._id),
                userName: user.fullName || user.fullName || user.email || "Unknown User",
                userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
                action: `Duplicated vendor bill ${id} into new draft ${duplicated.bill_number}`,
                actionType: "create",
                module: "vendor_bills",
                resourceId: duplicated.id,
                resourceType: "vendor_bill",
                afterState: duplicated,
                ipAddress: getClientIp(request),
                userAgent: request.headers.get("user-agent") || undefined,
            });

            return NextResponse.json(duplicated, { status: 201 });
        } catch (error: unknown) {
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
            console.error("Error duplicating vendor bill:", error);
            return NextResponse.json({ error: "Failed to duplicate vendor bill" }, { status: 500 });
        }
    },
    {
        getUserId: getVendorBillTenantUserId,
    }
);
