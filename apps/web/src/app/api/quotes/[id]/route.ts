import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getQuoteService } from "@/modules/quotes";
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

        const svc = getQuoteService();
        const quote = await svc.findById(id, tenantId);

        return NextResponse.json(quote);
    } catch (error) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error("Error fetching quotation:", error);
        return NextResponse.json({ error: "Failed to fetch quotation" }, { status: 500 });
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
        const userAny = user as any;
        const { id } = await params;

        const svc = getQuoteService();
        const beforeQuote = await svc.findById(id, tenantId);

        const body = await request.json();
        const updated = await svc.update(id, tenantId, body);

        // Audit log
        await logDataOperation({
            organizationId: tenantId,
            userId: String(user._id),
            userName: userAny.fullName || userAny.name || user.email || "Unknown User",
            userRole: "Admin",
            action: `Updated quotation ${updated.quotation_number}`,
            actionType: "update",
            module: "quotes",
            resourceId: id,
            resourceType: "quotation",
            beforeState: beforeQuote as unknown as Record<string, unknown>,
            afterState: updated as unknown as Record<string, unknown>,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message, errors: (error as any).errors || (error as any).fields },
                { status: 400 }
            );
        }
        if (error instanceof ConflictError || error.statusCode === 409) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        console.error("Error updating quotation:", error);
        return NextResponse.json({ error: "Failed to update quotation" }, { status: 500 });
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
        const userAny = user as any;
        const { id } = await params;

        const svc = getQuoteService();
        const beforeQuote = await svc.findById(id, tenantId);

        await svc.delete(id, tenantId);

        // Audit log
        await logDataOperation({
            organizationId: tenantId,
            userId: String(user._id),
            userName: userAny.fullName || userAny.name || user.email || "Unknown User",
            userRole: "Admin",
            action: `Deleted quotation ${beforeQuote.quotation_number}`,
            actionType: "delete",
            module: "quotes",
            resourceId: id,
            resourceType: "quotation",
            beforeState: beforeQuote as unknown as Record<string, unknown>,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error instanceof ConflictError || error.statusCode === 409) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        console.error("Error deleting quotation:", error);
        return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 });
    }
}
