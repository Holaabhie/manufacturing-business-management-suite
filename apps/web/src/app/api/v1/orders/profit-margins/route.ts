/**
 * Profit Margins API — /api/v1/orders/profit-margins
 * ─────────────────────────────────────────────────────────
 * Calculates per-order profit margins with AUTO material cost
 * computation by joining Orders → Productions → Inventory.
 *
 * Material Cost = Σ (landedCost × quantityUsed)
 *   where landedCost = purchase_cost_per_unit × (1 + tax_rate / 100)
 *
 * Also returns labour_cost, machinery_cost, overhead_cost from order doc.
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

            // ── 1. Fetch orders with client info ──────────────────────
            const orders = await db
                .collection("orders")
                .aggregate([
                    { $match: { userId: ownerId } },
                    { $sort: { createdAt: -1 } },
                    {
                        $addFields: {
                            client_oid: {
                                $cond: {
                                    if: { $and: [{ $ne: ["$client_id", null] }, { $ne: ["$client_id", ""] }] },
                                    then: { $toObjectId: "$client_id" },
                                    else: null,
                                },
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: "clients",
                            localField: "client_oid",
                            foreignField: "_id",
                            as: "client",
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            product_name: 1,
                            quantity: 1,
                            rate: 1,
                            total_amount: 1,
                            status: 1,
                            payment_status: 1,
                            material_cost: 1,
                            labour_cost: 1,
                            overhead_cost: 1,
                            machinery_cost: 1,
                            delivery_date: 1,
                            createdAt: 1,
                            client: { $arrayElemAt: ["$client", 0] },
                        },
                    },
                ])
                .toArray();

            // ── 2. Fetch ALL productions for this user ────────────────
            //    Build a map: orderId → materials[]
            const productions = await db
                .collection("productions")
                .find({ userId: ownerId })
                .project({ orderId: 1, materials: 1 })
                .toArray();

            const productionsByOrderId = new Map<string, Array<{ inventoryId: string; name: string; quantityUsed: number }>>();
            for (const prod of productions) {
                const oid = String(prod.orderId || "");
                if (!oid) continue;
                const existing = productionsByOrderId.get(oid) || [];
                const mats = Array.isArray(prod.materials) ? prod.materials : [];
                existing.push(...mats.map((m: any) => ({
                    inventoryId: String(m.inventoryId || ""),
                    name: String(m.name || "Unknown"),
                    quantityUsed: Number(m.quantityUsed || 0),
                })));
                productionsByOrderId.set(oid, existing);
            }

            // ── 3. Fetch ALL inventory items to build cost map ────────
            //    inventoryId → { landedCost, name }
            const inventoryItems = await db
                .collection("inventory")
                .find({ userId: ownerId })
                .project({ _id: 1, name: 1, purchase_cost_per_unit: 1, tax_rate: 1 })
                .toArray();

            const inventoryCostMap = new Map<string, { landedCost: number; name: string }>();
            for (const item of inventoryItems) {
                const baseCost = Number(item.purchase_cost_per_unit || 0);
                const taxRate = Number(item.tax_rate || 0);
                const landedCost = baseCost * (1 + taxRate / 100);
                inventoryCostMap.set(item._id.toString(), {
                    landedCost,
                    name: String(item.name || "Unknown"),
                });
            }

            // ── 4. Calculate margins for each order ──────────────────
            let totalRevenue = 0;
            let totalCostSum = 0;
            let totalProfit = 0;
            let marginSum = 0;
            let ordersWithMargins = 0;

            const orderMargins = orders.map((order) => {
                const orderId = order._id.toString();
                const revenue = Number(order.total_amount || 0);

                // Auto-compute material cost from production materials
                const prodMaterials = productionsByOrderId.get(orderId) || [];
                const hasProduction = prodMaterials.length > 0;
                let autoMaterialCost = 0;
                const materialWarnings: string[] = [];

                for (const mat of prodMaterials) {
                    const invData = inventoryCostMap.get(mat.inventoryId);
                    if (!invData) {
                        materialWarnings.push(mat.name);
                        continue;
                    }
                    if (invData.landedCost === 0) {
                        materialWarnings.push(invData.name);
                    }
                    autoMaterialCost += invData.landedCost * mat.quantityUsed;
                }

                // If no production, fall back to saved material_cost on the order
                const savedMaterialCost = Number(order.material_cost || 0);
                const effectiveMaterialCost = hasProduction ? autoMaterialCost : savedMaterialCost;

                const labourCost = Number(order.labour_cost || 0);
                const machineryCost = Number(order.machinery_cost || 0);
                const overheadCost = Number(order.overhead_cost || 0);
                const totalCost = effectiveMaterialCost + labourCost + machineryCost + overheadCost;

                // When total cost is 0, still show material cost if computed
                const hasCostData = totalCost > 0;
                const netProfit = hasCostData ? revenue - totalCost : null;
                const margin = hasCostData
                    ? (revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0)
                    : null;

                totalRevenue += revenue;
                if (netProfit !== null) {
                    totalCostSum += totalCost;
                    totalProfit += netProfit;
                }

                if (hasCostData && margin !== null) {
                    marginSum += margin;
                    ordersWithMargins++;
                }

                return {
                    id: orderId,
                    productName: order.product_name,
                    quantity: order.quantity,
                    rate: order.rate,
                    revenue,
                    // Material cost breakdown
                    autoMaterialCost: Math.round(autoMaterialCost * 100) / 100,
                    savedMaterialCost,
                    materialCost: Math.round(effectiveMaterialCost * 100) / 100,
                    materialWarnings,
                    hasProduction,
                    // Other costs
                    labourCost,
                    machineryCost,
                    overheadCost,
                    // Totals
                    totalCost: Math.round(totalCost * 100) / 100,
                    netProfit: netProfit !== null ? Math.round(netProfit * 100) / 100 : null,
                    margin: margin !== null ? Math.round(margin * 10) / 10 : null,
                    // Meta
                    status: order.status,
                    paymentStatus: order.payment_status,
                    deliveryDate: order.delivery_date,
                    createdAt: order.createdAt,
                    clientName: order.client?.name || "Unknown",
                };
            });

            const avgMargin = ordersWithMargins > 0
                ? Math.round((marginSum / ordersWithMargins) * 10) / 10
                : 0;

            const summary = {
                totalRevenue,
                totalCost: Math.round(totalCostSum * 100) / 100,
                totalProfit: Math.round(totalProfit * 100) / 100,
                avgMargin,
                totalOrders: orders.length,
                ordersWithCostData: ordersWithMargins,
                highMargin: orderMargins.filter((o) => o.margin !== null && o.margin >= 30).length,
                lowMargin: orderMargins.filter((o) => o.margin !== null && o.margin > 0 && o.margin < 15).length,
            };

            return envelope.ok({ summary, orders: orderMargins });
        }),
    ),
    { tier: "read" },
);
