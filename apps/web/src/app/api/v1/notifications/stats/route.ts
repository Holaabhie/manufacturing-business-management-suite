/**
 * Notification Stats API — /api/v1/notifications/stats
 * ─────────────────────────────────────────────────────────
 * Aggregated analytics for the notification dashboard:
 * sent/failed counts, per-channel breakdown, success rates.
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

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);

      // ── Aggregation pipeline ──
      const pipeline = [
        { $match: { userId: ownerId } },
        {
          $facet: {
            // Total counts by status
            byStatus: [
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ],
            // Today's counts
            today: [
              { $match: { sentAt: { $gte: todayStart } } },
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                },
              },
            ],
            // This week's counts
            thisWeek: [
              { $match: { sentAt: { $gte: weekStart } } },
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                },
              },
            ],
            // Per-channel breakdown
            byChannel: [
              {
                $group: {
                  _id: { channel: "$channel", status: "$status" },
                  count: { $sum: 1 },
                },
              },
            ],
            // Recent activity (last 24 hours, hourly)
            hourly: [
              { $match: { sentAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } },
              {
                $group: {
                  _id: {
                    hour: { $hour: "$sentAt" },
                    status: "$status",
                  },
                  count: { $sum: 1 },
                },
              },
              { $sort: { "_id.hour": 1 } },
            ],
            // Total
            total: [{ $count: "count" }],
          },
        },
      ];

      const [result] = await db
        .collection("notification_logs")
        .aggregate(pipeline)
        .toArray();

      // ── Format results ──
      const statusCounts: Record<string, number> = {};
      for (const s of result.byStatus) {
        statusCounts[s._id] = s.count;
      }

      const todayCounts: Record<string, number> = {};
      for (const s of result.today) {
        todayCounts[s._id] = s.count;
      }

      const weekCounts: Record<string, number> = {};
      for (const s of result.thisWeek) {
        weekCounts[s._id] = s.count;
      }

      // Channel breakdown
      const channelBreakdown: Record<string, Record<string, number>> = {};
      for (const entry of result.byChannel) {
        const ch = entry._id.channel;
        if (!channelBreakdown[ch]) channelBreakdown[ch] = {};
        channelBreakdown[ch][entry._id.status] = entry.count;
      }

      const totalSent = (statusCounts["sent"] || 0) + (statusCounts["delivered"] || 0);
      const totalAll = result.total[0]?.count || 0;
      const successRate = totalAll > 0
        ? Math.round((totalSent / totalAll) * 100)
        : 0;

      return envelope.ok({
        totals: {
          all: totalAll,
          sent: statusCounts["sent"] || 0,
          delivered: statusCounts["delivered"] || 0,
          failed: statusCounts["failed"] || 0,
          queued: statusCounts["queued"] || 0,
          pending: statusCounts["pending"] || 0,
          retrying: statusCounts["retrying"] || 0,
        },
        today: {
          sent: (todayCounts["sent"] || 0) + (todayCounts["delivered"] || 0),
          failed: todayCounts["failed"] || 0,
          total: Object.values(todayCounts).reduce((a, b) => a + b, 0),
        },
        thisWeek: {
          sent: (weekCounts["sent"] || 0) + (weekCounts["delivered"] || 0),
          failed: weekCounts["failed"] || 0,
          total: Object.values(weekCounts).reduce((a, b) => a + b, 0),
        },
        byChannel: channelBreakdown,
        successRate,
        hourlyActivity: result.hourly,
      });
    }),
  ),
  { tier: "read" },
);
