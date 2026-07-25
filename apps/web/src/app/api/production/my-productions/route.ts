import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * GET /api/production/my-productions
 * Returns productions visible to the current user.
 * - Admin/Owner: all productions under their data scope
 * - Staff: only productions where they are in assignedStaff
 * - Any other role: 403
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const role = user.role;

        // Explicit role guard — never fall through to a default that returns data
        if (role !== "Admin" && role !== "Owner" && role !== "Staff" && role !== "Manager") {
            return NextResponse.json(
                { success: false, message: "Access denied" },
                { status: 403 }
            );
        }

        const db = await getDb();
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1") || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        let query: Record<string, any>;

        if (role === "Admin" || role === "Owner") {
            // Admin/Owner sees all productions in their scope
            query = { userId: getDataOwnerId(user), status: { $ne: "closed" } };
        } else if (role === "Staff" || role === "Manager") {
            // Staff sees ONLY productions where they are explicitly assigned
            // Also scoped by userId for defense-in-depth (prevents cross-account leaks)
            const staffId = String(user._id);
            query = { userId: getDataOwnerId(user), assignedStaff: staffId, status: { $ne: "closed" } };
        } else {
            // Should never reach here due to guard above, but safety net
            return NextResponse.json(
                { success: false, message: "Access denied" },
                { status: 403 }
            );
        }

        const [productions, total] = await Promise.all([
            db
                .collection("productions")
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            db.collection("productions").countDocuments(query),
        ]);

        const formatted = productions.map((p: any) => ({
            id: String(p._id),
            orderId: p.orderId,
            orderProductName: p.orderProductName,
            orderQuantity: p.orderQuantity,
            clientName: p.clientName,
            deliveryDate: p.deliveryDate,
            batchNumber: p.batchNumber,
            machineName: p.machineName || "",
            operatorName: p.operatorName || "",
            expectedOutput: p.expectedOutput,
            startTime: p.startTime,
            shift: p.shift,
            targetCompletion: p.targetCompletion,
            status: p.status,
            producedQuantity: p.producedQuantity || 0,
            rejectQuantity: p.rejectQuantity || 0,
            progressPercent: p.progressPercent || 0,
            notes: p.notes || "",
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            completedAt: p.completedAt,
            createdBy: p.createdBy,
        }));

        return NextResponse.json({
            success: true,
            productions: formatted,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error: any) {
        console.error("[my-productions] Error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
