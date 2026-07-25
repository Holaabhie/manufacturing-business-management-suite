import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getProductionService } from "@/modules/production";
import { getDataOwnerId } from "@/lib/auth-session";
import { syncOrderStatusFromProduction } from "@/lib/utils/orderStatusSync";

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser) => {
            const service = getProductionService();
            const items = await service.findAll(getDataOwnerId(user));
            return envelope.ok(items);
        }),
    ),
    { tier: "read" },
);

export const POST = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            const body = await request.json();
            const userName = user.fullName || user.full_name || user.email || "System";
            const userRole = user.role || "Staff";

            const ownerId = getDataOwnerId(user);
            const service = getProductionService();
            const item = await service.create(ownerId, userName, userRole, body);

            // Sync parent order status after production is created
            try {
                await syncOrderStatusFromProduction(item.orderId, ownerId);
            } catch (err) {
                console.error("[Production POST] Order status sync failed:", err);
            }

            return envelope.created(item);
        }),
    ),
    { tier: "write" },
);
