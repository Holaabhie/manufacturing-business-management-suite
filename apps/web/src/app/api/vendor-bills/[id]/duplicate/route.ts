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
            const userAny = user as any;
            const createdBy = userAny.fullName || userAny.name || user.email || String(user._id);
            const { id } = await context.params;

            const svc = getVendorBillService();
            const duplicated = await svc.duplicate(id, tenantId, createdBy);

            // Audit row
            await logDataOperation({
                organizationId: tenantId,
                userId: String(user._id),
                userName: userAny.fullName || userAny.name || user.email || "Unknown User",
                userRole: (userAny.role === "Admin" || userAny.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: userAny.role || user.role,
                action: `Duplicated vendor bill ${id} into new draft ${duplicated.bill_number}`,
                actionType: "create",
                module: "vendor_bills",
                resourceId: duplicated.id,
                resourceType: "vendor_bill",
                afterState: duplicated as unknown as Record<string, unknown>,
                ipAddress: getClientIp(request),
                userAgent: request.headers.get("user-agent") || undefined,
            });

            return NextResponse.json(duplicated, { status: 201 });
        } catch (error: any) {
            if (error instanceof AppError) {
                return NextResponse.json(
                    { error: error.message, code: error.code, details: error.details },
                    { status: error.statusCode }
                );
            }
            if (error.statusCode) {
                return NextResponse.json({ error: error.message }, { status: error.statusCode });
            }
            console.error("Error duplicating vendor bill:", error);
            return NextResponse.json({ error: "Failed to duplicate vendor bill" }, { status: 500 });
        }
    },
    {
        getUserId: getVendorBillTenantUserId,
    }
);
