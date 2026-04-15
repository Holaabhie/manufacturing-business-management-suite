/**
 * Clients Detail API — /api/v1/clients/[id]
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getClientService } from "@/modules/clients";
import { getDataOwnerId } from "@/lib/auth-session";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const service = getClientService();
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
            const service = getClientService();
            const item = await service.update(id, getDataOwnerId(user), body);
            return envelope.ok(item);
        }),
    ),
    { tier: "write" },
);

export const DELETE = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const service = getClientService();
            await service.delete(id, getDataOwnerId(user));
            return envelope.noContent();
        }),
    ),
    { tier: "write" },
);
