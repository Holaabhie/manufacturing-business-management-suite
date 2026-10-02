import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getVendorBillService } from "@/modules/vendor-bills";
import { AppError } from "@/shared/lib/errors";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function GET(request: NextRequest) {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const user = result.user;
        const tenantId = getDataOwnerId(user);

        const { searchParams } = new URL(request.url);
        const poId = searchParams.get("purchase_order_id");

        if (!poId || !poId.trim()) {
            return NextResponse.json({ error: "purchase_order_id query param is required" }, { status: 400 });
        }

        const svc = getVendorBillService();
        const poSummary = await svc.getPoSummary(poId.trim(), tenantId);

        return NextResponse.json(poSummary);
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
        console.error("Error fetching PO summary:", error);
        return NextResponse.json({ error: "Failed to fetch PO summary" }, { status: 500 });
    }
}
