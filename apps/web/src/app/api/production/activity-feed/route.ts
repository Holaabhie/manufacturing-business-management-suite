import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

/**
 * GET /api/production/activity-feed
 * 
 * Returns a WhatsApp-style real-time activity feed for the admin dashboard.
 * Aggregates recent production activities, machine status changes, and employee updates.
 * 
 * Query params:
 *   - limit: number (default 30, max 100)
 *   - since: ISO date string (only return activities after this time)
 */
export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(Number(searchParams.get("limit") || 30), 100);
        const since = searchParams.get("since");

        const adminId = getDataOwnerId(user);

        const db = await getDb();

        // Build time filter
        const timeFilter: Record<string, unknown> = {};
        if (since) {
            timeFilter.timestamp = { $gt: new Date(since) };
        }

        // Fetch recent production progress updates
        const progressUpdates = await db
            .collection("productionProgress")
            .aggregate([
                {
                    $lookup: {
                        from: "productions",
                        let: { prodId: { $toObjectId: "$productionId" } },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$prodId"] } } },
                            { $project: { userId: 1, orderProductName: 1, batchNumber: 1, machineName: 1 } }
                        ],
                        as: "production"
                    }
                },
                { $unwind: "$production" },
                { $match: { "production.userId": adminId, ...timeFilter } },
                { $sort: { timestamp: -1 } },
                { $limit: limit },
                {
                    $project: {
                        type: { $literal: "progress_update" },
                        timestamp: 1,
                        employeeName: "$updatedByName",
                        employeeId: "$updatedBy",
                        role: "$updatedByRole",
                        details: {
                            producedQty: "$producedQty",
                            rejectedQty: "$rejectedQty",
                            notes: "$notes",
                            orderName: "$production.orderProductName",
                            batchNumber: "$production.batchNumber",
                            machineName: "$production.machineName",
                        },
                    }
                }
            ])
            .toArray();

        // Fetch recent machine status changes
        const machineEvents = await db
            .collection("machineEvents")
            .find({ adminId, ...(since ? { timestamp: { $gt: new Date(since) } } : {}) })
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();

        const machineActivities = machineEvents.map((e: Record<string, unknown>) => ({
            type: "machine_event",
            timestamp: e.timestamp,
            employeeName: e.reportedByName || "System",
            employeeId: e.reportedBy,
            role: e.reportedByRole || "Staff",
            details: {
                machineName: e.machineName,
                machineId: e.machineId,
                event: e.event, // started, stopped, maintenance, issue
                reason: e.reason || "",
                previousStatus: e.previousStatus,
                newStatus: e.newStatus,
            },
        }));

        // Fetch recent production creations (from activity logs embedded in productions)
        const recentProductions = await db
            .collection("productions")
            .find({
                userId: adminId,
                ...(since ? { createdAt: { $gt: new Date(since) } } : {}),
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .project({
                batchNumber: 1,
                orderProductName: 1,
                machineName: 1,
                operatorName: 1,
                status: 1,
                createdBy: 1,
                createdAt: 1,
                progressPercent: 1,
            })
            .toArray();

        const productionCreations = recentProductions.map((p: Record<string, unknown>) => ({
            type: "production_created",
            timestamp: p.createdAt,
            employeeName: p.createdBy || "System",
            employeeId: null,
            role: "Staff",
            details: {
                batchNumber: p.batchNumber,
                orderName: p.orderProductName,
                machineName: p.machineName,
                operatorName: p.operatorName,
                status: p.status,
                progressPercent: p.progressPercent || 0,
            },
        }));

        // Fetch machine downtime issues
        const downtimeIssues = await db
            .collection("machineDowntime")
            .find({
                adminId,
                ...(since ? { reportedAt: { $gt: new Date(since) } } : {}),
            })
            .sort({ reportedAt: -1 })
            .limit(limit)
            .toArray();

        const downtimeActivities = downtimeIssues.map((d: Record<string, unknown>) => ({
            type: "downtime_report",
            timestamp: d.reportedAt,
            employeeName: d.reportedByName || "Unknown",
            employeeId: d.reportedBy,
            role: d.reportedByRole || "Staff",
            details: {
                machineName: d.machineName,
                machineId: d.machineId,
                reason: d.reason,
                description: d.description || "",
                status: d.status, // open, acknowledged, resolved
            },
        }));

        // Merge and sort all activities by timestamp
        const allActivities = [
            ...progressUpdates,
            ...machineActivities,
            ...productionCreations,
            ...downtimeActivities,
        ]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);

        // Generate human-readable messages
        const feed = allActivities.map((act) => {
            const activity = act as {
                _id?: unknown;
                type: string;
                timestamp: string | number | Date;
                employeeName?: string | null;
                employeeId?: string | null;
                role?: string | null;
                details: Record<string, unknown>;
            };
            const details = activity.details || {};
            let message = "";
            let icon = "📋";
            let severity: "info" | "warning" | "success" | "error" = "info";

            switch (activity.type) {
                case "progress_update":
                    message = `${activity.employeeName} updated progress → Produced: ${details.producedQty} units on ${details.orderName}`;
                    icon = "📊";
                    severity = "info";
                    break;
                case "machine_event":
                    if (details.event === "started") {
                        message = `${details.machineName} started by ${activity.employeeName}`;
                        icon = "🟢";
                        severity = "success";
                    } else if (details.event === "stopped") {
                        message = `${details.machineName} stopped`;
                        icon = "🔴";
                        severity = "warning";
                    } else if (details.event === "maintenance") {
                        message = `${details.machineName} → Maintenance mode`;
                        icon = "🔧";
                        severity = "warning";
                    } else {
                        message = `${details.machineName} → ${details.event}`;
                        icon = "⚙️";
                    }
                    break;
                case "production_created":
                    message = `${activity.employeeName} started ${details.orderName} (${details.batchNumber})`;
                    icon = "🏭";
                    severity = "success";
                    break;
                case "downtime_report":
                    message = `⚠️ ${details.machineName} issue: ${details.reason}`;
                    icon = "🚨";
                    severity = "error";
                    break;
            }

            return {
                id: String(activity._id || `${activity.type}-${new Date(activity.timestamp).getTime()}`),
                type: activity.type,
                message,
                icon,
                severity,
                timestamp: activity.timestamp,
                employeeName: activity.employeeName,
                employeeId: activity.employeeId,
                role: activity.role,
                details: activity.details,
            };
        });

        return NextResponse.json({
            feed,
            total: feed.length,
            lastUpdated: new Date().toISOString(),
        });
    } catch (error: unknown) {
        console.error("Error fetching activity feed:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
