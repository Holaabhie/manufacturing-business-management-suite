import { NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { envelope } from "@/shared/types/api";
import { getClientService } from "@/modules/clients";
import { getDataOwnerId } from "@/lib/auth-session";

export const GET = withApiRoute(
    withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: { params: Promise<{ id: string }> }) => {
        const { id } = await context!.params;
        const products = await getClientService().findProducts(id, getDataOwnerId(user));
        return envelope.ok(products);
    })
);

export const POST = withApiRoute(
    withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: { params: Promise<{ id: string }> }) => {
        const { id } = await context!.params;
        const body = await request.json();
        const product = await getClientService().createProduct(id, getDataOwnerId(user), body);
        return envelope.created(product);
    }, { role: "Admin" }) // Only Admins can add products based on frontend logic
);
