import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { resolvePermissions, hasPermission, isOwnerRole } from "@/lib/permissions";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MATERIAL_COLORS = [
    "#3B82F6", // Blue
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#F97316", // Orange
    "#6366F1", // Indigo
];

function getMonthsSinceSignup(signupDate: Date, now: Date = new Date()) {
    const months: Array<{ value: string; label: string; year: number; month: number; isCurrent: boolean; isPrevious: boolean }> = [];
    const startYear = signupDate.getFullYear();
    const startMonth = signupDate.getMonth();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const prevMonthDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const prevYear = prevMonthDate.getUTCFullYear();
    const prevMonth = prevMonthDate.getUTCMonth();

    let y = startYear;
    let m = startMonth;

    while (y < currentYear || (y === currentYear && m <= currentMonth)) {
        const val = `${y}-${String(m + 1).padStart(2, "0")}`;
        const label = `${monthNames[m]} ${y}`;
        months.push({
            value: val,
            label,
            year: y,
            month: m + 1,
            isCurrent: y === currentYear && m === currentMonth,
            isPrevious: y === prevYear && m === prevMonth,
        });
        m++;
        if (m > 11) {
            m = 0;
            y++;
        }
    }
    return months;
}

/**
 * GET /api/dashboard/analytics?month=YYYY-MM&reportMonth=YYYY-MM
 *
 * Aggregated analytics endpoint with month-wise scoping since tenant signup:
 *  - Month selector list (signup month up to current month)
 *  - Previous month report card (orders placed, fulfilled, revenue, AOV)
 *  - Material consumption donut/pie aggregation (% share per material)
 *  - Revenue trend (daily progression vs last year)
 *  - Production efficiency & quality
 *  - Order status distribution & funnel
 *  - Top products & top clients
 *  - KPI summary cards (scoped to selected month)
 */
