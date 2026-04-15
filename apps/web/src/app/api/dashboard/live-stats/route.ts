import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

/**
 * GET /api/dashboard/live-stats
 * 
 * Feature 9: Smart Admin Dashboard Fast-Loading Stats
 * Returns aggregated live cards data in a single efficient query:
 *  - Running Orders count
 *  - Active Machines count
 *  - Idle Machines count
 *  - Maintenance Machines count
 *  - Employee Activity summary
 *  - Delay Prediction summary
 *  - Production Completion Average
 */
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminId = getDataOwnerId(user);

        const db = await getDb();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // All parallel — no blocking
        const [
            runningOrdersCount,
            totalOrdersCount,
            completedOrdersCount,
            machineStats,
            activeEmployees,
            totalStaff,
            productionAvg,
            openDowntime,
            activeProductionsCount,
        ] = await Promise.all([
            // Running/active orders
            db.collection("orders").countDocuments({
                userId: adminId,
                status: { $in: ["pending", "processing", "in_progress"] },
            }),

            // Total orders
            db.collection("orders").countDocuments({ userId: adminId }),

            // Completed orders
            db.collection("orders").countDocuments({
                userId: adminId,
                status: "completed",
            }),

            // Machine status counts
            db
                .collection("machines")
                .aggregate([
                    { $match: { adminId } },
                    {
                        $group: {
                            _id: "$status",
                            count: { $sum: 1 },
                        },
                    },
                ])
                .toArray(),

            // Employees with updates today
            db
                .collection("productionProgress")
                .aggregate([
                    { $match: { timestamp: { $gte: todayStart } } },
                    {
                        $lookup: {
                            from: "productions",
                            let: { prodId: { $toObjectId: "$productionId" } },
                            pipeline: [
                                { $match: { $expr: { $eq: ["$_id", "$$prodId"] } } },
                                { $match: { userId: adminId } },
                                { $project: { _id: 1 } },
                            ],
                            as: "production",
                        },
                    },
                    { $match: { production: { $ne: [] } } },
                    { $group: { _id: "$updatedBy" } },
                    { $count: "total" },
                ])
                .toArray(),

            // Total staff
            db.collection("users").countDocuments({
                adminId,
                role: "Staff",
                status: "active",
            }),

            // Average production completion across active productions
            db
                .collection("productions")
                .aggregate([
                    {
                        $match: {
                            userId: adminId,
                            status: { $ne: "completed" },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            avgProgress: { $avg: "$progressPercent" },
                            totalProduced: { $sum: "$producedQuantity" },
                            totalExpected: { $sum: "$expectedOutput" },
                        },
                    },
                ])
                .toArray(),

            // Open downtime issues
            db.collection("machineDowntime").countDocuments({
                adminId,
                status: { $in: ["open", "acknowledged"] },
            }),

            // Active productions
            db.collection("productions").countDocuments({
                userId: adminId,
                status: { $ne: "completed" },
            }),
        ]);

        // Parse machine stats
        const machineStatusMap: Record<string, number> = {};
        let totalMachines = 0;
        for (const stat of machineStats) {
            machineStatusMap[stat._id || "idle"] = stat.count;
            totalMachines += stat.count;
        }

        const completionRate =
            totalOrdersCount > 0
                ? Math.round((completedOrdersCount / totalOrdersCount) * 100)
                : 0;

        return NextResponse.json({
            // Live cards
            runningOrders: runningOrdersCount,
            totalOrders: totalOrdersCount,
            completedOrders: completedOrdersCount,
            completionRate,

            // Machine stats
            machines: {
                total: totalMachines,
                running: machineStatusMap["running"] || 0,
                idle: (machineStatusMap["idle"] || 0) + (machineStatusMap["active"] || 0),
                maintenance: machineStatusMap["maintenance"] || 0,
            },

            // Employee stats
            employees: {
                total: totalStaff,
                activeToday: activeEmployees[0]?.total || 0,
                idleToday: totalStaff - (activeEmployees[0]?.total || 0),
            },

            // Production stats
            production: {
                activeCount: activeProductionsCount,
                avgProgress: Math.round(productionAvg[0]?.avgProgress || 0),
                totalProduced: productionAvg[0]?.totalProduced || 0,
                totalExpected: productionAvg[0]?.totalExpected || 0,
            },

            // Alerts
            alerts: {
                openDowntime,
            },

            lastUpdated: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("Error fetching live stats:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
