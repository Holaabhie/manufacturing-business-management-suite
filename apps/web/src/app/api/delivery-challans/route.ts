import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getDeliveryChallanService } from "@/modules/delivery-challans";
import { ValidationError, NotFoundError } from "@/shared/lib/errors";

const ALLOWED_ROLES = ["Owner", "Admin", "Manager", "Accountant"];

export async function GET(request: NextRequest) {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const user = result.user;
        const tenantId = getDataOwnerId(user);

        const svc = getDeliveryChallanService();
        const challans = await svc.findAll(tenantId);

        // Optional query params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const search = searchParams.get("search");

        let filtered = challans;
        if (status && status !== "all") {
            filtered = filtered.filter((c) => c.status.toLowerCase() === status.toLowerCase());
        }
        if (search && search.trim()) {
            const query = search.trim().toLowerCase();
            filtered = filtered.filter(
                (c) =>
                    c.challan_number.toLowerCase().includes(query) ||
                    c.consignee.name.toLowerCase().includes(query) ||
                    (c.consignee.gstin && c.consignee.gstin.toLowerCase().includes(query)) ||
                    (c.vehicle_no && c.vehicle_no.toLowerCase().includes(query)) ||
                    (c.lr_number && c.lr_number.toLowerCase().includes(query))
            );
        }

        return NextResponse.json(filtered);
    } catch (error) {
        console.error("Error fetching delivery challans:", error);
        return NextResponse.json({ error: "Failed to fetch delivery challans" }, { status: 500 });
    }
}

export const POST = withIdempotency(async (request: NextRequest) => {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const user = result.user;
        const tenantId = getDataOwnerId(user);
        const createdBy = user.fullName || user.fullName || user.email || String(user._id);

        const body = await request.json();
        const svc = getDeliveryChallanService();
        const challan = await svc.create(tenantId, createdBy, body);

        // Audit log
        await logDataOperation({
            organizationId: tenantId,
            userId: String(user._id),
            userName: user.fullName || user.fullName || user.email || "Unknown User",
            userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
            action: `Created delivery challan ${challan.challan_number}`,
            actionType: "create",
            module: "delivery_challans",
            resourceId: challan.id,
            resourceType: "delivery_challan",
            afterState: challan,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json(challan, { status: 201 });
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
        console.error("Error creating delivery challan:", error);
        return NextResponse.json({ error: "Failed to create delivery challan" }, { status: 500 });
    }
});
