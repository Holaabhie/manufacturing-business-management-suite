/**
 * Machines API — /api/v1/machines
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { envelope } from "@/shared/types/api";
import { AuthenticationError } from "@/shared/lib/errors";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getMachineService } from "@/modules/machines";

// ─── GET /api/v1/machines ───────────────────────────────────────
export const GET = withApiRoute(async () => {
    const user = await getSessionUser();
    if (!user) throw new AuthenticationError();

    const adminId = getDataOwnerId(user);

    const service = getMachineService();
    const machines = await service.findAll(adminId);

    return envelope.ok(machines);
});

// ─── POST /api/v1/machines ──────────────────────────────────────
export const POST = withApiRoute(async (request: NextRequest) => {
    const user = await getSessionUser();
    if (!user) throw new AuthenticationError();

    const body = await request.json();
    const adminId = getDataOwnerId(user);

    const service = getMachineService();
    const machine = await service.create(adminId, user.role, body);

    return envelope.created(machine);
});
