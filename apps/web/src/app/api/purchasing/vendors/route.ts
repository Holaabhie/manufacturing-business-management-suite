/**
 * Vendors API — /api/purchasing/vendors
 * ─────────────────────────────────────────────────────────
 * GET  — List all vendors
 * POST — Create a new vendor
 */

import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { requireRole } from "@/lib/require-role";
import { getPurchasingService } from "@/modules/purchasing";

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const service = getPurchasingService();
        const vendors = await service.findAllVendors(getDataOwnerId(user));

        return NextResponse.json({ success: true, data: vendors });
    } catch (error: any) {
        console.error("Error fetching vendors:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await requireRole(["Owner", "Admin", "Manager", "Accountant"]);
        if (authResult.error || !authResult.user) {
            return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 });
        }
        const user = authResult.user;

        const body = await request.json();
        const service = getPurchasingService();
        const vendor = await service.createVendor(getDataOwnerId(user), body);

        return NextResponse.json({ success: true, data: vendor }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating vendor:", error);
        const status = error.statusCode || 500;
        return NextResponse.json(
            { error: error.message, details: error.details },
            { status },
        );
    }
}
