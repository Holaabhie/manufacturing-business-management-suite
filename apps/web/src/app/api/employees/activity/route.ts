import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId, type MongoUserDoc, type SessionDoc } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

interface ProgressAggResult {
    _id: string;
    updateCount: number;
    lastUpdate: Date;
    totalProduced: number;
}

interface MachineAggResult {
    _id: string;
    machineEventCount: number;
    machinesUsed: string[];
}

interface AttendanceRecord {
    userId: string;
    autoMarked?: boolean;
    firstActivityTime?: Date;
}

/**
 * GET /api/employees/activity
 * 
 * Feature 4: Operator Activity + Attendance Link
 * Returns employee activity data:
 *  - Login time
 *  - Number of production updates today
 *  - Machine usage summary
 *  - Auto-attendance status
 */
export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only Admin can see all employee activities
        if (user.role !== "Admin") {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        const adminId = getDataOwnerId(user);
        const db = await getDb();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Get all staff under this admin
        const staffUsers = await db
            .collection<MongoUserDoc>("users")
            .find(
                { adminId, role: "Staff", status: "active" },
                {
                    projection: {
                        passwordHash: 0,
                    },
                }
            )
            .toArray();

        // Get today's production progress updates per employee
        const todaysProgressUpdates = await db
            .collection("productionProgress")
            .aggregate<ProgressAggResult>([
                {
                    $match: {
                        timestamp: { $gte: todayStart },
                    },
                },
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
                { $unwind: "$production" },
                {
                    $group: {
                        _id: "$updatedBy",
                        updateCount: { $sum: 1 },
                        lastUpdate: { $max: "$timestamp" },
                        totalProduced: { $sum: "$producedQty" },
                    },
                },
            ])
            .toArray();

        // Get today's machine events per employee
        const todaysMachineEvents = await db
            .collection("machineEvents")
            .aggregate<MachineAggResult>([
                {
                    $match: {
                        adminId,
                        timestamp: { $gte: todayStart },
                    },
                },
                {
                    $group: {
                        _id: "$reportedBy",
                        machineEventCount: { $sum: 1 },
                        machinesUsed: { $addToSet: "$machineName" },
                    },
                },
            ])
            .toArray();

        // Get today's sessions for login time
        const todaysSessions = await db
            .collection<SessionDoc>("sessions")
            .find({
                createdAt: { $gte: todayStart },
            })
            .sort({ createdAt: 1 })
            .toArray();

        // Check auto-attendance records
        const todaysAttendance = await db
            .collection<AttendanceRecord>("attendance")
            .find({
                adminId,
                date: {
                    $gte: todayStart,
                },
            })
            .toArray();

        // Build employee activity map
        const progressMap = new Map<string, ProgressAggResult>(
            todaysProgressUpdates.map((p) => [p._id, p])
        );
        const machineMap = new Map<string, MachineAggResult>(
            todaysMachineEvents.map((m) => [m._id, m])
        );
        const sessionMap = new Map<string, SessionDoc>();
        for (const session of todaysSessions) {
            if (!sessionMap.has(session.userId)) {
                sessionMap.set(session.userId, session);
            }
        }
        const attendanceMap = new Map<string, AttendanceRecord>(
            todaysAttendance.map((a) => [a.userId, a])
        );

        const employeeActivities = staffUsers.map((staff) => {
            const staffId = staff._id.toString();
            const progress = progressMap.get(staffId);
            const machineActivity = machineMap.get(staffId);
            const firstSession = sessionMap.get(staffId);
            const attendance = attendanceMap.get(staffId);

            const updateCount = progress?.updateCount || 0;
            const isActive = updateCount > 0;

            return {
                id: staffId,
                employeeId: staff.employeeId || "—",
                fullName: staff.fullName || staff.full_name || "Unnamed",
                email: staff.email || "",
                department: staff.department || "General",
                status: isActive ? "active" : "idle",
                loginTime: firstSession?.createdAt || null,
                lastActiveAt: staff.lastActiveAt || null,
                todayStats: {
                    updateCount,
                    lastUpdate: progress?.lastUpdate || null,
                    totalProduced: progress?.totalProduced || 0,
                    machineEventCount: machineActivity?.machineEventCount || 0,
                    machinesUsed: machineActivity?.machinesUsed || [],
                },
                attendance: {
                    markedPresent: !!attendance,
                    autoMarked: attendance?.autoMarked || false,
                    firstActivityTime: attendance?.firstActivityTime || null,
                },
            };
        });

        // Summary
        const summary = {
            totalStaff: staffUsers.length,
            activeToday: employeeActivities.filter((e) => e.status === "active").length,
            idleToday: employeeActivities.filter((e) => e.status === "idle").length,
            totalUpdatesToday: employeeActivities.reduce(
                (sum: number, e) => sum + e.todayStats.updateCount,
                0
            ),
        };

        return NextResponse.json({
            employees: employeeActivities,
            summary,
            lastUpdated: new Date().toISOString(),
        });
    } catch (error: unknown) {
        console.error("Error fetching employee activity:", error);
        const message = error instanceof Error ? error.message : "Error fetching employee activity";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
