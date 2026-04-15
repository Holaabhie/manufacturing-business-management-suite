/**
 * Machine Item API — /api/v1/machines/[id]
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { envelope } from "@/shared/types/api";
import { AuthenticationError } from "@/shared/lib/errors";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getMachineService } from "@/modules/machines";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/v1/machines/[id] ──────────────────────────────────
export const GET = withApiRoute(async (_request: NextRequest, context: RouteContext) => {
    const user = await getSessionUser();
    if (!user) throw new AuthenticationError();

    const { id } = await context.params!;
    const adminId = getDataOwnerId(user);

    const service = getMachineService();
    const machine = await service.findById(id, adminId);

    return envelope.ok(machine);
});

// ─── PUT /api/v1/machines/[id] ──────────────────────────────────
export const PUT = withApiRoute(async (request: NextRequest, context: RouteContext) => {
    const user = await getSessionUser();
    if (!user) throw new AuthenticationError();

    const { id } = await context.params!;
    const body = await request.json();
    const adminId = getDataOwnerId(user);

    const service = getMachineService();
    const updated = await service.update(id, adminId, user.role, body);

    return envelope.ok(updated);
});

// ─── DELETE /api/v1/machines/[id] ───────────────────────────────
export const DELETE = withApiRoute(async (_request: NextRequest, context: RouteContext) => {
    const user = await getSessionUser();
    if (!user) throw new AuthenticationError();

    const { id } = await context.params!;
    const adminId = getDataOwnerId(user);

    const service = getMachineService();
    await service.delete(id, adminId, user.role);

    return envelope.noContent();
});
