import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { triggerNotification } from "@/lib/notifications/dispatcher";

/**
 * PATCH /api/inventory/[id]/stock
 * Atomic stock operations (deduct / add) — keeps inventory logic centralized.
 *
 * Body: { action: "deduct" | "add", quantity: number }
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
        }

        const body = await request.json();
        const { action, quantity } = body;

        if (!action || !["deduct", "add"].includes(action)) {
            return NextResponse.json(
                { error: "Invalid action. Must be 'deduct' or 'add'." },
                { status: 400 }
            );
        }

        if (typeof quantity !== "number" || quantity <= 0) {
            return NextResponse.json(
                { error: "Quantity must be a positive number." },
                { status: 400 }
            );
        }

        const db = await getDb();
        const item = await db.collection("inventory").findOne({
            _id: new ObjectId(id),
            userId: getDataOwnerId(user),
        });

        if (!item) {
            return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
        }

        const currentQty = Number(item.quantity) || 0;
        let newQty: number;

        if (action === "deduct") {
            newQty = currentQty - quantity;
            if (newQty < 0) {
                return NextResponse.json(
                    {
                        error: `Insufficient stock for ${item.name}. Available: ${currentQty} ${item.unit}, Requested: ${quantity} ${item.unit}`,
                        availableStock: currentQty,
                        requestedQuantity: quantity,
                        itemName: item.name,
                    },
                    { status: 400 }
                );
            }
        } else {
            // action === "add"
            newQty = currentQty + quantity;
        }

        await db.collection("inventory").updateOne(
            { _id: new ObjectId(id) },
            { $set: { quantity: newQty, updatedAt: new Date() } }
        );

        // Trigger low stock alert if quantity falls below min_stock_level
        const minStock = Number(item.min_stock_level) || 10;
        if (newQty <= minStock) {
            triggerNotification({
                eventType: "low_stock_alert",
                payload: {
                    itemName: item.name || "Unknown Item",
                    currentStock: newQty,
                    unit: item.unit || "kg",
                },
                triggeredBy: getDataOwnerId(user),
            }).catch(() => {}); // fire-and-forget
        }

        return NextResponse.json({
            success: true,
            itemId: id,
            itemName: item.name,
            previousStock: currentQty,
            newStock: newQty,
            unit: item.unit,
            action,
            quantity,
        });
    } catch (error: any) {
        console.error("Error updating inventory stock:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
