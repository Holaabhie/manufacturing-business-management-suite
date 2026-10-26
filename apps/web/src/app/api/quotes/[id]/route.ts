import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getQuoteService } from "@/modules/quotes";
import { ValidationError, NotFoundError, ConflictError, AppError } from "@/shared/lib/errors";

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
        const { id } = await params;

        const svc = getQuoteService();
        const beforeQuote = await svc.findById(id, tenantId);

        const body = await request.json();
        const updated = await svc.update(id, tenantId, body);

        // Audit log
        await logDataOperation({
            organizationId: tenantId,
            userId: String(user._id),
            userName: user.fullName || user.email || "Unknown User",
            userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role,
            action: `Updated quotation ${updated.quotation_number}`,
            actionType: "update",
            module: "quotes",
            resourceId: id,
            resourceType: "quotation",
            beforeState: beforeQuote || undefined,
            afterState: updated,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json(updated);
    } catch (error: unknown) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message, errors: error.fieldErrors },
                { status: 400 }
            );
        }
        if (error instanceof ConflictError || (error instanceof AppError && error.statusCode === 409)) {
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
        const { id } = await params;

        const svc = getQuoteService();
        const beforeQuote = await svc.findById(id, tenantId);

        await svc.delete(id, tenantId);

        // Audit log
        await logDataOperation({
            organizationId: tenantId,
            userId: String(user._id),
            userName: user.fullName || user.email || "Unknown User",
            userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role,
            action: `Deleted quotation ${beforeQuote.quotation_number}`,
            actionType: "delete",
            module: "quotes",
            resourceId: id,
            resourceType: "quotation",
            beforeState: beforeQuote || undefined,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error instanceof ConflictError || (error instanceof AppError && error.statusCode === 409)) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        console.error("Error deleting quotation:", error);
        return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 });
    }
}
