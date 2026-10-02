import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId, getSessionUser } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { getVendorBillService, getVendorBillTenantUserId } from "@/modules/vendor-bills";
import { ensureVendorBillIndexes } from "@/lib/migrations/ensureVendorBillIndexes";
import { AppError } from "@/shared/lib/errors";
import { ZodError } from "zod";

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
        const status = searchParams.get("status") || undefined;
        const search = searchParams.get("search") || undefined;
        const vendor_id = searchParams.get("vendor_id") || undefined;
        const from_date = searchParams.get("from_date") || undefined;
        const to_date = searchParams.get("to_date") || undefined;

        const svc = getVendorBillService();
        const [bills, summary] = await Promise.all([
            svc.findAll(tenantId, { status, search, vendor_id, from_date, to_date }),
            svc.getSummary(tenantId),
        ]);

        return NextResponse.json({ bills, summary });
    } catch (error: any) {
        console.error("Error fetching vendor bills:", error);
        return NextResponse.json({ error: "Failed to fetch vendor bills" }, { status: 500 });
    }
}

export const POST = withIdempotency(
    async (request: NextRequest) => {
        try {
            ensureVendorBillIndexes().catch(() => { });

            const result = await requireRole(ALLOWED_ROLES);
            if (result.error || !result.user) {
                return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
            }
            const user = result.user;
            const tenantId = getDataOwnerId(user);
            const userAny = user as any;
            const createdBy = userAny.fullName || userAny.name || user.email || String(user._id);

            const body = await request.json();
            const svc = getVendorBillService();
            const bill = await svc.create(tenantId, createdBy, body);

            // Audit row
            await logDataOperation({
                organizationId: tenantId,
                userId: String(user._id),
                userName: userAny.fullName || userAny.name || user.email || "Unknown User",
                userRole: userAny.role || "Admin",
                action: `Created vendor bill ${bill.bill_number}`,
                actionType: "create",
                module: "vendor_bills",
                resourceId: bill.id,
                resourceType: "vendor_bill",
                afterState: bill as unknown as Record<string, unknown>,
                ipAddress: getClientIp(request),
                userAgent: request.headers.get("user-agent") || undefined,
            });

            return NextResponse.json(bill, { status: 201 });
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
            console.error("Error creating vendor bill:", error);
            return NextResponse.json({ error: "Failed to create vendor bill" }, { status: 500 });
        }
    },
    {
        getUserId: getVendorBillTenantUserId,
    }
);
