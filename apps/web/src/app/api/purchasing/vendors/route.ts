/**
 * Vendors API — /api/purchasing/vendors
 * ─────────────────────────────────────────────────────────
 * GET  — List all vendors
 * POST — Create a new vendor
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { requireRole } from "@/lib/require-role";
import { getPurchasingService } from "@/modules/purchasing";
import { getDb } from "@/lib/mongodb";
import {
    paginationQuerySchema,
    buildPaginatedEnvelope,
    buildTruncatedEnvelope,
    VENDOR_SORT_FIELDS,
    isValidSortField,
    escapeRegex,
} from "@/shared/lib/pagination";

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const searchParams = url.searchParams;
        const hasPagination = searchParams.has("page") || searchParams.has("limit") || searchParams.has("q") || searchParams.has("sort");

        const rawSort = searchParams.get("sort") || undefined;
        if (rawSort && !isValidSortField(rawSort, VENDOR_SORT_FIELDS)) {
            return NextResponse.json(
                { success: false, error: `Invalid sort field '${rawSort}'. Whitelisted: ${VENDOR_SORT_FIELDS.join(", ")}` },
                { status: 400 }
            );
        }

        const parsed = paginationQuerySchema.safeParse({
            page: searchParams.get("page") ?? 1,
            limit: searchParams.get("limit") ?? 25,
            sort: rawSort ?? "name",
            order: searchParams.get("order") ?? "asc",
            q: searchParams.get("q") ?? undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0]?.message || "Invalid query parameters" },
                { status: 400 }
            );
        }

        const query = parsed.data;
        const db = await getDb();
        const userId = getDataOwnerId(user);
        const filter: Record<string, unknown> = { userId };

        if (query.q && query.q.trim()) {
            const escaped = escapeRegex(query.q.trim());
            filter.$or = [
                { name: { $regex: escaped, $options: "i" } },
                { contactPerson: { $regex: escaped, $options: "i" } },
                { email: { $regex: escaped, $options: "i" } },
                { phone: { $regex: escaped, $options: "i" } },
            ];
        }

        const col = db.collection("vendors");
        const total = await col.countDocuments(filter);

        const sortDirection = query.order === "asc" ? 1 : -1;
        const sortField = query.sort || "name";
        const skip = (query.page - 1) * query.limit;
        const take = hasPagination ? query.limit : 500;

        const docs = await col
            .find(filter)
            .sort({ [sortField]: sortDirection })
            .skip(skip)
            .limit(take)
            .toArray();

        const formatted = docs.map((doc) => ({
            id: doc._id.toString(),
            userId: doc.userId,
            name: doc.name,
            contactPerson: doc.contactPerson,
            phone: doc.phone,
            email: doc.email,
            address: doc.address,
            gstin: doc.gstin,
            notes: doc.notes,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        }));

        if (hasPagination) {
            return NextResponse.json(buildPaginatedEnvelope(formatted, query.page, query.limit, total), {
                headers: { "X-Total-Count": String(total) },
            });
        }

        return NextResponse.json(buildTruncatedEnvelope(formatted, total, 500), {
            headers: {
                "X-Total-Count": String(total),
                "X-Truncated": String(total > 500),
            },
        });
    } catch (error: unknown) {
        console.error("Error fetching vendors:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await requireRole(["Owner", "Admin", "Manager", "Accountant"]);
        if (authResult.error || !authResult.user) {
            return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 });
        }
        const user = authResult.user;

        const body = await request.json();
        const service = getPurchasingService();
        const vendor = await service.createVendor(getDataOwnerId(user), body);

        return NextResponse.json({ success: true, data: vendor }, { status: 201 });
    } catch (error: unknown) {
        console.error("Error creating vendor:", error);
        const status = (error as { statusCode?: number }).statusCode || 500;
        return NextResponse.json(
            { error: (error as Error).message, details: (error as { details?: unknown }).details },
            { status },
        );
    }
}
