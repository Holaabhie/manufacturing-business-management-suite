import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getReminderService, type ReminderLogStatus } from "@/modules/reminders";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function GET(request: NextRequest) {
    try {
        const auth = await requireRole(ALLOWED_ROLES);
        if (auth.error || !auth.user) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get("order_id") || undefined;
        const statusParam = searchParams.get("status") || undefined;
        const from = searchParams.get("from") || undefined;
        const to = searchParams.get("to") || undefined;
        const limitParam = searchParams.get("limit");
        const skipParam = searchParams.get("skip");

        const status = statusParam as ReminderLogStatus | undefined;
        const limit = limitParam ? parseInt(limitParam, 10) : 50;
        const skip = skipParam ? parseInt(skipParam, 10) : 0;

        const tenantId = getDataOwnerId(auth.user);
        const service = getReminderService();

        const result = await service.listLogs(tenantId, {
            order_id: orderId,
            status,
            from,
            to,
            limit: isNaN(limit) ? 50 : limit,
            skip: isNaN(skip) ? 0 : skip,
        });

        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        console.error("[Reminders API] GET /logs error:", err);
        return NextResponse.json(
            { error: err?.message || "Failed to fetch reminder logs" },
            { status: 500 }
        );
    }
}
