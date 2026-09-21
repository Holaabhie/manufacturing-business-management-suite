/**
 * Clients API — /api/v1/clients
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getClientService } from "@/modules/clients";
import { getDataOwnerId } from "@/lib/auth-session";
import { assertCanCreate } from "@/lib/entitlements";

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser) => {
            const service = getClientService();
            const items = await service.findAll(getDataOwnerId(user));
            return envelope.ok(items);
        }),
    ),
    { tier: "read" },
);

export const POST = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            const limitError = await assertCanCreate(user, "clients", 1);
            if (limitError) return limitError;

            const body = await request.json();
            const service = getClientService();
            const item = await service.create(getDataOwnerId(user), body);
            return envelope.created(item);
        }),
    ),
    { tier: "write" },
);
