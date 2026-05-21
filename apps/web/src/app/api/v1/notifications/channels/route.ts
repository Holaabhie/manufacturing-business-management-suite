/**
 * Notification Channels API — /api/v1/notifications/channels
 * ─────────────────────────────────────────────────────────
 * Reports which channels have valid credentials configured,
 * along with active template counts and today's send stats.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDb } from "@/lib/mongodb";
import { getDataOwnerId } from "@/lib/auth-session";
import { getChannelStatus } from "@/lib/notifications/channels/index";

export const GET = withRateLimit(
  withApiRoute(
    withAuth(async (_request: NextRequest, user: AuthenticatedUser) => {
      const db = await getDb();
      const ownerId = getDataOwnerId(user);

      // Get adapter configuration status
      const adapterStatus = getChannelStatus();

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get per-channel active template count
      const templateCounts = await db
        .collection("notification_templates")
        .aggregate([
          { $match: { userId: ownerId, active: true } },
          { $unwind: "$channels" },
          { $group: { _id: "$channels", count: { $sum: 1 } } },
        ])
        .toArray();

      const templateCountMap: Record<string, number> = {};
      for (const tc of templateCounts) {
        templateCountMap[tc._id] = tc.count;
      }

      // Get per-channel sent count today
      const todaySends = await db
        .collection("notification_logs")
        .aggregate([
          {
            $match: {
              userId: ownerId,
              sentAt: { $gte: todayStart },
              status: { $in: ["sent", "delivered"] },
            },
          },
          { $group: { _id: "$channel", count: { $sum: 1 } } },
        ])
        .toArray();

      const sentTodayMap: Record<string, number> = {};
      for (const s of todaySends) {
        sentTodayMap[s._id] = s.count;
      }

      // Get per-channel failed count today
      const todayFails = await db
        .collection("notification_logs")
        .aggregate([
          {
            $match: {
              userId: ownerId,
              sentAt: { $gte: todayStart },
              status: "failed",
            },
          },
          { $group: { _id: "$channel", count: { $sum: 1 } } },
        ])
        .toArray();

      const failedTodayMap: Record<string, number> = {};
      for (const f of todayFails) {
        failedTodayMap[f._id] = f.count;
      }

      // Combine all data
      const channels = adapterStatus.map((as) => ({
        channel: as.channel,
        configured: as.configured,
        provider: as.provider,
        activeTemplates: templateCountMap[as.channel] || 0,
        sentToday: sentTodayMap[as.channel] || 0,
        failedToday: failedTodayMap[as.channel] || 0,
      }));

      return envelope.ok(channels);
    }),
  ),
  { tier: "read" },
);
