/**
 * Orders API — /api/v1/orders
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getOrderService } from "@/modules/orders";
import { getDataOwnerId } from "@/lib/auth-session";

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (req: NextRequest, user: AuthenticatedUser) => {
            const clientId = req.nextUrl.searchParams.get("clientId");
            const service = getOrderService();
            const items = await service.findAll(getDataOwnerId(user), { ...(clientId && { clientId }) });
            return envelope.ok(items);
        }),
    ),
    { tier: "read" },
);

export const POST = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            const body = await request.json();
            const service = getOrderService();
            const item = await service.create(getDataOwnerId(user), body);
            return envelope.created(item);
        }),
    ),
    { tier: "write" },
);
