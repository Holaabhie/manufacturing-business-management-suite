/**
 * Notification Template [id] API — /api/v1/notifications/templates/[id]
 * ─────────────────────────────────────────────────────────
 * Individual template operations:
 * - GET:    Fetch a single template
 * - PATCH:  Update template fields
 * - DELETE: Remove a template
 * - POST:   Preview rendered template
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDb } from "@/lib/mongodb";
import { getDataOwnerId } from "@/lib/auth-session";
import { ObjectId } from "mongodb";
import { renderForChannel } from "@/lib/notifications/template-renderer";
import type { NotificationChannel } from "@/lib/notifications/types";

type RouteContext = { params: Promise<{ id: string }> };

// ── GET: Fetch a single template ──
export const GET = withRateLimit(
  withApiRoute(
    withAuth(async (_request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
      const { id } = await context!.params;
      const db = await getDb();
      const ownerId = getDataOwnerId(user);

      if (!ObjectId.isValid(id)) {
        return envelope.error("Invalid template ID", 400, "VALIDATION_ERROR");
      }

      const template = await db
        .collection("notification_templates")
        .findOne({ _id: new ObjectId(id), userId: ownerId });

      if (!template) {
        return envelope.error("Template not found", 404, "NOT_FOUND");
      }

      return envelope.ok({
        id: template._id.toString(),
        name: template.name,
        trigger: template.trigger,
        channels: template.channels,
        template: template.template,
        whatsappContent: template.whatsappContent,
        telegramContent: template.telegramContent,
        emailSubject: template.emailSubject,
        emailBody: template.emailBody,
        smsContent: template.smsContent,
        variables: template.variables,
        active: template.active,
        version: template.version || 1,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      });
    }) as any,
  ),
  { tier: "read" },
);

// ── PATCH: Update template fields ──
export const PATCH = withRateLimit(
  withApiRoute(
    withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
      const { id } = await context!.params;
      const db = await getDb();
      const ownerId = getDataOwnerId(user);
      const body = await request.json();

      if (!ObjectId.isValid(id)) {
        return envelope.error("Invalid template ID", 400, "VALIDATION_ERROR");
      }

      // Build update object with only provided fields
      const updateFields: Record<string, unknown> = { updatedAt: new Date() };
      const allowedFields = [
        "name",
        "trigger",
        "channels",
        "template",
        "whatsappContent",
        "telegramContent",
        "emailSubject",
        "emailBody",
        "smsContent",
        "variables",
        "active",
      ];

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateFields[field] = body[field];
        }
      }

      // Increment version on content changes
      const contentChanged = [
        "template", "whatsappContent", "telegramContent",
        "emailSubject", "emailBody", "smsContent",
      ].some((f) => body[f] !== undefined);

      const updateOp: Record<string, unknown> = { $set: updateFields };
      if (contentChanged) {
        updateOp.$inc = { version: 1 };
      }

      const result = await db
        .collection("notification_templates")
        .findOneAndUpdate(
          { _id: new ObjectId(id), userId: ownerId },
          updateOp,
          { returnDocument: "after" },
        );

      if (!result) {
        return envelope.error("Template not found", 404, "NOT_FOUND");
      }

      return envelope.ok({
        id: result._id.toString(),
        name: result.name,
        trigger: result.trigger,
        channels: result.channels,
        template: result.template,
        active: result.active,
        version: result.version || 1,
        updatedAt: result.updatedAt,
      });
    }) as any,
  ),
  { tier: "write" },
);

// ── DELETE: Remove a template ──
export const DELETE = withRateLimit(
  withApiRoute(
    withAuth(async (_request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
      const { id } = await context!.params;
      const db = await getDb();
      const ownerId = getDataOwnerId(user);

      if (!ObjectId.isValid(id)) {
        return envelope.error("Invalid template ID", 400, "VALIDATION_ERROR");
      }

      const result = await db
        .collection("notification_templates")
        .deleteOne({ _id: new ObjectId(id), userId: ownerId });

      if (result.deletedCount === 0) {
        return envelope.error("Template not found", 404, "NOT_FOUND");
      }

      return envelope.ok({ deleted: true, id });
    }) as any,
  ),
  { tier: "write" },
);

// ── POST: Preview rendered template ──
export const POST = withRateLimit(
  withApiRoute(
    withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
      const { id } = await context!.params;
      const db = await getDb();
      const ownerId = getDataOwnerId(user);
      const body = await request.json();

      if (!ObjectId.isValid(id)) {
        return envelope.error("Invalid template ID", 400, "VALIDATION_ERROR");
      }

      const template = await db
        .collection("notification_templates")
        .findOne({ _id: new ObjectId(id), userId: ownerId });

      if (!template) {
        return envelope.error("Template not found", 404, "NOT_FOUND");
      }

      const payload = body.payload || {};
      const channels = (template.channels || []) as NotificationChannel[];

      // Render for all channels
      const previews: Record<string, { message: string; subject?: string }> = {};
      for (const channel of channels) {
        const rendered = renderForChannel(template, channel, payload);
        previews[channel] = {
          message: rendered.renderedMessage,
          subject: rendered.renderedSubject,
        };
      }

      return envelope.ok({
        templateId: id,
        templateName: template.name,
        channels,
        previews,
        variables: template.variables || [],
      });
    }) as any,
  ),
  { tier: "read" },
);
