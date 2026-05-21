/**
 * Backfill Usage History — GET /api/v1/inventory/backfill-usage
 * ─────────────────────────────────────────────────────────────
 * One-time idempotent backfill for inventory usageHistory.
 * Finds all orders with status "processing" or "completed" that
 * have a materials[] array, then pushes usageHistory entries to
 * the corresponding inventory items (if not already present).
 *
 * Safe to run multiple times — checks for existing entries.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getDataOwnerId } from "@/lib/auth-session";

interface BackfillResult {
    ordersScanned: number;
    entriesBackfilled: number;
    skippedDuplicate: number;
    errors: string[];
}

interface OrderMaterial {
    inventoryItemId: string;
    itemName?: string;
    quantityRequired?: number;
    unit?: string;
}

interface UsageHistoryEntry {
    orderId: string;
    orderRef?: string;
    productName?: string;
    clientName?: string;
    quantityUsed?: number;
    unit?: string;
    status?: string;
    usedAt?: Date;
}

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_request: NextRequest, user: AuthenticatedUser) => {
            const db = await getDb();
            const ownerId = getDataOwnerId(user);

            // Only allow Admin/Owner roles
            if (user.role !== "Admin" && user.role !== "Owner") {
                return envelope.fail("Only Admin or Owner can run backfill", 403);
            }

            const result: BackfillResult = {
                ordersScanned: 0,
                entriesBackfilled: 0,
                skippedDuplicate: 0,
                errors: [],
            };

            // 1. Find all orders with materials[] that are in processing/completed status
            const orders = await db
                .collection("orders")
                .find({
                    userId: ownerId,
                    status: { $in: ["processing", "completed"] },
                    materials: { $exists: true, $ne: [] },
                })
                .toArray();

            result.ordersScanned = orders.length;

            // 2. Build a client lookup cache to avoid N+1 queries
            const clientIds = new Set<string>();
            for (const order of orders) {
                if (order.client_id) {
                    clientIds.add(String(order.client_id));
                }
            }

            const clientMap = new Map<string, string>();
            if (clientIds.size > 0) {
                const validObjectIds: ObjectId[] = [];
                for (const cid of clientIds) {
                    try {
                        validObjectIds.push(new ObjectId(cid));
                    } catch {
                        // Invalid ObjectId — skip
                    }
                }
                if (validObjectIds.length > 0) {
                    const clients = await db
                        .collection("clients")
                        .find({ _id: { $in: validObjectIds } })
                        .project({ _id: 1, name: 1 })
                        .toArray();
                    for (const c of clients) {
                        clientMap.set(c._id.toString(), String(c.name || ""));
                    }
                }
            }

            // 3. Process each order's materials
            for (const order of orders) {
                const orderId = order._id.toString();
                const materials = order.materials as OrderMaterial[];

                if (!Array.isArray(materials)) continue;

                const orderRef = String(
                    order.order_number ||
                    order.orderNumber ||
                    `ORD-${orderId.slice(-6).toUpperCase()}`
                );
                const productName = String(
                    order.product_name || order.productName || "Unknown Product"
                );
                const clientName = order.client_id
                    ? clientMap.get(String(order.client_id)) || ""
                    : "";

                for (const mat of materials) {
                    const inventoryItemId = mat.inventoryItemId;
                    const quantityRequired = Number(mat.quantityRequired || 0);

                    if (!inventoryItemId || quantityRequired <= 0) continue;

                    try {
                        // Check if this entry already exists (idempotency check)
                        const invItem = await db.collection("inventory").findOne({
                            _id: new ObjectId(inventoryItemId),
                        });

                        if (!invItem) {
                            result.errors.push(
                                `Inventory item ${inventoryItemId} not found for order ${orderId}`
                            );
                            continue;
                        }

                        // Check existing usageHistory for this orderId
                        const existingHistory = Array.isArray(invItem.usageHistory)
                            ? invItem.usageHistory as UsageHistoryEntry[]
                            : [];

                        const alreadyExists = existingHistory.some(
                            (entry) => String(entry.orderId) === orderId
                        );

                        if (alreadyExists) {
                            result.skippedDuplicate++;
                            continue;
                        }

                        // Push the usage history entry
                        await db.collection("inventory").updateOne(
                            { _id: new ObjectId(inventoryItemId) },
                            {
                                $push: {
                                    usageHistory: {
                                        orderId,
                                        orderRef,
                                        productName,
                                        clientName,
                                        quantityUsed: quantityRequired,
                                        unit: String(mat.unit || invItem.unit || ""),
                                        status: String(order.status || "processing"),
                                        usedAt: order.updatedAt || order.createdAt || new Date(),
                                    },
                                } as Record<string, unknown>,
                                $set: { updatedAt: new Date() },
                            }
                        );

                        result.entriesBackfilled++;
                    } catch (err) {
                        const errMsg = err instanceof Error ? err.message : String(err);
                        result.errors.push(
                            `Failed to backfill ${mat.itemName || inventoryItemId} for order ${orderId}: ${errMsg}`
                        );
                    }
                }
            }

            return envelope.ok(result);
        }),
    ),
    { tier: "write" },
);
