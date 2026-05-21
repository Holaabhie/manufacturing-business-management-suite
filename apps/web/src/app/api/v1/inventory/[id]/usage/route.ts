/**
 * Material Usage History API — /api/v1/inventory/[id]/usage
 * ─────────────────────────────────────────────────────────
 * Returns usage history for a specific material by:
 * 1. Querying productions collection for production-based consumption
 * 2. Reading the inventory item's embedded usageHistory array (order-based deductions)
 * Both sources are merged and sorted by date descending.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getDataOwnerId } from "@/lib/auth-session";

type RouteContext = { params: Promise<{ id: string }> };

interface UsageLog {
    productionId: string;
    orderId: string;
    orderProductName: string;
    batchNumber: string;
    operatorName: string;
    status: string;
    materialName: string;
    qtyUsed: number;
    unit: string;
    date: string;
    source: "production" | "order";
}

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id: materialId } = await context!.params;
            const db = await getDb();
            const ownerId = getDataOwnerId(user);

            // ── Source 1: Production-based usage (existing aggregation) ──
            const productionLogs = await db
                .collection("productions")
                .aggregate([
                    { $match: { userId: ownerId } },
                    { $unwind: "$materials" },
                    { $match: { "materials.inventoryId": materialId } },
                    { $sort: { createdAt: -1 } },
                    {
                        $project: {
                            _id: 0,
                            productionId: { $toString: "$_id" },
                            orderId: 1,
                            orderProductName: 1,
                            batchNumber: 1,
                            operatorName: 1,
                            status: 1,
                            materialName: "$materials.name",
                            qtyUsed: "$materials.quantityUsed",
                            unit: "$materials.unit",
                            date: "$createdAt",
                        },
                    },
                ])
                .toArray();

            const prodLogs: UsageLog[] = productionLogs.map((l) => ({
                ...(l as Omit<UsageLog, "source">),
                source: "production" as const,
            }));

            // ── Source 2: Order-based deductions (embedded usageHistory on inventory doc) ──
            let orderLogs: UsageLog[] = [];
            try {
                const invItem = await db.collection("inventory").findOne({
                    _id: new ObjectId(materialId),
                });

                if (invItem && Array.isArray(invItem.usageHistory)) {
                    orderLogs = invItem.usageHistory.map((entry: Record<string, unknown>) => ({
                        productionId: "",
                        orderId: String(entry.orderId || ""),
                        orderProductName: String(entry.productName || ""),
                        batchNumber: String(entry.orderRef || ""),
                        operatorName: String(entry.clientName || ""),
                        status: String(entry.status || "completed"),
                        materialName: invItem.name || "",
                        qtyUsed: Number(entry.quantityUsed || 0),
                        unit: String(entry.unit || invItem.unit || ""),
                        date: entry.usedAt ? new Date(entry.usedAt as string).toISOString() : new Date().toISOString(),
                        source: "order" as const,
                    }));
                }
            } catch {
                // Inventory item not found or invalid ID — skip
            }

            // ── Merge and sort by date descending ──
            const allLogs = [...prodLogs, ...orderLogs].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            );

            // Compute stats from merged data
            const totalUsed = allLogs.reduce((sum, l) => sum + Number(l.qtyUsed || 0), 0);
            const productionCount = allLogs.filter((l) => l.status === "completed" || l.status === "in_progress").length;
            const pendingCount = allLogs.filter((l) => l.status === "pending").length;
            const avgPerUse = allLogs.length > 0 ? totalUsed / allLogs.length : 0;

            return envelope.ok({
                logs: allLogs,
                stats: {
                    totalUsed: Math.round(totalUsed * 100) / 100,
                    productionCount,
                    pendingCount,
                    avgPerUse: Math.round(avgPerUse * 100) / 100,
                    totalRecords: allLogs.length,
                },
            });
        }),
    ),
    { tier: "read" },
);
