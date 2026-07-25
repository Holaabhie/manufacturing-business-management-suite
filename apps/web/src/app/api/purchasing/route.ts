/**
 * Purchasing API — /api/purchasing
 * ─────────────────────────────────────────────────────────
 * GET  — List all purchase orders
 * POST — Create a new purchase order
 *        Optionally upserts line items into inventory when
 *        addToInventory is true (request-only flag).
 */

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getPurchasingService } from "@/modules/purchasing";
import { getDb } from "@/lib/mongodb";

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const service = getPurchasingService();
        const orders = await service.findAllOrders(getDataOwnerId(user));

        return NextResponse.json({ success: true, data: orders });
    } catch (error: any) {
        console.error("Error fetching purchase orders:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        // Extract request-only flag before passing to service
        // (Zod schema strips unknown keys, but we read it here explicitly)
        const addToInventory = body.addToInventory === true;

        const service = getPurchasingService();
        const order = await service.createOrder(getDataOwnerId(user), body);

        // ── Inventory upsert (guarded, non-blocking) ────────────────
        // Runs only on initial PO creation (POST). When a PO created with
        // this flag is later marked "Received", the service skips
        // addStockFromPurchase() to prevent double-counting.
        let inventorySynced = false;
        if (addToInventory && Array.isArray(body.items) && body.items.length > 0) {
            try {
                const userId = getDataOwnerId(user);
                const db = await getDb();

                const ops = body.items
                    .filter((i: any) => {
                        const hasId = i.inventoryItemId && typeof i.inventoryItemId === "string";
                        const hasName = i.materialName && typeof i.materialName === "string" && String(i.materialName).trim().length > 0;
                        const qty = Number(i.quantity);
                        return (hasId || hasName) && qty > 0;
                    })
                    .map((i: any) => {
                        // Prefer ObjectId match; fall back to trimmed name + userId
                        const trimmedName = String(i.materialName || "").trim();
                        const validObjectId = i.inventoryItemId && ObjectId.isValid(i.inventoryItemId);

                        const filter = validObjectId
                            ? { _id: new ObjectId(i.inventoryItemId), userId }
                            : { name: trimmedName, userId };

                        return {
                            updateOne: {
                                filter,
                                update: {
                                    $inc: { quantity: Number(i.quantity) || 0 },
                                    $set: {
                                        unit: i.unit || "kg",
                                        purchase_cost_per_unit: Number(i.unitPrice) || 0,
                                        purchase_price: Number(i.unitPrice) || 0,
                                        updatedAt: new Date(),
                                    },
                                    $setOnInsert: {
                                        name: trimmedName,
                                        userId,
                                        min_stock_level: 0,
                                        supplier_whatsapp: "",
                                        hsn_code: "",
                                        tax_rate: 18,
                                        track_inventory: true,
                                        item_type: "Goods",
                                        item_name: trimmedName,
                                        item_code: `ITM-${Date.now()}`,
                                        created_by: userId,
                                        primary_unit: i.unit || "kg",
                                        source: "purchase_order",
                                        createdAt: new Date(),
                                    },
                                },
                                upsert: true,
                            },
                        };
                    });

                if (ops.length > 0) {
                    await db.collection("inventory").bulkWrite(ops);
                    inventorySynced = true;

                    // Persist the flag on the PO document so the "Received"
                    // flow knows to skip addStockFromPurchase()
                    try {
                        await db.collection("purchase_orders").updateOne(
                            { _id: new ObjectId(order.id) },
                            { $set: { inventorySyncedOnCreate: true } },
                        );
                    } catch (flagErr) {
                        console.error("Failed to set inventorySyncedOnCreate flag:", flagErr);
                        // Non-fatal: stock was added, flag just didn't persist
                    }
                }
            } catch (e) {
                console.error("Inventory sync failed for PO:", e);
                // PO already saved — do not throw
                inventorySynced = false;
            }
        }

        return NextResponse.json(
            { success: true, data: order, inventorySynced },
            { status: 201 },
        );
    } catch (error: any) {
        console.error("Error creating purchase order:", error);
        const status = error.statusCode || 500;
        return NextResponse.json(
            { error: error.message, details: error.details },
            { status },
        );
    }
}
