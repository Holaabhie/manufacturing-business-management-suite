/**
 * Payments API — /api/v1/payments
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getPaymentService } from "@/modules/payments";
import { getDataOwnerId } from "@/lib/auth-session";

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser) => {
            const service = getPaymentService();
            const items = await service.findAll(getDataOwnerId(user));
            return envelope.ok(items);
        }, { role: "Admin" }),
    ),
    { tier: "read" },
);

export const POST = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            const body = await request.json();
            const service = getPaymentService();
            const item = await service.create(getDataOwnerId(user), body);
            return envelope.created(item);
        }, { role: "Admin" }),
    ),
    { tier: "write" },
);
