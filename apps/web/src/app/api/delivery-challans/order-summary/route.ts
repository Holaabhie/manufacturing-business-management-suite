import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getDeliveryChallanService } from "@/modules/delivery-challans";
import { NotFoundError } from "@/shared/lib/errors";

const ALLOWED_ROLES = ["Owner", "Admin", "Manager", "Accountant"];

export async function GET(request: NextRequest) {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const user = result.user;
        const tenantId = getDataOwnerId(user);

        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get("order_id");

        if (!orderId) {
            return NextResponse.json({ error: "Missing order_id query parameter" }, { status: 400 });
        }

        const svc = getDeliveryChallanService();
        const summary = await svc.getOrderSummary(tenantId, orderId);

        return NextResponse.json(summary);
    } catch (error: unknown) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: (error as Error).message }, { status: 404 });
        }
        console.error("Error fetching order challan summary:", error);
        return NextResponse.json({ error: "Failed to fetch order challan summary" }, { status: 500 });
    }
}
