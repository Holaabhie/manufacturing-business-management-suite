/**
 * Order Status API — PATCH /api/v1/orders/[id]/status
 * Lightweight endpoint that only updates the order status and records timestamps.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getOrderService } from "@/modules/orders";
import { getDataOwnerId } from "@/lib/auth-session";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const body = await request.json();
            const service = getOrderService();
            const item = await service.updateStatus(id, getDataOwnerId(user), body.status);
            return envelope.ok(item);
        }),
    ),
    { tier: "write" },
);
