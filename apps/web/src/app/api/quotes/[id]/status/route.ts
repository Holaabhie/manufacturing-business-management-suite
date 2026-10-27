import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getQuoteService, quoteStatusTransitionSchema } from "@/modules/quotes";
import { ValidationError, NotFoundError, ConflictError, AppError } from "@/shared/lib/errors";

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
        const parsed = quoteStatusTransitionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid status value. Must be Draft, Sent, Accepted, or Rejected." },
                { status: 400 }
            );
        }

        const svc = getQuoteService();
        const beforeQuote = await svc.findById(id, tenantId);

        const updated = await svc.updateStatus(id, tenantId, parsed.data.status);

        // Audit log
        await logDataOperation({
            organizationId: tenantId,
            userId: String(user._id),
            userName: user.fullName || user.email || "Unknown User",
            userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role,
            action: `Changed status of quotation ${updated.quotation_number} from ${beforeQuote.status} to ${updated.status}`,
            actionType: "update",
            module: "quotes",
            resourceId: id,
            resourceType: "quotation",
            beforeState: { status: beforeQuote.status },
            afterState: { status: updated.status },
            ipAddress: getClientIp(request),
            userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json(updated);
    } catch (error: unknown) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: (error as Error).message }, { status: 404 });
        }
        if (error instanceof ConflictError || (error instanceof AppError && error.statusCode === 409)) {
            return NextResponse.json({ error: (error as Error).message }, { status: 409 });
        }
        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: (error as Error).message, errors: error.fieldErrors },
                { status: 400 }
            );
        }
        console.error("Error updating quotation status:", error);
        return NextResponse.json({ error: "Failed to update quotation status" }, { status: 500 });
    }
});
