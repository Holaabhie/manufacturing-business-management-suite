import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getDeliveryChallanService } from "@/modules/delivery-challans";
import { NotFoundError } from "@/shared/lib/errors";

const ALLOWED_ROLES = ["Owner", "Admin", "Manager", "Accountant"];

export const POST = withIdempotency(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const user = result.user;
        const tenantId = getDataOwnerId(user);
        const userAny = user as any;
        const createdBy = userAny.fullName || userAny.name || user.email || String(user._id);
        const { id } = await params;

        const svc = getDeliveryChallanService();
        const duplicatedChallan = await svc.duplicate(id, tenantId, createdBy);

        // Audit log
        await logDataOperation({
            organizationId: tenantId,
            userId: String(user._id),
            userName: userAny.fullName || userAny.name || user.email || "Unknown User",
            userRole: (userAny.role === "Admin" || userAny.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: userAny.role || user.role,
            action: `Duplicated delivery challan ${id} into new challan ${duplicatedChallan.challan_number}`,
            actionType: "create",
            module: "delivery_challans",
            resourceId: duplicatedChallan.id,
            resourceType: "delivery_challan",
            afterState: duplicatedChallan as unknown as Record<string, unknown>,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json(duplicatedChallan, { status: 201 });
    } catch (error: any) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error("Error duplicating delivery challan:", error);
        return NextResponse.json({ error: "Failed to duplicate delivery challan" }, { status: 500 });
    }
});
