/**
 * Notification Logs API — /api/v1/notifications/logs
 * ─────────────────────────────────────────────────────────
 * Fetches notification activity log with client info.
 * Supports filtering by channel, status, eventType,
 * templateId, dateRange, retryCount, and pagination.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDb } from "@/lib/mongodb";
import { getDataOwnerId } from "@/lib/auth-session";
import { ObjectId } from "mongodb";

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            const db = await getDb();
            const ownerId = getDataOwnerId(user);

            // ── Parse query params ──
            const { searchParams } = new URL(request.url);
            const channelFilter = searchParams.get("channel");
            const statusFilter = searchParams.get("status");
            const eventTypeFilter = searchParams.get("eventType");
            const templateIdFilter = searchParams.get("templateId");
            const dateFrom = searchParams.get("dateFrom");
            const dateTo = searchParams.get("dateTo");
            const minRetryCount = searchParams.get("minRetryCount");
            const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
            const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));

            // ── Build match stage ──
            const matchStage: Record<string, unknown> = { userId: ownerId };

            if (channelFilter && channelFilter !== "all") {
                matchStage.channel = channelFilter.toLowerCase();
            }
            if (statusFilter && statusFilter !== "all") {
                matchStage.status = statusFilter.toLowerCase();
            }
            if (eventTypeFilter && eventTypeFilter !== "all") {
                matchStage.eventType = eventTypeFilter;
            }
            if (templateIdFilter) {
                matchStage.templateId = templateIdFilter;
            }
            if (dateFrom || dateTo) {
                const dateFilter: Record<string, unknown> = {};
                if (dateFrom) dateFilter.$gte = new Date(dateFrom);
                if (dateTo) dateFilter.$lte = new Date(dateTo);
                matchStage.sentAt = dateFilter;
            }
            if (minRetryCount) {
                matchStage.retryCount = { $gte: parseInt(minRetryCount, 10) };
            }

            // ── Count total for pagination ──
            const total = await db
                .collection("notification_logs")
                .countDocuments(matchStage);

            // ── Fetch paginated logs ──
            const logs = await db
                .collection("notification_logs")
                .aggregate([
                    { $match: matchStage },
                    { $sort: { sentAt: -1 } },
                    { $skip: (page - 1) * pageSize },
                    { $limit: pageSize },
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
                            templateId: 1,
                            templateName: 1,
                            channel: 1,
                            eventType: 1,
                            recipientName: 1,
                            recipientContact: 1,
                            status: 1,
                            message: 1,
                            renderedContent: 1,
                            provider: 1,
                            providerMessageId: 1,
                            retryCount: 1,
                            lastAttemptAt: 1,
                            errorCode: 1,
                            error: 1,
                            sentAt: 1,
                            createdAt: 1,
                            client: { $arrayElemAt: ["$client", 0] },
                        },
                    },
                ])
                .toArray();

            const formatted = logs.map((log) => ({
                id: log._id.toString(),
                templateId: log.templateId,
                templateName: log.templateName || "Unknown",
                channel: log.channel,
                eventType: log.eventType || "unknown",
                recipientName: log.recipientName || log.client?.name || "Unknown",
                recipientContact: log.recipientContact || "",
                status: log.status || "sent",
                message: log.message || log.renderedContent || "",
                renderedContent: log.renderedContent,
                provider: log.provider,
                providerMessageId: log.providerMessageId,
                retryCount: log.retryCount || 0,
                lastAttemptAt: log.lastAttemptAt,
                errorCode: log.errorCode,
                error: log.error,
                sentAt: log.sentAt,
                createdAt: log.createdAt,
            }));

            // ── Stats — always compute from unfiltered data ──
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const statsPipeline = [
                { $match: { userId: ownerId } },
                {
                    $facet: {
                        sentToday: [
                            {
                                $match: {
                                    sentAt: { $gte: today },
                                    status: { $in: ["sent", "delivered"] },
                                },
                            },
                            { $count: "count" },
                        ],
                        failed: [
                            { $match: { status: "failed" } },
                            { $count: "count" },
                        ],
                        retrying: [
                            { $match: { status: "retrying" } },
                            { $count: "count" },
                        ],
                        totalAll: [{ $count: "count" }],
                    },
                },
            ];

            const [statsResult] = await db
                .collection("notification_logs")
                .aggregate(statsPipeline)
                .toArray();

            return envelope.ok({
                logs: formatted,
                stats: {
                    sentToday: statsResult?.sentToday?.[0]?.count || 0,
                    failed: statsResult?.failed?.[0]?.count || 0,
                    retrying: statsResult?.retrying?.[0]?.count || 0,
                    total: statsResult?.totalAll?.[0]?.count || 0,
                },
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                },
            });
        }),
    ),
    { tier: "read" },
);
