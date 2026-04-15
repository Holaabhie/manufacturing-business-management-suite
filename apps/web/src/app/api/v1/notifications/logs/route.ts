/**
 * Notification Logs API — /api/v1/notifications/logs
 * ─────────────────────────────────────────────────────────
 * Fetches notification activity log with client info.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDb } from "@/lib/mongodb";
import { getDataOwnerId } from "@/lib/auth-session";

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_request: NextRequest, user: AuthenticatedUser) => {
            const db = await getDb();
            const ownerId = getDataOwnerId(user);

            const logs = await db
                .collection("notification_logs")
                .aggregate([
                    { $match: { userId: ownerId } },
                    { $sort: { sentAt: -1 } },
                    { $limit: 50 },
                    {
                        $addFields: {
                            client_oid: {
                                $cond: {
                                    if: { $and: [{ $ne: ["$clientId", null] }, { $ne: ["$clientId", ""] }] },
                                    then: { $toObjectId: "$clientId" },
                                    else: null,
                                },
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: "clients",
                            localField: "client_oid",
                            foreignField: "_id",
                            as: "client",
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            templateName: 1,
                            channel: 1,
                            recipientName: 1,
                            status: 1,
                            message: 1,
                            sentAt: 1,
                            error: 1,
                            client: { $arrayElemAt: ["$client", 0] },
                        },
                    },
                ])
                .toArray();

            const formatted = logs.map((log) => ({
                id: log._id.toString(),
                templateName: log.templateName || "Unknown",
                channel: log.channel,
                recipientName: log.recipientName || log.client?.name || "Unknown",
                status: log.status || "sent",
                message: log.message,
                sentAt: log.sentAt,
                error: log.error,
            }));

            // Stats
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const sentToday = formatted.filter(
                (l) => new Date(l.sentAt) >= today
            ).length;
            const failed = formatted.filter((l) => l.status === "failed").length;

            return envelope.ok({
                logs: formatted,
                stats: {
                    sentToday,
                    failed,
                    total: formatted.length,
                },
            });
        }),
    ),
    { tier: "read" },
);
