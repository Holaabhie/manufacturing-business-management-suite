import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * GET /api/machines/downtime
 * 
 * List downtime reports for admin's machines.
 * Query: ?status=open|acknowledged|resolved&machineId=xxx
 */
export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminId = getDataOwnerId(user);

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const machineId = searchParams.get("machineId");

        const db = await getDb();

        const filter: any = { adminId };
        if (status) filter.status = status;
        if (machineId) filter.machineId = machineId;

        const reports = await db
            .collection("machineDowntime")
            .find(filter)
            .sort({ reportedAt: -1 })
            .limit(100)
            .toArray();

        const formatted = reports.map((r: any) => ({
            id: r._id.toString(),
            machineId: r.machineId,
            machineName: r.machineName,
            reason: r.reason,
            description: r.description || "",
            photoUrl: r.photoUrl || null,
            status: r.status,
            reportedBy: r.reportedBy,
            reportedByName: r.reportedByName,
            reportedByRole: r.reportedByRole,
            reportedAt: r.reportedAt,
            acknowledgedAt: r.acknowledgedAt || null,
            acknowledgedBy: r.acknowledgedByName || null,
            resolvedAt: r.resolvedAt || null,
            resolvedBy: r.resolvedByName || null,
            resolution: r.resolution || null,
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        console.error("Error fetching downtime reports:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/machines/downtime
 * 
 * Staff reports a machine issue.
 * Body: { machineId, reason, description?, photoUrl? }
 * Reasons: Breakdown, No material, Electricity, Other
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

        // Validation
        if (!body.machineId) {
            return NextResponse.json(
                { error: "machineId is required" },
                { status: 400 }
            );
        }
        if (!body.reason) {
            return NextResponse.json(
                { error: "reason is required" },
                { status: 400 }
            );
        }

        const validReasons = [
            "Breakdown",
            "No material",
            "Electricity",
            "Tooling issue",
            "Quality issue",
            "Operator unavailable",
            "Other",
        ];
        if (!validReasons.includes(body.reason)) {
            return NextResponse.json(
                { error: `reason must be one of: ${validReasons.join(", ")}` },
                { status: 400 }
            );
        }

        // Get machine details
        const machine = await db
            .collection("machines")
            .findOne({ _id: new ObjectId(body.machineId), adminId });

        if (!machine) {
            return NextResponse.json(
                { error: "Machine not found" },
                { status: 404 }
            );
        }

        const now = new Date();
        const userName =
            user.fullName ||
            (user as any).full_name ||
            user.email?.split("@")[0] ||
            "System";

        const report = {
            machineId: body.machineId,
            machineName: machine.machineName,
            reason: body.reason,
            description: body.description?.trim() || "",
            photoUrl: body.photoUrl || null,
            status: "open",
            adminId,
            reportedBy: user._id.toString(),
            reportedByName: userName,
            reportedByRole: user.role || "Staff",
            reportedAt: now,
        };

        const result = await db.collection("machineDowntime").insertOne(report);

        // Also update machine status to maintenance
        await db.collection("machines").updateOne(
            { _id: new ObjectId(body.machineId) },
            { $set: { status: "maintenance", updatedAt: now } }
        );

        // Log machine event
        await db.collection("machineEvents").insertOne({
            machineId: body.machineId,
            machineName: machine.machineName,
            event: "issue_reported",
            previousStatus: machine.status || "active",
            newStatus: "maintenance",
            adminId,
            reportedBy: user._id.toString(),
            reportedByName: userName,
            reportedByRole: user.role || "Staff",
            reason: body.reason,
            timestamp: now,
        });

        return NextResponse.json({
            id: result.insertedId.toString(),
            ...report,
        });
    } catch (error: any) {
        console.error("Error creating downtime report:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/machines/downtime
 * 
 * Admin acknowledges or resolves a downtime report.
 * Body: { reportId, action: "acknowledge" | "resolve", resolution? }
 */
export async function PATCH(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const db = await getDb();

        if (!body.reportId || !body.action) {
            return NextResponse.json(
                { error: "reportId and action are required" },
                { status: 400 }
            );
        }

        const userName =
            user.fullName ||
            (user as any).full_name ||
            user.email?.split("@")[0] ||
            "System";

        const now = new Date();
        const updates: any = {};

        if (body.action === "acknowledge") {
            updates.status = "acknowledged";
            updates.acknowledgedAt = now;
            updates.acknowledgedBy = user._id.toString();
            updates.acknowledgedByName = userName;
        } else if (body.action === "resolve") {
            updates.status = "resolved";
            updates.resolvedAt = now;
            updates.resolvedBy = user._id.toString();
            updates.resolvedByName = userName;
            updates.resolution = body.resolution || "Resolved";

            // Get report to update machine status
            const report = await db
                .collection("machineDowntime")
                .findOne({ _id: new ObjectId(body.reportId) });

            if (report) {
                // Set machine back to idle
                await db.collection("machines").updateOne(
                    { _id: new ObjectId(report.machineId) },
                    { $set: { status: "idle", updatedAt: now } }
                );

                // Log machine event
                const adminId = getDataOwnerId(user);

                await db.collection("machineEvents").insertOne({
                    machineId: report.machineId,
                    machineName: report.machineName,
                    event: "issue_resolved",
                    previousStatus: "maintenance",
                    newStatus: "idle",
                    adminId,
                    reportedBy: user._id.toString(),
                    reportedByName: userName,
                    reportedByRole: user.role || "Staff",
                    timestamp: now,
                });
            }
        } else {
            return NextResponse.json(
                { error: 'action must be "acknowledge" or "resolve"' },
                { status: 400 }
            );
        }

        await db.collection("machineDowntime").updateOne(
            { _id: new ObjectId(body.reportId) },
            { $set: updates }
        );

        return NextResponse.json({ success: true, ...updates });
    } catch (error: any) {
        console.error("Error updating downtime report:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
