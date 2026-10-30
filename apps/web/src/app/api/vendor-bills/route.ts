import {
    paginationQuerySchema,
    buildPaginatedEnvelope,
    buildTruncatedEnvelope,
    VENDOR_BILL_SORT_FIELDS,
    isValidSortField,
    escapeRegex,
} from "@/shared/lib/pagination";
import { getDb } from "@/lib/mongodb";
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
        const hasPagination = searchParams.has("page") || searchParams.has("limit") || searchParams.has("q") || searchParams.has("sort");

        const rawSort = searchParams.get("sort") || undefined;
        if (rawSort && !isValidSortField(rawSort, VENDOR_BILL_SORT_FIELDS)) {
            return NextResponse.json(
                { success: false, error: `Invalid sort field '${rawSort}'. Whitelisted: ${VENDOR_BILL_SORT_FIELDS.join(", ")}` },
                { status: 400 }
            );
        }

        const parsed = paginationQuerySchema.safeParse({
            page: searchParams.get("page") ?? 1,
            limit: searchParams.get("limit") ?? 25,
            sort: rawSort ?? "created_at",
            order: searchParams.get("order") ?? "desc",
            q: searchParams.get("q") || searchParams.get("search") || undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0]?.message || "Invalid query parameters" },
                { status: 400 }
            );
        }

        const query = parsed.data;
        const status = searchParams.get("status") || undefined;
        const vendor_id = searchParams.get("vendor_id") || undefined;
        const from_date = searchParams.get("from_date") || undefined;
        const to_date = searchParams.get("to_date") || undefined;

        const db = await getDb();
        const filter: Record<string, unknown> = { userId: tenantId };

        if (status && status !== "all") {
            filter.status = status;
        }
        if (vendor_id) {
            filter.vendor_id = vendor_id;
        }
        if (from_date || to_date) {
            const dateQuery: Record<string, string> = {};
            if (from_date) dateQuery.$gte = from_date;
            if (to_date) dateQuery.$lte = to_date;
            filter.bill_date = dateQuery;
        }
        if (query.q && query.q.trim()) {
            const s = escapeRegex(query.q.trim());
            filter.$or = [
                { bill_number: { $regex: s, $options: "i" } },
                { "vendor.name": { $regex: s, $options: "i" } },
                { vendor_invoice_number: { $regex: s, $options: "i" } },
            ];
        }

        const col = db.collection("vendor_bills");
        const svc = getVendorBillService();

        const [total, summary] = await Promise.all([
            col.countDocuments(filter),
            svc.getSummary(tenantId),
        ]);

        const sortDirection = query.order === "asc" ? 1 : -1;
        const sortField = query.sort || "created_at";
        const skip = (query.page - 1) * query.limit;
        const take = hasPagination ? query.limit : 500;

        const docs = await col
            .find(filter)
            .sort({ [sortField]: sortDirection })
            .skip(skip)
            .limit(take)
            .toArray();

        const formattedBills = docs.map((doc) => ({
            ...doc,
            id: doc._id.toString(),
        }));

        if (hasPagination) {
            const paginated = buildPaginatedEnvelope(formattedBills, query.page, query.limit, total);
            return NextResponse.json(
                { ...paginated, bills: formattedBills, summary },
                { headers: { "X-Total-Count": String(total) } }
            );
        }

        const truncated = buildTruncatedEnvelope(formattedBills, total, 500);
        return NextResponse.json(
            { ...truncated, bills: truncated.data, summary },
            {
                headers: {
                    "X-Total-Count": String(total),
                    "X-Truncated": String(total > 500),
                },
            }
        );
    } catch (error: unknown) {
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
            const createdBy = user.fullName || user.fullName || user.email || String(user._id);

            const body = await request.json();
            const svc = getVendorBillService();
            const bill = await svc.create(tenantId, createdBy, body);

            // Audit row
            await logDataOperation({
                organizationId: tenantId,
                userId: String(user._id),
                userName: user.fullName || user.fullName || user.email || "Unknown User",
                userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
                action: `Created vendor bill ${bill.bill_number}`,
                actionType: "create",
                module: "vendor_bills",
                resourceId: bill.id,
                resourceType: "vendor_bill",
                afterState: bill,
                ipAddress: getClientIp(request),
                userAgent: request.headers.get("user-agent") || undefined,
            });

            return NextResponse.json(bill, { status: 201 });
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
            console.error("Error creating vendor bill:", error);
            return NextResponse.json({ error: "Failed to create vendor bill" }, { status: 500 });
        }
    },
    {
        getUserId: getVendorBillTenantUserId,
    }
);
