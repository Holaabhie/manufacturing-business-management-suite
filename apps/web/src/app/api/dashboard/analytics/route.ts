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
 *  - Inventory breakdown
 *  - KPI summary cards
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
                    { $match: { userId, createdAt: { $gte: rangeStart } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m", date: { $toDate: "$createdAt" } } },
                            avgEfficiency: { $avg: "$progressPercent" },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray(),

            // Order status distribution
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart } } },
                    { $group: { _id: "$status", count: { $sum: 1 } } },
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

            // Inventory breakdown by category
            db
                .collection("inventory")
                .aggregate([
                    { $match: { userId } },
                    {
                        $group: {
                            _id: { $ifNull: ["$category", "Uncategorized"] },
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

            // Completed orders (all time)
            db.collection("orders").countDocuments({ userId, status: "completed" }),

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

        // Revenue growth: compare first half vs second half of range
        const halfPoint = new Date(rangeStart.getTime() + (now.getTime() - rangeStart.getTime()) / 2);
        const firstHalfRevenue = revenueByMonth
            .filter((r: any) => new Date(r._id + "-01") < halfPoint)
            .reduce((s: number, r: any) => s + (r.revenue || 0), 0);
        const secondHalfRevenue = revenueByMonth
            .filter((r: any) => new Date(r._id + "-01") >= halfPoint)
            .reduce((s: number, r: any) => s + (r.revenue || 0), 0);
        const revenueGrowth = firstHalfRevenue > 0 ? Math.round(((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 1000) / 10 : 0;

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
        });
    } catch (error: any) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
