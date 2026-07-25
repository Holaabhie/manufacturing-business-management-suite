import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

/**
 * GET /api/dashboard/analytics?range=30d
 *
 * Aggregated analytics endpoint returning:
 *  - Revenue trend (current vs last year, monthly)
 *  - Production efficiency (monthly average)
 *  - Order status distribution
 *  - Top products by revenue
 *  - Inventory breakdown (by unit type)
 *  - KPI summary cards (with current-vs-previous growth)
 *  - Order funnel (independent stage tallies)
 *  - Production quality (produced vs rejected, monthly)
 *  - Top clients by revenue
 */
export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();
        const userId = getDataOwnerId(user);

        const { searchParams } = new URL(request.url);
        const range = searchParams.get("range") || "30d";

        // Calculate date boundaries
        const now = new Date();
        const rangeDays = range === "7d" ? 7 : range === "90d" ? 90 : range === "1y" ? 365 : 30;
        const rangeStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
        const lastYearStart = new Date(rangeStart);
        lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
        const lastYearEnd = new Date(now);
        lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

        // Previous equal-length period for KPI growth comparison
        const prevRangeEnd = new Date(rangeStart.getTime() - 1); // 1ms before current range
        const prevRangeStart = new Date(prevRangeEnd.getTime() - rangeDays * 24 * 60 * 60 * 1000);

        // ─── All queries in parallel ───────────────────────────
        const [
            revenueByMonth,
            lastYearRevenueByMonth,
            productionEfficiency,
            orderStatusCounts,
            topProductsAgg,
            inventoryBreakdown,
            totalOrdersCount,
            completedOrdersCount,
            totalRevenueAgg,
            totalInventoryCount,
            ordersInRange,
            inventoryMovement,
            // ── New queries ──
            orderFunnelAgg,
            productionQualityAgg,
            topClientsAgg,
            // KPI growth: current range revenue
            currentRangeRevenueAgg,
            // KPI growth: previous range revenue
            prevRangeRevenueAgg,
        ] = await Promise.all([
            // Current year revenue grouped by month
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m", date: { $toDate: "$createdAt" } } },
                            revenue: { $sum: { $toDouble: "$total_amount" } },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray(),

            // Last year revenue grouped by month (same period, previous year)
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: lastYearStart, $lte: lastYearEnd } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m", date: { $toDate: "$createdAt" } } },
                            revenue: { $sum: { $toDouble: "$total_amount" } },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray(),

            // Production efficiency by month
            db
                .collection("productions")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart }, status: { $ne: "closed" } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m", date: { $toDate: "$createdAt" } } },
                            avgEfficiency: { $avg: "$progressPercent" },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray(),

            // Order status distribution (derived from production_status + payment_status)
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart } } },
                    {
                        $addFields: {
                            effective_status: {
                                $cond: {
                                    if: {
                                        $and: [
                                            { $eq: ["$production_status", "completed"] },
                                            { $eq: ["$payment_status", "paid"] },
                                        ],
                                    },
                                    then: "completed",
                                    else: {
                                        $ifNull: ["$production_status", { $ifNull: ["$status", "pending"] }],
                                    },
                                },
                            },
                        },
                    },
                    { $group: { _id: "$effective_status", count: { $sum: 1 } } },
                ])
                .toArray(),

            // Top 5 products by revenue
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart } } },
                    {
                        $group: {
                            _id: "$product_name",
                            units: { $sum: { $toInt: { $ifNull: ["$quantity", 0] } } },
                            revenue: { $sum: { $toDouble: "$total_amount" } },
                        },
                    },
                    { $sort: { revenue: -1 } },
                    { $limit: 5 },
                ])
                .toArray(),

            // Inventory breakdown by unit type (FIX: was using non-existent $category)
            db
                .collection("inventory")
                .aggregate([
                    { $match: { userId } },
                    {
                        $group: {
                            _id: { $ifNull: ["$unit", "Other"] },
                            count: { $sum: 1 },
                            totalValue: {
                                $sum: {
                                    $multiply: [
                                        { $toDouble: { $ifNull: ["$quantity", 0] } },
                                        { $toDouble: { $ifNull: ["$purchase_cost_per_unit", 0] } },
                                    ],
                                },
                            },
                        },
                    },
                    { $sort: { totalValue: -1 } },
                ])
                .toArray(),

            // Total orders (all time)
            db.collection("orders").countDocuments({ userId }),

            // Fully completed orders (production done AND payment done)
            db.collection("orders").countDocuments({
                userId,
                production_status: "completed",
                payment_status: "paid",
            }),

            // Total revenue (all time)
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId } },
                    { $group: { _id: null, total: { $sum: { $toDouble: "$total_amount" } } } },
                ])
                .toArray(),

            // Total inventory items
            db.collection("inventory").countDocuments({ userId }),

            // Orders in range (for turnover calc)
            db.collection("orders").countDocuments({ userId, createdAt: { $gte: rangeStart } }),

            // Inventory items with recent movement
            db.collection("inventory").countDocuments({
                userId,
                updatedAt: { $gte: rangeStart },
            }),

            // ═══════════════════════════════════════════════════
            // NEW: Order Funnel — independent tallies per stage
            // ═══════════════════════════════════════════════════
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart } } },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            inProduction: {
                                $sum: {
                                    $cond: [
                                        {
                                            $in: [
                                                "$production_status",
                                                ["processing", "in_progress", "printing", "completed"],
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            productionComplete: {
                                $sum: {
                                    $cond: [{ $eq: ["$production_status", "completed"] }, 1, 0],
                                },
                            },
                            fullyPaid: {
                                $sum: {
                                    $cond: [{ $eq: ["$payment_status", "paid"] }, 1, 0],
                                },
                            },
                        },
                    },
                ])
                .toArray(),

            // ═══════════════════════════════════════════════════
            // NEW: Production Quality — produced vs rejected, monthly
            // Uses productions.createdAt for month bucketing
            // ═══════════════════════════════════════════════════
            db
                .collection("productions")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m", date: { $toDate: "$createdAt" } } },
                            produced: { $sum: { $toDouble: { $ifNull: ["$producedQuantity", 0] } } },
                            rejected: { $sum: { $toDouble: { $ifNull: ["$rejectQuantity", 0] } } },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray(),

            // ═══════════════════════════════════════════════════
            // NEW: Top 5 Clients by revenue
            // Guards against null/empty client_id before $toObjectId
            // ═══════════════════════════════════════════════════
            db
                .collection("orders")
                .aggregate([
                    {
                        $match: {
                            userId,
                            createdAt: { $gte: rangeStart },
                            client_id: { $nin: [null, ""] },
                        },
                    },
                    {
                        $addFields: {
                            client_oid: {
                                $cond: {
                                    if: {
                                        $and: [
                                            { $ne: ["$client_id", null] },
                                            { $ne: ["$client_id", ""] },
                                        ],
                                    },
                                    then: { $toObjectId: "$client_id" },
                                    else: null,
                                },
                            },
                        },
                    },
                    {
                        $group: {
                            _id: "$client_oid",
                            totalRevenue: { $sum: { $toDouble: "$total_amount" } },
                            orderCount: { $sum: 1 },
                        },
                    },
                    { $sort: { totalRevenue: -1 } },
                    { $limit: 5 },
                    {
                        $lookup: {
                            from: "clients",
                            localField: "_id",
                            foreignField: "_id",
                            as: "clientDoc",
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            name: {
                                $ifNull: [
                                    { $arrayElemAt: ["$clientDoc.name", 0] },
                                    "Unknown Client",
                                ],
                            },
                            totalRevenue: 1,
                            orderCount: 1,
                        },
                    },
                ])
                .toArray(),

            // ═══════════════════════════════════════════════════
            // NEW: KPI Growth — current range revenue
            // ═══════════════════════════════════════════════════
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart } } },
                    { $group: { _id: null, total: { $sum: { $toDouble: "$total_amount" } } } },
                ])
                .toArray(),

            // NEW: KPI Growth — previous equal range revenue
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: prevRangeStart, $lte: prevRangeEnd } } },
                    { $group: { _id: null, total: { $sum: { $toDouble: "$total_amount" } } } },
                ])
                .toArray(),
        ]);

        // ─── Format revenue trend ────────────────────────────
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const lastYearMap: Record<string, number> = {};
        lastYearRevenueByMonth.forEach((item: any) => {
            // Shift month key to current year for comparison
            const parts = item._id.split("-");
            const monthIdx = parseInt(parts[1], 10) - 1;
            lastYearMap[monthNames[monthIdx]] = item.revenue || 0;
        });

        const revenueData = revenueByMonth.map((item: any) => {
            const parts = item._id.split("-");
            const monthIdx = parseInt(parts[1], 10) - 1;
            const month = monthNames[monthIdx] || item._id;
            return {
                month,
                revenue: Math.round(item.revenue || 0),
                lastYear: Math.round(lastYearMap[month] || 0),
            };
        });

        // ─── Format production efficiency ────────────────────
        const productionData = productionEfficiency.map((item: any) => {
            const parts = item._id.split("-");
            const monthIdx = parseInt(parts[1], 10) - 1;
            return {
                month: monthNames[monthIdx] || item._id,
                efficiency: Math.round(item.avgEfficiency || 0),
            };
        });

        // ─── Format order status distribution ────────────────
        const totalOrdersInRange = orderStatusCounts.reduce((sum: number, s: any) => sum + s.count, 0);
        const statusColorMap: Record<string, string> = {
            completed: "#16A34A",
            in_progress: "#2563EB",
            processing: "#2563EB",
            pending: "#F59E0B",
            cancelled: "#DC2626",
        };
        const statusNameMap: Record<string, string> = {
            completed: "Completed",
            in_progress: "In Progress",
            processing: "In Progress",
            pending: "Pending",
            cancelled: "Cancelled",
        };

        // Merge processing/in_progress into one bucket
        const mergedStatus: Record<string, { value: number; color: string; name: string }> = {};
        orderStatusCounts.forEach((s: any) => {
            const name = statusNameMap[s._id] || s._id || "Other";
            const color = statusColorMap[s._id] || "#6B7280";
            if (mergedStatus[name]) {
                mergedStatus[name].value += s.count;
            } else {
                mergedStatus[name] = { value: s.count, color, name };
            }
        });

        const orderStatusData = Object.values(mergedStatus).map((s) => ({
            name: s.name,
            value: totalOrdersInRange > 0 ? Math.round((s.value / totalOrdersInRange) * 100) : 0,
            color: s.color,
        }));

        // ─── Format top products ─────────────────────────────
        const topProducts = topProductsAgg.map((p: any) => ({
            name: p._id || "Unknown Product",
            units: p.units || 0,
            revenue: Math.round(p.revenue || 0),
        }));

        // ─── Format inventory breakdown ──────────────────────
        const totalInventoryItems = inventoryBreakdown.reduce((sum: number, cat: any) => sum + cat.count, 0);
        const inventoryData = inventoryBreakdown.map((cat: any) => ({
            category: cat._id || "Other",
            value: totalInventoryItems > 0 ? Math.round((cat.count / totalInventoryItems) * 100) : 0,
        }));

        // ─── Format order funnel ─────────────────────────────
        const funnelRaw = orderFunnelAgg[0] || { total: 0, inProduction: 0, productionComplete: 0, fullyPaid: 0 };
        const orderFunnel = [
            { stage: "Total Orders", count: funnelRaw.total },
            { stage: "In Production", count: funnelRaw.inProduction },
            { stage: "Production Complete", count: funnelRaw.productionComplete },
            { stage: "Fully Paid", count: funnelRaw.fullyPaid },
        ];

        // ─── Format production quality ───────────────────────
        const productionQuality = productionQualityAgg.map((item: any) => {
            const parts = item._id.split("-");
            const monthIdx = parseInt(parts[1], 10) - 1;
            return {
                month: monthNames[monthIdx] || item._id,
                produced: Math.round(item.produced || 0),
                rejected: Math.round(item.rejected || 0),
            };
        });

        // ─── Format top clients ──────────────────────────────
        const topClients = topClientsAgg.map((c: any) => ({
            name: c.name || "Unknown Client",
            totalRevenue: Math.round(c.totalRevenue || 0),
            orderCount: c.orderCount || 0,
        }));

        // ─── Compute KPIs ────────────────────────────────────
        const totalRevenue = totalRevenueAgg[0]?.total || 0;
        const completionRate = totalOrdersCount > 0 ? Math.round((completedOrdersCount / totalOrdersCount) * 100) : 0;
        const avgEfficiency =
            productionEfficiency.length > 0
                ? Math.round(productionEfficiency.reduce((s: number, p: any) => s + (p.avgEfficiency || 0), 0) / productionEfficiency.length)
                : 0;

        // Inventory turnover = orders filled / avg inventory (simplified)
        const inventoryTurnover =
            totalInventoryCount > 0 ? Math.round((ordersInRange / totalInventoryCount) * 10) / 10 : 0;

        // Revenue growth: current range vs previous equal range
        // (Behavior change: previously used first-half/second-half split within range)
        const currentRevenue = currentRangeRevenueAgg[0]?.total || 0;
        const prevRevenue = prevRangeRevenueAgg[0]?.total || 0;
        const revenueGrowth = prevRevenue > 0
            ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 1000) / 10
            : 0;

        return NextResponse.json({
            revenueData,
            productionData,
            orderStatusData,
            topProducts,
            inventoryData,
            kpis: {
                totalRevenue,
                revenueGrowth,
                avgEfficiency,
                completionRate,
                inventoryTurnover,
            },
            // New data
            orderFunnel,
            productionQuality,
            topClients,
        });
    } catch (error: any) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
