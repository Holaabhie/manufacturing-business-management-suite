/**
 * Orders Detail API — /api/v1/orders/[id]
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getOrderService } from "@/modules/orders";
import { getDataOwnerId } from "@/lib/auth-session";
import { sanitizeOrderForStaff } from "@/lib/sanitizeOrderForStaff";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const service = getOrderService();
            const item = await service.findById(id, getDataOwnerId(user));
            if (!item) {
                return envelope.notFound("Order not found");
            }
            if (user.role === "Staff") {
                return envelope.ok(sanitizeOrderForStaff(item));
            }
            return envelope.ok(item);
        }),
    ),
    { tier: "read" },
);

export const PUT = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            if (user.role === "Staff") {
                return envelope.error("Forbidden: Staff members cannot edit orders", 403, "FORBIDDEN");
            }
            const { id } = await context!.params;
            const body = await request.json();
            const service = getOrderService();
            const item = await service.update(id, getDataOwnerId(user), body);
            return envelope.ok(item);
        }),
    ),
    { tier: "write" },
);

export const DELETE = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            if (user.role === "Staff") {
                return envelope.error("Forbidden: Staff members cannot delete orders", 403, "FORBIDDEN");
            }
            const { id } = await context!.params;
            const service = getOrderService();
            await service.delete(id, getDataOwnerId(user));
            return envelope.noContent();
        }),
    ),
    { tier: "write" },
);
