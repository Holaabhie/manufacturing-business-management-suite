import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

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

/**
 * GET /api/dashboard/analytics/materials?month=YYYY-MM
 * 
 * Aggregated material consumption breakdown for the specified month.
 * Scoped strictly to the calendar month date boundaries.
 * Resolves material names accurately via order_inventory_items and inventory lookups.
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
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const month = searchParams.get("month") || currentMonthStr;

        const [selYearStr, selMonthStr] = month.split("-");
        const selYear = parseInt(selYearStr, 10);
        const selMonth = parseInt(selMonthStr, 10);

        if (isNaN(selYear) || isNaN(selMonth) || selMonth < 1 || selMonth > 12) {
            return NextResponse.json({ error: "Invalid month format. Expected YYYY-MM." }, { status: 400 });
        }

        const rangeStart = new Date(Date.UTC(selYear, selMonth - 1, 1, 0, 0, 0, 0));
        const rangeEnd = new Date(Date.UTC(selYear, selMonth, 0, 23, 59, 59, 999));

        let materialsAgg = await db.collection("order_inventory_items").aggregate([
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
        ]).toArray();

        // Fallback: check orders.materials if order_inventory_items has no records for this period
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

        const totalQuantity = materialsAgg.reduce((sum, m) => sum + (m.quantity || 0), 0);
        const materialUsage = materialsAgg.map((m, idx) => ({
            materialId: m.materialId ? String(m.materialId) : m._id,
            name: m._id || "Other Material",
            quantity: Math.round((m.quantity || 0) * 10) / 10,
            unit: m.unit || "units",
            percentage: totalQuantity > 0 ? Math.round(((m.quantity || 0) / totalQuantity) * 1000) / 10 : 0,
            color: MATERIAL_COLORS[idx % MATERIAL_COLORS.length],
        }));

        return NextResponse.json({
            success: true,
            month,
            totalQuantity: Math.round(totalQuantity * 10) / 10,
            materialUsage,
        });
    } catch (error: unknown) {
        console.error("Error fetching material analytics:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
