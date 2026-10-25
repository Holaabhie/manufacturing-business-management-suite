/**
 * Orders API — /api/v1/orders
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getOrderService, getOrderRepository } from "@/modules/orders";
import { getDataOwnerId } from "@/lib/auth-session";
import { assertCanCreate } from "@/lib/entitlements";
import { sanitizeOrderForStaff } from "@/lib/sanitizeOrderForStaff";

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (req: NextRequest, user: AuthenticatedUser) => {
            const clientId = req.nextUrl.searchParams.get("clientId");
            const ownerId = getDataOwnerId(user);

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
                            .map((p: any) => p.orderId)
                            .filter((id: any) => id != null && String(id).trim() !== "")
                    ),
                ];

                if (orderIds.length === 0) {
                    return envelope.ok([]);
                }

                const orderToProdMap = new Map<string, string>();
                for (const p of productions) {
                    if (p.orderId && p._id) {
                        orderToProdMap.set(String(p.orderId), String(p._id));
                    }
                }

                const repo = getOrderRepository();
                const items = await repo.findAll(ownerId, { ...(clientId && { clientId }), restrictToOrderIds: orderIds });
                const enriched = items.map((item: any) => ({
                    ...item,
                    productionId: orderToProdMap.get(item.id) || undefined,
                }));
                return envelope.ok(sanitizeOrderForStaff(enriched));
            }

            const service = getOrderService();
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
