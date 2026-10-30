/**
 * Vendor Detail API — /api/purchasing/vendors/[id]
 * ─────────────────────────────────────────────────────────
 * PUT    — Update a vendor
 * DELETE — Delete a vendor
 */

import { NextResponse, NextRequest } from "next/server";
import { getDataOwnerId } from "@/lib/auth-session";
import { requireRole } from "@/lib/require-role";
import { getPurchasingService } from "@/modules/purchasing";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const authResult = await requireRole(["Owner", "Admin", "Manager", "Accountant"]);
        if (authResult.error || !authResult.user) {
            return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 });
        }
        const user = authResult.user;

        const { id } = await params;
        const body = await request.json();
        const service = getPurchasingService();
        const updated = await service.updateVendor(id, getDataOwnerId(user), body);

        return NextResponse.json({ success: true, data: updated });
    } catch (error: unknown) {
        const status = (error as { statusCode?: number }).statusCode || 500;
        return NextResponse.json(
            { error: (error as Error).message, details: (error as { details?: unknown }).details },
            { status },
        );
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        // Enforce Owner/Admin only for deleting vendors (aligned with UI isAdmin check)
        const authResult = await requireRole(["Owner", "Admin"]);
        if (authResult.error || !authResult.user) {
            return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 });
        }
        const user = authResult.user;

        const { id } = await params;
        const service = getPurchasingService();
        await service.deleteVendor(id, getDataOwnerId(user));

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const status = (error as { statusCode?: number }).statusCode || 500;
        return NextResponse.json({ error: (error as Error).message }, { status });
    }
}
