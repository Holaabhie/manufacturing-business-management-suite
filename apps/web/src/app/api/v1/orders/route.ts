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
import { paginationQuerySchema, buildPaginatedEnvelope } from "@/shared/lib/pagination";

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (req: NextRequest, user: AuthenticatedUser) => {
            const searchParams = req.nextUrl.searchParams;
            const clientId = searchParams.get("clientId") || undefined;
            const ownerId = getDataOwnerId(user);
            const hasPagination = searchParams.has("page") || searchParams.has("limit") || searchParams.has("q") || searchParams.has("sort");

            const parsed = paginationQuerySchema.safeParse({
                page: searchParams.get("page") ?? 1,
                limit: searchParams.get("limit") ?? 25,
                sort: searchParams.get("sort") ?? "createdAt",
                order: searchParams.get("order") ?? "desc",
                q: searchParams.get("q") ?? undefined,
            });

            const query = parsed.success ? parsed.data : { page: 1, limit: 25, sort: "createdAt", order: "desc" as const };

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
                        ? NextResponse.json(buildPaginatedEnvelope([], query.page, query.limit, 0))
                        : envelope.ok([]);
                }

                const orderToProdMap = new Map<string, string>();
                for (const p of productions) {
                    if (p.orderId && p._id) {
                        orderToProdMap.set(String(p.orderId), String(p._id));
                    }
                }

                const repo = getOrderRepository();
                if (hasPagination) {
                    const { items, total } = await repo.findPaginated(ownerId, {
                        clientId,
                        restrictToOrderIds: orderIds,
                        page: query.page,
                        limit: query.limit,
                        sort: query.sort,
                        order: query.order,
                        q: query.q,
                    });
                    const enriched = items.map((item) => ({
                        ...item,
                        productionId: orderToProdMap.get(item.id) || undefined,
                    }));
                    return NextResponse.json(buildPaginatedEnvelope(sanitizeOrderForStaff(enriched), query.page, query.limit, total));
                }

                const items = await repo.findAll(ownerId, { ...(clientId && { clientId }), restrictToOrderIds: orderIds });
                const enriched = items.map((item) => ({
                    ...item,
                    productionId: orderToProdMap.get(item.id) || undefined,
                }));
                return envelope.ok(sanitizeOrderForStaff(enriched));
            }

            const service = getOrderService();
            if (hasPagination) {
                const { items, total } = await service.findPaginated(ownerId, {
                    clientId,
                    page: query.page,
                    limit: query.limit,
                    sort: query.sort,
                    order: query.order,
                    q: query.q,
                });
                return NextResponse.json(buildPaginatedEnvelope(items, query.page, query.limit, total));
            }

            const items = await service.findAll(ownerId, { ...(clientId && { clientId }) });
            return envelope.ok(items);
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
