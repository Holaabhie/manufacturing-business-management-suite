import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getDeliveryChallanService, challanStatusTransitionSchema } from "@/modules/delivery-challans";
import { ValidationError, NotFoundError, ConflictError } from "@/shared/lib/errors";

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
        const { id } = await params;

        const body = await request.json();
        const parsed = challanStatusTransitionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid status value. Must be Draft, Dispatched, Delivered, Returned, or Cancelled." },
                { status: 400 }
            );
        }

        const svc = getDeliveryChallanService();
        const beforeChallan = await svc.findById(id, tenantId);

        const updated = await svc.updateStatus(id, tenantId, parsed.data.status);

        // Audit log
        await logDataOperation({
            organizationId: tenantId,
            userId: String(user._id),
            userName: user.fullName || user.fullName || user.email || "Unknown User",
            userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
            action: `Changed status of delivery challan ${updated.challan_number} from ${beforeChallan.status} to ${updated.status}`,
            actionType: "update",
            module: "delivery_challans",
            resourceId: id,
            resourceType: "delivery_challan",
            beforeState: { status: beforeChallan.status },
            afterState: { status: updated.status },
            ipAddress: getClientIp(request),
            userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json(updated);
    } catch (error: unknown) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: (error as Error).message }, { status: 404 });
        }
        if (error instanceof ConflictError || (error as { statusCode?: number })?.statusCode === 409) {
            return NextResponse.json({ error: (error as Error).message }, { status: 409 });
        }
        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: (error as Error).message, errors: (error as { errors?: unknown; fields?: unknown }).errors || (error as { errors?: unknown; fields?: unknown }).fields },
                { status: 400 }
            );
        }
        console.error("Error updating delivery challan status:", error);
        return NextResponse.json({ error: "Failed to update delivery challan status" }, { status: 500 });
    }
});
