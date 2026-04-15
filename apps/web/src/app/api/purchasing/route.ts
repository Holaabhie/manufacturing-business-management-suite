/**
 * Purchasing API — /api/purchasing
 * ─────────────────────────────────────────────────────────
 * GET  — List all purchase orders
 * POST — Create a new purchase order
 */

import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getPurchasingService } from "@/modules/purchasing";

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const service = getPurchasingService();
        const orders = await service.findAllOrders(getDataOwnerId(user));

        return NextResponse.json({ success: true, data: orders });
    } catch (error: any) {
        console.error("Error fetching purchase orders:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const service = getPurchasingService();
        const order = await service.createOrder(getDataOwnerId(user), body);

        return NextResponse.json({ success: true, data: order }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating purchase order:", error);
        const status = error.statusCode || 500;
        return NextResponse.json(
            { error: error.message, details: error.details },
            { status },
        );
    }
}
