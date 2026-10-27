/**
 * Orders API — /api/v1/orders
 */

import { NextResponse, type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getOrderService, getOrderRepository } from "@/modules/orders";
import { getDataOwnerId } from "@/lib/auth-session";
import { assertCanCreate } from "@/lib/entitlements";
import { sanitizeOrderForStaff } from "@/lib/sanitizeOrderForStaff";
import {
    paginationQuerySchema,
    buildPaginatedEnvelope,
    buildTruncatedEnvelope,
    ORDER_SORT_FIELDS,
    isValidSortField,
} from "@/shared/lib/pagination";

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (req: NextRequest, user: AuthenticatedUser) => {
            const searchParams = req.nextUrl.searchParams;
            const clientId = searchParams.get("clientId") || undefined;
            const ownerId = getDataOwnerId(user);
            const hasPagination = searchParams.has("page") || searchParams.has("limit") || searchParams.has("q") || searchParams.has("sort");

            const rawSort = searchParams.get("sort") || undefined;
            if (rawSort && !isValidSortField(rawSort, ORDER_SORT_FIELDS)) {
                return NextResponse.json(
                    { success: false, error: `Invalid sort field '${rawSort}'. Whitelisted: ${ORDER_SORT_FIELDS.join(", ")}` },
                    { status: 400 }
                );
            }

            const parsed = paginationQuerySchema.safeParse({
                page: searchParams.get("page") ?? 1,
                limit: searchParams.get("limit") ?? (hasPagination ? 25 : 500),
                sort: rawSort ?? "createdAt",
                order: searchParams.get("order") ?? "desc",
                q: searchParams.get("q") ?? undefined,
            });

            if (!parsed.success) {
                return NextResponse.json(
                    { success: false, error: parsed.error.issues[0]?.message || "Invalid query parameters" },
                    { status: 400 }
                );
            }

            const query = parsed.data;

            if (user.role === "Staff") {
                const { getDb } = await import("@/lib/mongodb");
                const db = await getDb();
                const productions = await db
                    .collection("productions")
                    .find({
                        userId: ownerId,
                        assignedStaff: String(user._id),
                    })
                    .project({ orderId: 1 })
                    .toArray();

                const orderIds = [
                    ...new Set(
                        productions
                            .map((p: Record<string, unknown>) => String(p.orderId || ""))
                            .filter((id) => id.trim() !== "")
                    ),
                ];

                if (orderIds.length === 0) {
                    return hasPagination
                        ? NextResponse.json(buildPaginatedEnvelope([], query.page, query.limit, 0), { headers: { "X-Total-Count": "0" } })
                        : NextResponse.json(buildTruncatedEnvelope([], 0, 500), { headers: { "X-Total-Count": "0", "X-Truncated": "false" } });
                }

                const orderToProdMap = new Map<string, string>();
                for (const p of productions) {
                    if (p.orderId && p._id) {
                        orderToProdMap.set(String(p.orderId), String(p._id));
                    }
                }

                const repo = getOrderRepository();
                const { items, total } = await repo.findPaginated(ownerId, {
                    clientId,
                    restrictToOrderIds: orderIds,
                    page: hasPagination ? query.page : 1,
                    limit: hasPagination ? query.limit : 500,
                    sort: query.sort,
                    order: query.order,
                    q: query.q,
                });

                const enriched = items.map((item) => ({
                    ...item,
                    productionId: orderToProdMap.get(item.id) || undefined,
                }));
                const sanitized = sanitizeOrderForStaff(enriched);

                if (hasPagination) {
                    return NextResponse.json(buildPaginatedEnvelope(sanitized, query.page, query.limit, total), {
                        headers: { "X-Total-Count": String(total) },
                    });
                }

                return NextResponse.json(buildTruncatedEnvelope(sanitized, total, 500), {
                    headers: {
                        "X-Total-Count": String(total),
                        "X-Truncated": String(total > 500),
                    },
                });
            }

            const service = getOrderService();
            const { items, total } = await service.findPaginated(ownerId, {
                clientId,
                page: hasPagination ? query.page : 1,
                limit: hasPagination ? query.limit : 500,
                sort: query.sort,
                order: query.order,
                q: query.q,
            });

            if (hasPagination) {
                return NextResponse.json(buildPaginatedEnvelope(items, query.page, query.limit, total), {
                    headers: { "X-Total-Count": String(total) },
                });
            }

            return NextResponse.json(buildTruncatedEnvelope(items, total, 500), {
                headers: {
                    "X-Total-Count": String(total),
                    "X-Truncated": String(total > 500),
                },
            });
        }),
    ),
    { tier: "read" },
);

export const POST = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            if (user.role === "Staff") {
                return envelope.error("Forbidden: Staff members cannot create orders", 403, "FORBIDDEN");
            }

            const limitError = await assertCanCreate(user, "orders", 1);
            if (limitError) return limitError;

            const body = await request.json();
            const service = getOrderService();
            const item = await service.create(getDataOwnerId(user), body);
            return envelope.created(item);
        }),
    ),
    { tier: "write" },
);
