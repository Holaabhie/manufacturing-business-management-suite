/**
 * Profit Margins API — /api/v1/orders/profit-margins
 * ─────────────────────────────────────────────────────────
 * Calculates per-order profit margins and overall summary.
 * Uses material_cost, labour_cost, overhead_cost fields on orders.
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

            // Fetch orders with client info
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
                            delivery_date: 1,
                            createdAt: 1,
                            client: { $arrayElemAt: ["$client", 0] },
                        },
                    },
                ])
                .toArray();

            // Calculate margins for each order
            let totalRevenue = 0;
            let totalProfit = 0;
            let marginSum = 0;
            let ordersWithMargins = 0;

            const orderMargins = orders.map((order) => {
                const revenue = Number(order.total_amount || 0);
                const materialCost = Number(order.material_cost || 0);
                const labourCost = Number(order.labour_cost || 0);
                const overheadCost = Number(order.overhead_cost || 0);
                const totalCost = materialCost + labourCost + overheadCost;
                const netProfit = revenue - totalCost;
                const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

                totalRevenue += revenue;
                totalProfit += netProfit;

                // Only count orders with actual cost data for avg margin
                if (totalCost > 0) {
                    marginSum += margin;
                    ordersWithMargins++;
                }

                return {
                    id: order._id.toString(),
                    productName: order.product_name,
                    quantity: order.quantity,
                    rate: order.rate,
                    revenue,
                    materialCost,
                    labourCost,
                    overheadCost,
                    totalCost,
                    netProfit,
                    margin: Math.round(margin * 10) / 10,
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
                totalProfit,
                avgMargin,
                totalOrders: orders.length,
                ordersWithCostData: ordersWithMargins,
                highMargin: orderMargins.filter((o) => o.margin >= 30).length,
                lowMargin: orderMargins.filter((o) => o.margin > 0 && o.margin < 15).length,
            };

            return envelope.ok({ summary, orders: orderMargins });
        }),
    ),
    { tier: "read" },
);
