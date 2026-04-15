import { NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { envelope } from "@/shared/types/api";
import { getClientService } from "@/modules/clients";
import { getDataOwnerId } from "@/lib/auth-session";

export const DELETE = withApiRoute(
    withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: { params: Promise<{ id: string }> }) => {
        const { id } = await context!.params;
        await getClientService().deleteMaterial(id, getDataOwnerId(user));
        return envelope.noContent();
    }, { role: "Admin" }) // Only Admins can delete materials
);
