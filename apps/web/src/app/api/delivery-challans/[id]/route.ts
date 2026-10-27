import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getDeliveryChallanService } from "@/modules/delivery-challans";
import { ValidationError, NotFoundError, ConflictError } from "@/shared/lib/errors";

const ALLOWED_ROLES = ["Owner", "Admin", "Manager", "Accountant"];

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const user = result.user;
        const tenantId = getDataOwnerId(user);
        const { id } = await params;

        const svc = getDeliveryChallanService();
        const challan = await svc.findById(id, tenantId);

        return NextResponse.json(challan);
    } catch (error) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: (error as Error).message }, { status: 404 });
        }
        console.error("Error fetching delivery challan:", error);
        return NextResponse.json({ error: "Failed to fetch delivery challan" }, { status: 500 });
    }
}

export const PATCH = withIdempotency(async (
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

        const svc = getDeliveryChallanService();
        const beforeChallan = await svc.findById(id, tenantId);

        const body = await request.json();
        const updated = await svc.update(id, tenantId, body);

        // Audit log
        await logDataOperation({
            organizationId: tenantId,
            userId: String(user._id),
            userName: user.fullName || user.fullName || user.email || "Unknown User",
            userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
            action: `Updated delivery challan ${updated.challan_number}`,
            actionType: "update",
            module: "delivery_challans",
            resourceId: id,
            resourceType: "delivery_challan",
            beforeState: beforeChallan || undefined,
            afterState: updated,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json(updated);
    } catch (error: unknown) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: (error as Error).message }, { status: 404 });
        }
        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: (error as Error).message, errors: (error as { errors?: unknown; fields?: unknown }).errors || (error as { errors?: unknown; fields?: unknown }).fields },
                { status: 400 }
            );
        }
        if (error instanceof ConflictError || (error as { statusCode?: number })?.statusCode === 409) {
            return NextResponse.json({ error: (error as Error).message }, { status: 409 });
        }
        console.error("Error updating delivery challan:", error);
        return NextResponse.json({ error: "Failed to update delivery challan" }, { status: 500 });
    }
});

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const user = result.user;
        const tenantId = getDataOwnerId(user);
        const { id } = await params;

        const svc = getDeliveryChallanService();
        const beforeChallan = await svc.findById(id, tenantId);

        await svc.delete(id, tenantId);

        // Audit log
        await logDataOperation({
            organizationId: tenantId,
            userId: String(user._id),
            userName: user.fullName || user.fullName || user.email || "Unknown User",
            userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
            action: `Deleted delivery challan ${beforeChallan.challan_number}`,
            actionType: "delete",
            module: "delivery_challans",
            resourceId: id,
            resourceType: "delivery_challan",
            beforeState: beforeChallan || undefined,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: (error as Error).message }, { status: 404 });
        }
        if (error instanceof ConflictError || (error as { statusCode?: number })?.statusCode === 409) {
            return NextResponse.json({ error: (error as Error).message }, { status: 409 });
        }
        console.error("Error deleting delivery challan:", error);
        return NextResponse.json({ error: "Failed to delete delivery challan" }, { status: 500 });
    }
}
