import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * GET /api/machines/utilisation
 * 
 * Returns machine utilisation data:
 * - Per-machine active hours today
 * - Current status (Running / Idle / Maintenance)
 * - Current operator
 * - Active production batch
 */
export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminId = getDataOwnerId(user);

        const db = await getDb();

        // Fetch all machines for admin
        const machines = await db
            .collection("machines")
            .find({ adminId })
            .toArray();

        // Get today's start
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Get today's machine events for duration calculation
        const todayEvents = await db
            .collection("machineEvents")
            .find({
                adminId,
                timestamp: { $gte: todayStart },
            })
            .sort({ timestamp: 1 })
            .toArray();

        // Get active productions (to show which machine is running what)
        const activeProductions = await db
            .collection("productions")
            .find({
                userId: adminId,
                status: { $in: ["pending", "in_progress", "running"] },
            })
            .toArray();

        // Get active downtime reports
        const activeDowntime = await db
            .collection("machineDowntime")
            .find({
                adminId,
                status: { $in: ["open", "acknowledged"] },
            })
            .toArray();

        // Build machine utilisation map
        const utilisationData = machines.map((machine: any) => {
            const machineId = machine._id.toString();

            // Calculate running time today from events
            const machineEvents = todayEvents.filter(
                (e: any) => e.machineId === machineId
            );

            let activeDurationMinutes = 0;
            let lastStartTime: Date | null = null;

            for (const event of machineEvents) {
                if (event.event === "started" || event.newStatus === "running") {
                    lastStartTime = new Date(event.timestamp);
                } else if (
                    (event.event === "stopped" ||
                        event.newStatus === "idle" ||
                        event.newStatus === "maintenance") &&
                    lastStartTime
                ) {
                    const diff =
                        (new Date(event.timestamp).getTime() - lastStartTime.getTime()) /
                        (1000 * 60);
                    activeDurationMinutes += diff;
                    lastStartTime = null;
                }
            }

            // If machine is still running (started but no stop event), count time until now
            if (lastStartTime) {
                const diff =
                    (Date.now() - lastStartTime.getTime()) / (1000 * 60);
                activeDurationMinutes += diff;
            }

            // Find active production for this machine
            const activeProduction = activeProductions.find(
                (p: any) => p.machineId === machineId
            );

            // Find active downtime
            const activeIssue = activeDowntime.find(
                (d: any) => d.machineId === machineId
            );

            // Determine current status
            let currentStatus = machine.status || "idle";
            if (activeIssue) {
                currentStatus = "maintenance";
            } else if (activeProduction) {
                currentStatus = "running";
            }

            return {
                id: machineId,
                machineName: machine.machineName,
                machineType: machine.machineType || "",
                capacity: machine.capacity || "",
                currentStatus,
                activeDurationMinutes: Math.round(activeDurationMinutes),
                activeDurationFormatted: formatDuration(activeDurationMinutes),
                activeProduction: activeProduction
                    ? {
                        productionId: activeProduction._id.toString(),
                        batchNumber: activeProduction.batchNumber,
                        orderName: activeProduction.orderProductName,
                        progressPercent: activeProduction.progressPercent || 0,
                        operatorName: activeProduction.operatorName || "Unassigned",
                    }
                    : null,
                activeIssue: activeIssue
                    ? {
                        issueId: activeIssue._id.toString(),
                        reason: activeIssue.reason,
                        reportedAt: activeIssue.reportedAt,
                        reportedBy: activeIssue.reportedByName,
                    }
                    : null,
                lastEvent:
                    machineEvents.length > 0
                        ? machineEvents[machineEvents.length - 1]
                        : null,
            };
        });

        // Summary stats
        const summary = {
            total: machines.length,
            running: utilisationData.filter((m: any) => m.currentStatus === "running").length,
            idle: utilisationData.filter((m: any) => m.currentStatus === "idle" || m.currentStatus === "active").length,
            maintenance: utilisationData.filter((m: any) => m.currentStatus === "maintenance").length,
        };

        return NextResponse.json({
            machines: utilisationData,
            summary,
            lastUpdated: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("Error fetching machine utilisation:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
}

/**
 * POST /api/machines/utilisation
 * 
 * Log a machine event (started/stopped/maintenance)
 * This powers the real-time tracking.
 */
export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const db = await getDb();

        const adminId = getDataOwnerId(user);

        // Validate
        if (!body.machineId || !body.event) {
            return NextResponse.json(
                { error: "machineId and event are required" },
                { status: 400 }
            );
        }

        const validEvents = ["started", "stopped", "maintenance", "idle"];
        if (!validEvents.includes(body.event)) {
            return NextResponse.json(
                { error: `event must be one of: ${validEvents.join(", ")}` },
                { status: 400 }
            );
        }

        // Get machine
        const machine = await db
            .collection("machines")
            .findOne({ _id: new ObjectId(body.machineId), adminId });

        if (!machine) {
            return NextResponse.json(
                { error: "Machine not found" },
                { status: 404 }
            );
        }

        const previousStatus = machine.status || "idle";
        const newStatus =
            body.event === "started"
                ? "running"
                : body.event === "maintenance"
                    ? "maintenance"
                    : "idle";

        const now = new Date();
        const userName =
            user.fullName ||
            (user as any).full_name ||
            user.email?.split("@")[0] ||
            "System";

        // Log the event
        const event = {
            machineId: body.machineId,
            machineName: machine.machineName,
            event: body.event,
            previousStatus,
            newStatus,
            adminId,
            reportedBy: user._id.toString(),
            reportedByName: userName,
            reportedByRole: user.role || "Staff",
            timestamp: now,
        };

        await db.collection("machineEvents").insertOne(event);

        // Update machine status
        await db.collection("machines").updateOne(
            { _id: new ObjectId(body.machineId) },
            {
                $set: {
                    status: newStatus,
                    updatedAt: now,
                },
            }
        );

        return NextResponse.json({
            success: true,
            previousStatus,
            newStatus,
            event: body.event,
        });
    } catch (error: any) {
        console.error("Error logging machine event:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
