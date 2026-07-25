/**
 * Material Usage History API — /api/v1/inventory/[id]/usage
 * ─────────────────────────────────────────────────────────
 * Returns usage history for a specific material from the canonical
 * production_material_usage collection, enriched via $lookup to productions.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDb } from "@/lib/mongodb";

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

            // ── Canonical source: production_material_usage collection ──
            // This is written to by POST /api/production when materials are present.
            // We $lookup into productions for context fields (batchNumber, status, etc).
            const usageLogs = await db
                .collection("production_material_usage")
                .aggregate([
                    {
                        $match: {
                            userId: ownerId,
                            inventoryItemId: materialId,
                        },
                    },
                    {
                        $sort: { createdAt: -1 },
                    },
                    {
                        $addFields: {
                            _productionJobOid: {
                                $cond: {
                                    if: { $ne: ["$productionJobId", null] },
                                    then: { $toObjectId: "$productionJobId" },
                                    else: null,
                                },
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: "productions",
                            localField: "_productionJobOid",
                            foreignField: "_id",
                            as: "_prod",
                        },
                    },
                    { $unwind: { path: "$_prod", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            _id: 0,
                            productionId: { $ifNull: ["$productionJobId", ""] },
                            orderId: { $ifNull: ["$_prod.orderId", ""] },
                            orderProductName: { $ifNull: ["$_prod.orderProductName", ""] },
                            batchNumber: { $ifNull: ["$_prod.batchNumber", ""] },
                            operatorName: { $ifNull: ["$_prod.operatorName", ""] },
                            status: { $ifNull: ["$_prod.status", "completed"] },
                            materialName: { $ifNull: ["$itemName", ""] },
                            qtyUsed: { $ifNull: ["$quantityUsed", 0] },
                            unit: { $ifNull: ["$unit", ""] },
                            date: { $ifNull: ["$createdAt", new Date()] },
                            source: { $literal: "production" },
                        },
                    },
                ])
                .toArray();

            const allLogs: UsageLog[] = usageLogs.map((l) => ({
                ...(l as Omit<UsageLog, "source">),
                date: l.date instanceof Date ? l.date.toISOString() : String(l.date),
                source: "production" as const,
            }));

            // Sort by date descending
            allLogs.sort(
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
