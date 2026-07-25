/**
 * Production Detail API — /api/v1/production/[id]
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getProductionService } from "@/modules/production";
import { getDataOwnerId } from "@/lib/auth-session";
import { syncOrderStatusFromProduction } from "@/lib/utils/orderStatusSync";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const service = getProductionService();
            const item = await service.findById(id, getDataOwnerId(user));
            return envelope.ok(item);
        }),
    ),
    { tier: "read" },
);

export const PUT = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const body = await request.json();
            const ownerId = getDataOwnerId(user);
            const service = getProductionService();
            const item = await service.update(id, ownerId, body);

            // Sync parent order status after production update
            try {
                await syncOrderStatusFromProduction(item.orderId, ownerId);
            } catch (err) {
                console.error("[Production PUT] Order status sync failed:", err);
            }

            return envelope.ok(item);
        }),
    ),
    { tier: "write" },
);

export const DELETE = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const service = getProductionService();
            await service.delete(id, getDataOwnerId(user));
            return envelope.noContent();
        }),
    ),
    { tier: "write" },
);
