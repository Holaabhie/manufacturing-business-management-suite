import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId, getSessionUser } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getVendorBillService, getVendorBillTenantUserId } from "@/modules/vendor-bills";
import { AppError } from "@/shared/lib/errors";
import { ZodError } from "zod";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const user = result.user;
        const tenantId = getDataOwnerId(user);
        const { id } = await context.params;

        const svc = getVendorBillService();
        const data = await svc.findById(id, tenantId);
        if (!data) {
            return NextResponse.json({ error: "Vendor bill not found" }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error("Error fetching vendor bill:", error);
        return NextResponse.json({ error: "Failed to fetch vendor bill" }, { status: 500 });
    }
}

export const PATCH = withIdempotency(
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
            const svc = getVendorBillService();
            const updated = await svc.update(id, tenantId, body);

            // Audit row
            await logDataOperation({
                organizationId: tenantId,
                userId: String(user._id),
                userName: user.fullName || user.fullName || user.email || "Unknown User",
                userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
                action: `Updated vendor bill ${updated.bill_number}`,
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
            console.error("Error updating vendor bill:", error);
            return NextResponse.json({ error: "Failed to update vendor bill" }, { status: 500 });
        }
    },
    {
        getUserId: getVendorBillTenantUserId,
    }
);

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const user = result.user;
        const tenantId = getDataOwnerId(user);
        const { id } = await context.params;

        const svc = getVendorBillService();
        await svc.deleteDraft(id, tenantId);

        // Audit row
        await logDataOperation({
            organizationId: tenantId,
            userId: String(user._id),
            userName: user.fullName || user.fullName || user.email || "Unknown User",
            userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
            action: `Deleted vendor bill ${id}`,
            actionType: "delete",
            module: "vendor_bills",
            resourceId: id,
            resourceType: "vendor_bill",
            ipAddress: getClientIp(request),
            userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json({ success: true, message: "Vendor bill deleted" });
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
        console.error("Error deleting vendor bill:", error);
        return NextResponse.json({ error: "Failed to delete vendor bill" }, { status: 500 });
    }
}
