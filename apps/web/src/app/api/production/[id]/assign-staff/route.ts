import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * PATCH /api/production/[id]/assign-staff
 * Admin-only: Assign staff members to a production batch.
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        // Only Admin can assign staff
        if (user.role !== "Admin" && user.role !== "Owner") {
            return NextResponse.json(
                { success: false, message: "Only admins can assign staff" },
                { status: 403 }
            );
        }

        const { id: productionId } = await params;

        // Param validation
        if (!ObjectId.isValid(productionId)) {
            return NextResponse.json(
                { success: false, message: "Invalid production id" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { staffIds } = body;

        // --- VALIDATION 1: must be non-empty array ---
        if (!Array.isArray(staffIds) || staffIds.length === 0) {
            return NextResponse.json(
                { success: false, message: "staffIds must be a non-empty array" },
                { status: 400 }
            );
        }

        // --- VALIDATION 2: deduplicate ---
        const uniqueIds = [...new Set(staffIds as string[])];

        // --- VALIDATION 3: validate each ID format ---
        const invalidIds = uniqueIds.filter((id) => typeof id !== "string" || !id.trim());
        if (invalidIds.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid staff IDs provided",
                    invalidIds,
                },
                { status: 400 }
            );
        }

        const db = await getDb();

        // --- VALIDATION 4: verify all IDs are real staff users ---
        const staffUsers = await db
            .collection("users")
            .find({
                _id: { $in: uniqueIds },
                role: "Staff",
            })
            .toArray();

        if (staffUsers.length !== uniqueIds.length) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Some IDs are not valid staff users. Only staff role can be assigned.",
                },
                { status: 400 }
            );
        }

        // --- VALIDATION 5: fetch production and check status ---
        const production = await db
            .collection("productions")
            .findOne({
                _id: new ObjectId(productionId),
                userId: getDataOwnerId(user),
            });

        if (!production) {
            return NextResponse.json(
                { success: false, message: "Production not found" },
                { status: 404 }
            );
        }

        if (
            ["completed", "cancelled", "closed"].includes(
                production.status as string
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Cannot assign staff to a ${production.status} production`,
                },
                { status: 400 }
            );
        }

        // --- SAFE UPDATE: atomic set + audit log append ---
        const ownerId = getDataOwnerId(user);
        await db.collection("productions").updateOne(
            { _id: new ObjectId(productionId), userId: ownerId },
            {
                $set: {
                    assignedStaff: uniqueIds,
                    updatedAt: new Date(),
                },
                $push: {
                    assignmentLogs: {
                        assignedBy: String(user._id),
                        assignedStaff: uniqueIds,
                        timestamp: new Date(),
                    },
                } as any,
            }
        );

        // Fetch updated doc with staff details
        const updated = await db
            .collection("productions")
            .findOne({ _id: new ObjectId(productionId), userId: ownerId });

        // Resolve staff names
        const staffDetails = staffUsers.map((s) => ({
            id: String(s._id),
            name: s.fullName || s.full_name || s.email || "Unknown",
            email: s.email || "",
        }));

        return NextResponse.json({
            success: true,
            production: {
                id: String(updated!._id),
                assignedStaff: staffDetails,
                assignmentLogs: updated!.assignmentLogs || [],
            },
        });
    } catch (error: any) {
        console.error("[assign-staff] Error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
