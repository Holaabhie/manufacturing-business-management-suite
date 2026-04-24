/**
 * Inventory Item API — /api/v1/inventory/[id]
 * ─────────────────────────────────────────────────────────
 * Single-item operations with full middleware stack.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getInventoryService } from "@/modules/inventory";
import type { InventoryItem } from "@/modules/inventory";
import { getDataOwnerId } from "@/lib/auth-session";

type RouteContext = { params: Promise<{ id: string }> };

// ─── Response Mapper: Domain Entity → Frontend snake_case format ──
function toApiResponse(item: InventoryItem) {
    return {
        id: item.id,
        userId: item.userId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        min_stock_level: item.minStockLevel,
        supplier_whatsapp: item.supplierWhatsapp,
        purchase_cost_per_unit: item.purchaseCostPerUnit,
        hsn_code: item.hsn_code ?? "",
        tax_rate: item.tax_rate ?? 18,
        track_inventory: item.track_inventory ?? true,
        item_type: item.item_type || "Goods",
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}

// ─── GET /api/v1/inventory/[id] ─────────────────────────────────
export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const service = getInventoryService();
            const item = await service.findById(id, getDataOwnerId(user));
            return envelope.ok(toApiResponse(item));
        }),
    ),
    { tier: "read" },
);

// ─── PUT /api/v1/inventory/[id] ─────────────────────────────────
export const PUT = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const body = await request.json();

            const input = {
                name: body.name,
                quantity: body.quantity,
                unit: body.unit,
                minStockLevel: body.minStockLevel ?? body.min_stock_level,
                supplierWhatsapp: body.supplierWhatsapp ?? body.supplier_whatsapp,
                purchaseCostPerUnit: body.purchaseCostPerUnit ?? body.purchase_cost_per_unit,
                hsn_code: body.hsn_code,
                tax_rate: body.tax_rate,
                track_inventory: body.track_inventory,
                item_type: body.item_type || "Goods",
            };

            const service = getInventoryService();
            const updated = await service.update(id, getDataOwnerId(user), input);
            return envelope.ok(toApiResponse(updated));
        }),
    ),
    { tier: "write" },
);

// ─── DELETE /api/v1/inventory/[id] ──────────────────────────────
export const DELETE = withRateLimit(
    withApiRoute(
        withAuth(async (_request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const service = getInventoryService();
            await service.delete(id, getDataOwnerId(user));
            return envelope.noContent();
        }),
    ),
    { tier: "write" },
);

