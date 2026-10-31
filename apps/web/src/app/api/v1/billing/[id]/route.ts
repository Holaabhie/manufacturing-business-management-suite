/**
 * Billing Detail API — /api/v1/billing/[id]
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getBillingService } from "@/modules/billing";
import { getDataOwnerId } from "@/lib/auth-session";
import { resolvePermissions, hasPermission, type FlatPermissionMap } from "@/lib/permissions";
import { AuthorizationError } from "@/shared/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const service = getBillingService();
            const item = await service.findById(id, getDataOwnerId(user));
            return envelope.ok(item);
        }, { permission: "invoices.view" }),
    ),
    { tier: "read" },
);

export const PUT = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const body = await request.json();

            // Dynamic mutation permission check:
            // mark paid -> invoices.markPaid, send -> invoices.send, general edit -> invoices.create
            let requiredPerm = "invoices.create";
            if (body.status === "paid") requiredPerm = "invoices.markPaid";
            else if (body.status === "sent") requiredPerm = "invoices.send";

            const isOwner = user.role === "Admin" || user.role === "Owner";
            if (!isOwner) {
                const resolved = resolvePermissions(
                    user.role,
                    (user.customPermissions || user.permissions) as FlatPermissionMap | undefined
                );
                if (!hasPermission(resolved, requiredPerm, false)) {
                    throw new AuthorizationError(requiredPerm);
                }
            }

            const service = getBillingService();
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
            const service = getBillingService();
            await service.delete(id, getDataOwnerId(user));
            return envelope.noContent();
        }, { permission: "invoices.delete" }),
    ),
    { tier: "write" },
);
