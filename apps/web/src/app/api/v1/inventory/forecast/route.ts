/**
 * Inventory Forecast API — /api/v1/inventory/forecast
 * ─────────────────────────────────────────────────────────
 * Calculates 6-week stock projections based on recent order
 * consumption patterns. Returns materials sorted by urgency.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDb } from "@/lib/mongodb";
import { getDataOwnerId } from "@/lib/auth-session";

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_request: NextRequest, user: AuthenticatedUser) => {
            const db = await getDb();
            const ownerId = getDataOwnerId(user);

            // ── 1. Fetch all inventory items ──────────────────────
            const items = await db
                .collection("inventory")
                .find({ userId: ownerId })
                .toArray();

            // ── 2. Fetch last 8 weeks of orders to calculate consumption ──
            const eightWeeksAgo = new Date();
            eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

            const recentOrders = await db
                .collection("orders")
                .find({
                    userId: ownerId,
                    createdAt: { $gte: eightWeeksAgo },
                })
                .toArray();

            // ── 3. Fetch order_inventory_items for material consumption ──
            const orderIds = recentOrders.map((o) => o._id.toString());
            const consumptionRecords = await db
                .collection("order_inventory_items")
                .find({
                    order_id: { $in: orderIds },
                })
                .toArray();

            // ── 4. Build consumption map: inventory_id → total consumed ──
            const consumptionMap: Record<string, number> = {};
            for (const record of consumptionRecords) {
                const invId = record.inventory_id?.toString() || "";
                const qty = Number(record.quantity_deducted || 0);
                consumptionMap[invId] = (consumptionMap[invId] || 0) + qty;
            }

            // ── 5. Calculate forecast for each material ─────────
            const weeksOfData = 8;
            const forecastWeeks = 6;

            const forecasts = items.map((item) => {
                const itemId = item._id.toString();
                const currentStock = Number(item.quantity || 0);
                const minStockLevel = Number(item.min_stock_level || 0);
                const totalConsumed = consumptionMap[itemId] || 0;
                const weeklyConsumption = totalConsumed / weeksOfData;

                // Project stock levels for next 6 weeks
                const projectedWeeks = [];
                let stockLevel = currentStock;
                for (let w = 0; w < forecastWeeks; w++) {
                    stockLevel = Math.max(0, stockLevel - weeklyConsumption);
                    projectedWeeks.push({
                        week: w + 1,
                        label: `W${w + 1}`,
                        projected: Math.round(stockLevel * 100) / 100,
                    });
                }

                // Calculate days until reorder point
                const daysUntilReorder =
                    weeklyConsumption > 0
                        ? Math.max(0, Math.floor(((currentStock - minStockLevel) / weeklyConsumption) * 7))
                        : 999;

                // Determine status
                let status: "critical" | "warning" | "ok";
                if (currentStock <= minStockLevel) {
                    status = "critical";
                } else if (currentStock <= minStockLevel * 1.5) {
                    status = "warning";
                } else {
                    status = "ok";
                }

                // Reorder date
                const reorderDate = new Date();
                reorderDate.setDate(reorderDate.getDate() + daysUntilReorder);

                return {
                    id: itemId,
                    name: item.name,
                    unit: item.unit || "units",
                    currentStock,
                    minStockLevel,
                    supplierWhatsapp: item.supplier_whatsapp || "",
                    purchaseCostPerUnit: Number(item.purchase_cost_per_unit || 0),
                    weeklyConsumption: Math.round(weeklyConsumption * 100) / 100,
                    daysUntilReorder,
                    reorderDate: reorderDate.toISOString().split("T")[0],
                    status,
                    projectedWeeks,
                };
            });

            // Sort: Critical → Warning → OK
            const statusOrder = { critical: 0, warning: 1, ok: 2 };
            forecasts.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

            // Summary stats
            const summary = {
                totalMaterials: forecasts.length,
                critical: forecasts.filter((f) => f.status === "critical").length,
                warning: forecasts.filter((f) => f.status === "warning").length,
                ok: forecasts.filter((f) => f.status === "ok").length,
            };

            return envelope.ok({ summary, forecasts });
        }),
    ),
    { tier: "read" },
);
