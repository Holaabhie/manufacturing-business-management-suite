import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId, getSessionUser } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getVendorBillService, getVendorBillTenantUserId } from "@/modules/vendor-bills";
import { AppError } from "@/shared/lib/errors";
import { ZodError } from "zod";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export const POST = withIdempotency(
    async (
        request: NextRequest,
        context: { params: Promise<{ id: string; paymentId: string }> }
    ) => {
        try {
            const result = await requireRole(ALLOWED_ROLES);
            if (result.error || !result.user) {
                return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
            }
            const user = result.user;
            const tenantId = getDataOwnerId(user);
            const userAny = user as any;
            const userName = userAny.fullName || userAny.name || user.email || String(user._id);
            const { id, paymentId } = await context.params;

            const body = await request.json();
            const { void_reason } = body;

            const svc = getVendorBillService();
            const voidResult = await svc.voidPayment(id, paymentId, tenantId, userName, void_reason);

            // Audit row
            await logDataOperation({
                organizationId: tenantId,
                userId: String(user._id),
                userName: userAny.fullName || userAny.name || user.email || "Unknown User",
                userRole: userAny.role || "Admin",
                action: `Voided payment ${paymentId} of ₹${voidResult.payment.amount} for vendor bill ${id} (Reason: ${void_reason})`,
                actionType: "update",
                module: "vendor_bills",
                resourceId: paymentId,
                resourceType: "vendor_bill_payment",
                afterState: voidResult.payment as unknown as Record<string, unknown>,
                ipAddress: getClientIp(request),
                userAgent: request.headers.get("user-agent") || undefined,
            });

            return NextResponse.json(voidResult);
        } catch (error: any) {
            if (error instanceof ZodError) {
                return NextResponse.json(
                    { error: error.issues?.[0]?.message || "Validation failed", details: error.issues },
                    { status: 400 }
                );
            }
            if (error instanceof AppError) {
                return NextResponse.json(
                    { error: error.message, code: error.code, details: error.details },
                    { status: error.statusCode }
                );
            }
            if (error.statusCode) {
                return NextResponse.json({ error: error.message }, { status: error.statusCode });
            }
            console.error("Error voiding bill payment:", error);
            return NextResponse.json({ error: "Failed to void payment" }, { status: 500 });
        }
    },
    {
        getUserId: getVendorBillTenantUserId,
    }
);
