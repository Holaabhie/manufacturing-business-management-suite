/**
 * Inventory API — /api/v1/inventory
 * ─────────────────────────────────────────────────────────
 * REFERENCE IMPLEMENTATION: Shows the fully-composed middleware stack.
 *
 * Middleware composition (outermost → innermost):
 *   withRateLimit → withApiRoute → withAuth → handler
 *
 * Each layer handles one concern:
 *   - withRateLimit: Blocks abusive traffic, adds X-RateLimit-* headers
 *   - withApiRoute:  Catches errors, adds X-Request-ID, logs timing
 *   - withAuth:      Verifies session, checks role/permissions
 *   - handler:       Pure business logic delegation to service
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getInventoryService } from "@/modules/inventory";
import type { InventoryItem } from "@/modules/inventory";
import { getDataOwnerId } from "@/lib/auth-session";

// ─── Response Mapper: Domain Entity → Frontend snake_case format ──
// The frontend expects snake_case fields (purchase_cost_per_unit, min_stock_level, etc.)
// but the domain entity uses camelCase. This mapper bridges the gap.
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
        last_source_po_id: item.lastSourcePoId ?? null,
        last_source_po_number: item.lastSourcePoNumber ?? null,
        last_received_at: item.lastReceivedAt ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}

// ─── GET /api/v1/inventory ──────────────────────────────────────
// Middleware: rate-limit (read tier) → error handling → auth
export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_request: NextRequest, user: AuthenticatedUser) => {
            const service = getInventoryService();
            const items = await service.findAll(getDataOwnerId(user));
            return envelope.ok(items.map(toApiResponse));
        }),
    ),
    { tier: "read" },
);

// ─── POST /api/v1/inventory ─────────────────────────────────────
// Middleware: rate-limit (write tier) → error handling → auth
export const POST = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            const body = await request.json();
            // Map legacy and new fields
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
            const item = await service.create(getDataOwnerId(user), input);

            return envelope.created(toApiResponse(item));
        }),
    ),
    { tier: "write" },
);