export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const perms = resolvePermissions(user.role, (user as any).customPermissions);
        if (!hasPermission(perms, "reports.view", isOwnerRole(user.role))) {
            return NextResponse.json({ error: "Forbidden: reports.view permission required" }, { status: 403 });
        }

        const db = await getDb();
        const userId = getDataOwnerId(user);

        let ownerDoc = null;
        if (ObjectId.isValid(userId)) {
            ownerDoc = await db.collection("users").findOne({ _id: new ObjectId(userId) });
        }
        if (!ownerDoc) {
            ownerDoc = await db.collection("users").findOne({ _id: userId as unknown as ObjectId });
        }

        const earliestOrder = await db.collection("orders").findOne(
            { userId },
            { sort: { createdAt: 1 }, projection: { createdAt: 1 } }
        );

        const signupDate = ownerDoc?.createdAt
            ? new Date(ownerDoc.createdAt)
            : (earliestOrder?.createdAt ? new Date(earliestOrder.createdAt) : new Date());

        const now = new Date();
        const availableMonths = getMonthsSinceSignup(signupDate, now);
        const currentMonthVal = availableMonths[availableMonths.length - 1]?.value || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        // Previous calendar month default
        const prevMonthDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
        const defaultReportMonth = `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;

        const { searchParams } = new URL(request.url);
        const selectedMonth = searchParams.get("month") || currentMonthVal;
        const reportMonth = searchParams.get("reportMonth") || defaultReportMonth;

        // Parse selected month
        const [selYearStr, selMonthStr] = selectedMonth.split("-");
        const selYear = parseInt(selYearStr, 10);
        const selMonth = parseInt(selMonthStr, 10); // 1-indexed

        if (isNaN(selYear) || isNaN(selMonth) || selMonth < 1 || selMonth > 12) {
            return NextResponse.json({ error: "Invalid month format. Expected YYYY-MM." }, { status: 400 });
        }

        // Date boundaries for selected month
        const rangeStart = new Date(Date.UTC(selYear, selMonth - 1, 1, 0, 0, 0, 0));
        const rangeEnd = new Date(Date.UTC(selYear, selMonth, 0, 23, 59, 59, 999));
        const daysInMonth = new Date(selYear, selMonth, 0).getDate();

        // Previous calendar month comparison for KPI growth
        const prevPeriodDate = new Date(Date.UTC(selYear, selMonth - 2, 1));
        const prevCompYear = prevPeriodDate.getUTCFullYear();
        const prevCompMonth = prevPeriodDate.getUTCMonth(); // 0-indexed
        const prevRangeStart = new Date(Date.UTC(prevCompYear, prevCompMonth, 1, 0, 0, 0, 0));
        const prevRangeEnd = new Date(Date.UTC(prevCompYear, prevCompMonth + 1, 0, 23, 59, 59, 999));

        // Last year same month
        const lastYearStart = new Date(Date.UTC(selYear - 1, selMonth - 1, 1, 0, 0, 0, 0));
        const lastYearEnd = new Date(Date.UTC(selYear - 1, selMonth, 0, 23, 59, 59, 999));

        // Date boundaries for Previous Month Report section
        const [repYearStr, repMonthStr] = reportMonth.split("-");
        const repYear = parseInt(repYearStr, 10);
        const repMonth = parseInt(repMonthStr, 10);
        const repStart = new Date(Date.UTC(repYear, repMonth - 1, 1, 0, 0, 0, 0));
        const repEnd = new Date(Date.UTC(repYear, repMonth, 0, 23, 59, 59, 999));

        // ── 2. Run all queries in parallel ────────────────────────
        const [
            dailyRevenueAgg,
            lastYearDailyAgg,
            productionEfficiencyAgg,
            orderStatusCounts,
            topProductsAgg,
            inventoryBreakdown,
            totalOrdersInMonth,
            completedOrdersInMonth,
            monthRevenueAgg,
            prevMonthRevenueAgg,
            totalInventoryCount,
            orderFunnelAgg,
            productionQualityAgg,
            topClientsAgg,
            materialsAggRaw,
            repOrdersPlaced,
            repOrdersCompleted,
            repRevenueAgg,
        ] = await Promise.all([
            // Daily revenue in selected month
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
                    {
                        $group: {
                            _id: { $dayOfMonth: { $toDate: "$createdAt" } },
                            revenue: { $sum: { $toDouble: "$total_amount" } },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray(),

            // Last year same month daily revenue
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: lastYearStart, $lte: lastYearEnd } } },
                    {
                        $group: {
                            _id: { $dayOfMonth: { $toDate: "$createdAt" } },
                            revenue: { $sum: { $toDouble: "$total_amount" } },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray(),

            // Production efficiency in selected month
            db
                .collection("productions")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart, $lte: rangeEnd }, status: { $ne: "closed" } } },
                    {
                        $group: {
                            _id: { $dayOfMonth: { $toDate: "$createdAt" } },
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
                    { $match: { userId, createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
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

            // Top 5 products by revenue in selected month
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
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

            // Inventory breakdown by unit type
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

            // Orders in selected month
            db.collection("orders").countDocuments({ userId, createdAt: { $gte: rangeStart, $lte: rangeEnd } }),

            // Completed orders in selected month
            db.collection("orders").countDocuments({
                userId,
                createdAt: { $gte: rangeStart, $lte: rangeEnd },
                $or: [
                    { production_status: "completed", payment_status: "paid" },
                    { status: "completed" },
                    { production_status: "completed" },
                ],
            }),

            // Total revenue in selected month
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
                    { $group: { _id: null, total: { $sum: { $toDouble: "$total_amount" } } } },
                ])
                .toArray(),

            // Total revenue in previous comparison month
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: prevRangeStart, $lte: prevRangeEnd } } },
                    { $group: { _id: null, total: { $sum: { $toDouble: "$total_amount" } } } },
                ])
                .toArray(),

            // Total inventory items
            db.collection("inventory").countDocuments({ userId }),

            // Order funnel in selected month
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
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

            // Production quality in selected month
            db
                .collection("productions")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
                    {
                        $group: {
                            _id: { $dayOfMonth: { $toDate: "$createdAt" } },
                            produced: { $sum: { $toDouble: { $ifNull: ["$producedQuantity", 0] } } },
                            rejected: { $sum: { $toDouble: { $ifNull: ["$rejectQuantity", 0] } } },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray(),

            // Top 5 clients by revenue in selected month
            db
                .collection("orders")
                .aggregate([
                    {
                        $match: {
                            userId,
                            createdAt: { $gte: rangeStart, $lte: rangeEnd },
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
                                    then: {
                                        $cond: {
                                            if: { $eq: [{ $type: "$client_id" }, "objectId"] },
                                            then: "$client_id",
                                            else: {
                                                $cond: {
                                                    if: { $regexMatch: { input: "$client_id", regex: "^[0-9a-fA-F]{24}$" } },
                                                    then: { $toObjectId: "$client_id" },
                                                    else: null,
                                                },
                                            },
                                        },
                                    },
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

            // Material consumption breakdown in selected month
            db
                .collection("order_inventory_items")
                .aggregate([
                    {
                        $match: {
                            userId,
                            createdAt: { $gte: rangeStart, $lte: rangeEnd },
                        },
                    },
                    {
                        $addFields: {
                            inv_oid: {
                                $cond: {
                                    if: {
                                        $and: [
                                            { $ne: ["$inventory_id", null] },
                                            { $ne: ["$inventory_id", ""] },
                                        ],
                                    },
                                    then: {
                                        $cond: {
                                            if: { $eq: [{ $type: "$inventory_id" }, "objectId"] },
                                            then: "$inventory_id",
                                            else: {
                                                $cond: {
                                                    if: { $regexMatch: { input: "$inventory_id", regex: "^[0-9a-fA-F]{24}$" } },
                                                    then: { $toObjectId: "$inventory_id" },
                                                    else: null,
                                                },
                                            },
                                        },
                                    },
                                    else: null,
                                },
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: "inventory",
                            localField: "inv_oid",
                            foreignField: "_id",
                            as: "invDoc",
                        },
                    },
                    {
                        $addFields: {
                            materialName: {
                                $ifNull: [
                                    "$item_name",
                                    { $arrayElemAt: ["$invDoc.name", 0] },
                                    "Other Material",
                                ],
                            },
                            materialUnit: {
                                $ifNull: [
                                    "$unit",
                                    { $arrayElemAt: ["$invDoc.unit", 0] },
                                    "units",
                                ],
                            },
                        },
                    },
                    {
                        $group: {
                            _id: "$materialName",
                            materialId: { $first: "$inventory_id" },
                            quantity: { $sum: { $toDouble: { $ifNull: ["$quantity_deducted", 0] } } },
                            unit: { $first: "$materialUnit" },
                        },
                    },
                    { $sort: { quantity: -1 } },
                ])
                .toArray(),

            // Previous Month Report: orders placed
            db.collection("orders").countDocuments({
                userId,
                createdAt: { $gte: repStart, $lte: repEnd },
            }),

            // Previous Month Report: orders completed
            db.collection("orders").countDocuments({
                userId,
                createdAt: { $gte: repStart, $lte: repEnd },
                $or: [
                    { production_status: "completed" },
                    { status: "completed" },
                ],
            }),

            // Previous Month Report: total revenue
            db
                .collection("orders")
                .aggregate([
                    { $match: { userId, createdAt: { $gte: repStart, $lte: repEnd } } },
                    { $group: { _id: null, total: { $sum: { $toDouble: "$total_amount" } } } },
                ])
                .toArray(),
        ]);

        // ── 3. Fallback for material usage if order_inventory_items was empty ──
        let materialsAgg = materialsAggRaw;
        if (materialsAgg.length === 0) {
            const orderMaterialsAgg = await db.collection("orders").aggregate([
                {
                    $match: {
                        userId,
                        createdAt: { $gte: rangeStart, $lte: rangeEnd },
                        "materials.0": { $exists: true },
                    },
                },
                { $unwind: "$materials" },
                {
                    $group: {
                        _id: { $ifNull: ["$materials.itemName", "$materials.name", "Other Material"] },
                        materialId: { $first: "$materials.inventoryItemId" },
                        quantity: { $sum: { $toDouble: { $ifNull: ["$materials.quantityRequired", "$materials.quantity", 0] } } },
                        unit: { $first: { $ifNull: ["$materials.unit", "units"] } },
                    },
                },
                { $sort: { quantity: -1 } },
            ]).toArray();

            if (orderMaterialsAgg.length > 0) {
                materialsAgg = orderMaterialsAgg;
            }
        }

        // Format material usage (% share and harmonious colors)
        const totalMatQuantity = materialsAgg.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0);
        const materialUsage = materialsAgg.map((m: any, idx: number) => ({
            materialId: m.materialId ? String(m.materialId) : m._id,
            name: m._id || "Other Material",
            quantity: Math.round((m.quantity || 0) * 10) / 10,
            unit: m.unit || "units",
            percentage: totalMatQuantity > 0 ? Math.round(((m.quantity || 0) / totalMatQuantity) * 1000) / 10 : 0,
            color: MATERIAL_COLORS[idx % MATERIAL_COLORS.length],
        }));

        // ── 4. Format previous month report ───────────────────────
        const repTotalRevenue = Math.round(repRevenueAgg[0]?.total || 0);
        const repAOV = repOrdersPlaced > 0 ? Math.round(repTotalRevenue / repOrdersPlaced) : 0;
        const previousMonthReport = {
            month: reportMonth,
            monthLabel: `${monthNames[repMonth - 1]} ${repYear}`,
            totalOrdersPlaced: repOrdersPlaced,
            totalOrdersCompleted: repOrdersCompleted,
            totalRevenue: repTotalRevenue,
            averageOrderValue: repAOV,
        };

        // ── 5. Format revenue trend (days of the month) ───────────
        const dailyRevMap: Record<number, number> = {};
        dailyRevenueAgg.forEach((item: any) => {
            dailyRevMap[item._id] = item.revenue || 0;
        });

        const lastYearDailyMap: Record<number, number> = {};
        lastYearDailyAgg.forEach((item: any) => {
            lastYearDailyMap[item._id] = item.revenue || 0;
        });

        const curMonthName = monthNames[selMonth - 1];
        const revenueData = [];
        for (let day = 1; day <= daysInMonth; day++) {
            revenueData.push({
                month: `${day} ${curMonthName}`,
                revenue: Math.round(dailyRevMap[day] || 0),
                lastYear: Math.round(lastYearDailyMap[day] || 0),
            });
        }

        // ── 6. Format production efficiency ───────────────────────
        const prodEffMap: Record<number, number> = {};
        productionEfficiencyAgg.forEach((item: any) => {
            prodEffMap[item._id] = item.avgEfficiency || 0;
        });

        const productionData = productionEfficiencyAgg.map((item: any) => ({
            month: `${item._id} ${curMonthName}`,
            efficiency: Math.round(item.avgEfficiency || 0),
        }));

        // ── 7. Format order status distribution ───────────────────
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
            value: totalOrdersInMonth > 0 ? Math.round((s.value / totalOrdersInMonth) * 100) : 0,
            color: s.color,
        }));

        // ── 8. Format top products ────────────────────────────────
        const topProducts = topProductsAgg.map((p: any) => ({
            name: p._id || "Unknown Product",
            units: p.units || 0,
            revenue: Math.round(p.revenue || 0),
        }));

        // ── 9. Format inventory breakdown ─────────────────────────
        const totalInventoryItems = inventoryBreakdown.reduce((sum: number, cat: any) => sum + cat.count, 0);
        const inventoryData = inventoryBreakdown.map((cat: any) => ({
            category: cat._id || "Other",
            value: totalInventoryItems > 0 ? Math.round((cat.count / totalInventoryItems) * 100) : 0,
        }));

        // ── 10. Format order funnel ───────────────────────────────
        const funnelRaw = orderFunnelAgg[0] || { total: 0, inProduction: 0, productionComplete: 0, fullyPaid: 0 };
        const orderFunnel = [
            { stage: "Total Orders", count: funnelRaw.total },
            { stage: "In Production", count: funnelRaw.inProduction },
            { stage: "Production Complete", count: funnelRaw.productionComplete },
            { stage: "Fully Paid", count: funnelRaw.fullyPaid },
        ];

        // ── 11. Format production quality ─────────────────────────
        const productionQuality = productionQualityAgg.map((item: any) => ({
            month: `${item._id} ${curMonthName}`,
            produced: Math.round(item.produced || 0),
            rejected: Math.round(item.rejected || 0),
        }));

        // ── 12. Format top clients ────────────────────────────────
        const topClients = topClientsAgg.map((c: any) => ({
            name: c.name || "Unknown Client",
            totalRevenue: Math.round(c.totalRevenue || 0),
            orderCount: c.orderCount || 0,
        }));

        // ── 13. Compute KPIs (scoped to selected month) ───────────
        const totalRevenue = Math.round(monthRevenueAgg[0]?.total || 0);
        const prevRevenue = Math.round(prevMonthRevenueAgg[0]?.total || 0);
        const completionRate = totalOrdersInMonth > 0 ? Math.round((completedOrdersInMonth / totalOrdersInMonth) * 100) : 0;
        const avgEfficiency =
            productionEfficiencyAgg.length > 0
                ? Math.round(productionEfficiencyAgg.reduce((s: number, p: any) => s + (p.avgEfficiency || 0), 0) / productionEfficiencyAgg.length)
                : 0;

        const inventoryTurnover =
            totalInventoryCount > 0 ? Math.round((totalOrdersInMonth / totalInventoryCount) * 10) / 10 : 0;

        const revenueGrowth = prevRevenue > 0
            ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10
            : 0;

        return NextResponse.json({
            availableMonths,
            selectedMonth,
            previousMonthReport,
            materialUsage,
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
            orderFunnel,
            productionQuality,
            topClients,
        });
    } catch (error: any) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
