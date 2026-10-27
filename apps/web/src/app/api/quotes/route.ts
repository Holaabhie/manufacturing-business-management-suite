import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getQuoteService } from "@/modules/quotes";
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

        const svc = getQuoteService();
        const quotes = await svc.findAll(tenantId);

        // Optional query params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const search = searchParams.get("search");

        let filtered = quotes;
        if (status && status !== "all") {
            filtered = filtered.filter((q) => q.status.toLowerCase() === status.toLowerCase());
        }
        if (search && search.trim()) {
            const query = search.trim().toLowerCase();
            filtered = filtered.filter(
                (q) =>
                    q.quotation_number.toLowerCase().includes(query) ||
                    q.clientName.toLowerCase().includes(query) ||
                    (q.clientGSTIN && q.clientGSTIN.toLowerCase().includes(query))
            );
        }

        return NextResponse.json(filtered);
    } catch (error) {
        console.error("Error fetching quotations:", error);
        return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 });
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
        const createdBy = user.fullName || user.email || String(user._id);

        const body = await request.json();
        const svc = getQuoteService();
        const quote = await svc.create(tenantId, createdBy, body);

        // Audit log
        await logDataOperation({
            organizationId: tenantId,
            userId: String(user._id),
            userName: user.fullName || user.email || "Unknown User",
            userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role,
            action: `Created quotation ${quote.quotation_number}`,
            actionType: "create",
            module: "quotes",
            resourceId: quote.id,
            resourceType: "quotation",
            afterState: quote,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json(quote, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: (error as Error).message, errors: error.fieldErrors },
                { status: 400 }
            );
        }
        console.error("Error creating quotation:", error);
        return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 });
    }
});
