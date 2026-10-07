import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId, getSessionUser } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getVendorBillService, getVendorBillRepository, getVendorBillTenantUserId } from "@/modules/vendor-bills";
import { AppError } from "@/shared/lib/errors";
import { ZodError } from "zod";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const user = result.user;
        const tenantId = getDataOwnerId(user);
        const { id } = await context.params;

        const repo = getVendorBillRepository();
        const payments = await repo.findPaymentsByBillId(id, tenantId);

        return NextResponse.json(payments);
    } catch (error: any) {
        console.error("Error fetching bill payments:", error);
        return NextResponse.json({ error: "Failed to fetch bill payments" }, { status: 500 });
    }
}

export const POST = withIdempotency(
    async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const result = await requireRole(ALLOWED_ROLES);
            if (result.error || !result.user) {
                return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
            }
            const user = result.user;
            const tenantId = getDataOwnerId(user);
            const userAny = user as any;
            const recordedBy = userAny.fullName || userAny.name || user.email || String(user._id);
            const { id } = await context.params;

            const body = await request.json();
            const svc = getVendorBillService();
            const paymentResult = await svc.recordPayment(id, tenantId, recordedBy, body);

            // Audit row
            await logDataOperation({
                organizationId: tenantId,
                userId: String(user._id),
                userName: userAny.fullName || userAny.name || user.email || "Unknown User",
                userRole: (userAny.role === "Admin" || userAny.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: userAny.role || user.role,
                action: `Recorded payment of ₹${paymentResult.payment.amount} for vendor bill ${id} (${paymentResult.payment.payment_mode})`,
                actionType: "create",
                module: "vendor_bills",
                resourceId: paymentResult.payment.id,
                resourceType: "vendor_bill_payment",
                afterState: paymentResult.payment as unknown as Record<string, unknown>,
                ipAddress: getClientIp(request),
                userAgent: request.headers.get("user-agent") || undefined,
            });

            return NextResponse.json(paymentResult, { status: 201 });
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
                return NextResponse.json(
                    { error: error.message, remainingBalance: error.remainingBalance },
                    { status: error.statusCode }
                );
            }
            console.error("Error recording vendor bill payment:", error);
            return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
        }
    },
    {
        getUserId: getVendorBillTenantUserId,
    }
);
