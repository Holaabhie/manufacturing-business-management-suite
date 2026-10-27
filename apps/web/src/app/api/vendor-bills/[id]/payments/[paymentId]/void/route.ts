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
            const userName = user.fullName || user.fullName || user.email || String(user._id);
            const { id, paymentId } = await context.params;

            const body = await request.json();
            const { void_reason } = body;

            const svc = getVendorBillService();
            const voidResult = await svc.voidPayment(id, paymentId, tenantId, userName, void_reason);

            // Audit row
            await logDataOperation({
                organizationId: tenantId,
                userId: String(user._id),
                userName: user.fullName || user.fullName || user.email || "Unknown User",
                userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
                action: `Voided payment ${paymentId} of ₹${voidResult.payment.amount} for vendor bill ${id} (Reason: ${void_reason})`,
                actionType: "update",
                module: "vendor_bills",
                resourceId: paymentId,
                resourceType: "vendor_bill_payment",
                afterState: voidResult.payment,
                ipAddress: getClientIp(request),
                userAgent: request.headers.get("user-agent") || undefined,
            });

            return NextResponse.json(voidResult);
        } catch (error: unknown) {
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
            const statusCode = (error as { statusCode?: number })?.statusCode;
            if (statusCode) {
                return NextResponse.json({ error: (error as Error).message }, { status: statusCode });
            }
            console.error("Error voiding bill payment:", error);
            return NextResponse.json({ error: "Failed to void payment" }, { status: 500 });
        }
    },
    {
        getUserId: getVendorBillTenantUserId,
    }
);
