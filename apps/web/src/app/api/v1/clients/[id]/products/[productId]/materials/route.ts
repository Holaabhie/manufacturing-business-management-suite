import { NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { envelope } from "@/shared/types/api";
import { getClientService } from "@/modules/clients";
import { getDataOwnerId } from "@/lib/auth-session";

export const GET = withApiRoute(
    withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: { params: Promise<{ id: string; productId: string }> }) => {
        const { productId } = await context!.params;
        const materials = await getClientService().findMaterialsByProduct(productId, getDataOwnerId(user));
        return envelope.ok(materials);
    })
);

export const POST = withApiRoute(
    withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: { params: Promise<{ id: string; productId: string }> }) => {
        const { id, productId } = await context!.params;
        const body = await request.json();
        const material = await getClientService().createMaterial(productId, id, getDataOwnerId(user), body);
        return envelope.created(material);
    }, { role: "Admin" }) // Only Admins can add materials based on frontend logic
);
