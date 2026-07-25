/**
 * Order Status API — PATCH /api/v1/orders/[id]/status
 * ─────────────────────────────────────────────────────
 * Updates the order status and records timestamps.
 * When status changes to "processing", deducts materials
 * from inventory and records usage history.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getOrderService } from "@/modules/orders";
import { getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type RouteContext = { params: Promise<{ id: string }> };

interface DeductionWarning {
    material: string;
    message: string;
}

export const PATCH = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const body = await request.json();
            const service = getOrderService();
            const ownerId = getDataOwnerId(user);

            // 1. Update the order status
            const item = await service.updateStatus(id, ownerId, body.status);

            // 2. If moving to "processing", deduct materials from inventory
            const warnings: DeductionWarning[] = [];

            if (body.status === "processing") {
                const db = await getDb();
                const orderDoc = await db.collection("orders").findOne({
                    _id: new ObjectId(id),
                    userId: ownerId,
                });

                // Look up client name for usage history context
                let clientName = "";
                if (orderDoc?.client_id) {
                    try {
                        const clientDoc = await db.collection("clients").findOne({
                            _id: new ObjectId(String(orderDoc.client_id)),
                        });
                        clientName = String(clientDoc?.name || "");
                    } catch {
                        // Client lookup failed — continue without name
                    }
                }

                const materials = orderDoc?.materials;
                if (Array.isArray(materials) && materials.length > 0) {
                    for (const mat of materials) {
                        const inventoryItemId = mat.inventoryItemId;
                        const quantityRequired = Number(mat.quantityRequired || 0);

                        if (!inventoryItemId || quantityRequired <= 0) continue;

                        try {
                            const invItem = await db.collection("inventory").findOne({
                                _id: new ObjectId(inventoryItemId),
                                userId: ownerId,
                            });

                            if (!invItem) {
                                warnings.push({
                                    material: mat.itemName || inventoryItemId,
                                    message: `Material "${mat.itemName}" not found in inventory`,
                                });
                                continue;
                            }

                            const currentStock = Number(invItem.quantity || 0);

                            if (currentStock < quantityRequired) {
                                warnings.push({
                                    material: mat.itemName || invItem.name,
                                    message: `Material ${mat.itemName} had insufficient stock (${currentStock} available, ${quantityRequired} required)`,
                                });
                            }

                            // Deduct whatever is available (can go to 0)
                            const deductAmount = Math.min(quantityRequired, currentStock);

                            const orderRef = String(
                                orderDoc?.order_number ||
                                orderDoc?.orderNumber ||
                                `ORD-${id.slice(-6).toUpperCase()}`
                            );

                            await db.collection("inventory").updateOne(
                                { _id: new ObjectId(inventoryItemId), userId: ownerId },
                                {
                                    $inc: { quantity: -deductAmount },
                                    $push: {
                                        usageHistory: {
                                            orderId: id,
                                            orderRef,
                                            productName: orderDoc?.product_name || orderDoc?.productName || "Unknown Product",
                                            clientName,
                                            quantityUsed: quantityRequired,
                                            unit: String(mat.unit || invItem.unit || ""),
                                            status: "processing",
                                            usedAt: new Date(),
                                        },
                                    } as Record<string, unknown>,
                                    $set: { updatedAt: new Date() },
                                },
                            );
                        } catch (err) {
                            warnings.push({
                                material: mat.itemName || inventoryItemId,
                                message: `Failed to deduct material "${mat.itemName}"`,
                            });
                        }
                    }
                }
            }

            // 3. Return updated order + any warnings
            if (warnings.length > 0) {
                return envelope.ok({
                    ...item,
                    warnings: warnings.map((w) => w.message),
                });
            }

            return envelope.ok(item);
        }),
    ),
    { tier: "write" },
);
