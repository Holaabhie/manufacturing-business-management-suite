/**
 * Notification Templates API — /api/v1/notifications/templates
 * ─────────────────────────────────────────────────────────
 * CRUD for notification templates. Seeds default templates
 * on first access. Supports toggle active/inactive.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDb } from "@/lib/mongodb";
import { getDataOwnerId } from "@/lib/auth-session";
import { ObjectId } from "mongodb";

// ── Default templates seeded on first access ──
const DEFAULT_TEMPLATES = [
    {
        name: "Order Status Update",
        trigger: "order_status_change",
        channels: ["whatsapp", "telegram"],
        template: "Hi {{client_name}}, your order #{{order_id}} for {{product_name}} is now {{status}}.",
        active: true,
    },
    {
        name: "Invoice Generated",
        trigger: "invoice_created",
        channels: ["whatsapp", "email"],
        template: "Dear {{client_name}}, Invoice #{{invoice_number}} of ₹{{amount}} has been generated for your order.",
        active: true,
    },
    {
        name: "Payment Reminder",
        trigger: "payment_overdue",
        channels: ["whatsapp", "email", "telegram", "sms"],
        template: "Reminder: Payment of ₹{{amount}} for order #{{order_id}} is overdue since {{due_date}}. Please process at your earliest.",
        active: true,
    },
    {
        name: "Low Stock Alert",
        trigger: "stock_low",
        channels: ["telegram"],
        template: "⚠️ Low stock alert: {{material_name}} is at {{current_stock}} {{unit}} (min: {{min_level}} {{unit}}). Reorder needed.",
        active: true,
    },
    {
        name: "Production Complete",
        trigger: "production_complete",
        channels: ["whatsapp"],
        template: "✅ Production complete! Order #{{order_id}} for {{product_name}} ({{quantity}} {{unit}}) is ready for delivery.",
        active: false,
    },
    {
        name: "Overdue Payment",
        trigger: "payment_critical",
        channels: ["whatsapp", "email"],
        template: "URGENT: Payment of ₹{{amount}} for order #{{order_id}} is critically overdue ({{days_overdue}} days). Please settle immediately.",
        active: true,
    },
];

// ── GET: Fetch all templates (seed if empty) ──
export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_request: NextRequest, user: AuthenticatedUser) => {
            const db = await getDb();
            const ownerId = getDataOwnerId(user);

            let templates = await db
                .collection("notification_templates")
                .find({ userId: ownerId })
                .sort({ createdAt: 1 })
                .toArray();

            // Seed defaults if collection is empty for this user
            if (templates.length === 0) {
                const seeded = DEFAULT_TEMPLATES.map((t) => ({
                    ...t,
                    userId: ownerId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }));
                await db.collection("notification_templates").insertMany(seeded);
                templates = await db
                    .collection("notification_templates")
                    .find({ userId: ownerId })
                    .sort({ createdAt: 1 })
                    .toArray();
            }

            const formatted = templates.map((t) => ({
                id: t._id.toString(),
                name: t.name,
                trigger: t.trigger,
                channels: t.channels,
                template: t.template,
                active: t.active,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
            }));

            return envelope.ok(formatted);
        }),
    ),
    { tier: "read" },
);

// ── POST: Create new template ──
export const POST = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            const db = await getDb();
            const ownerId = getDataOwnerId(user);
            const body = await request.json();

            const result = await db.collection("notification_templates").insertOne({
                userId: ownerId,
                name: body.name,
                trigger: body.trigger || "custom",
                channels: body.channels || ["whatsapp"],
                template: body.template || "",
                active: body.active ?? true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const created = await db
                .collection("notification_templates")
                .findOne({ _id: result.insertedId });

            return envelope.created({
                id: created!._id.toString(),
                ...created,
            });
        }),
    ),
    { tier: "write" },
);

// ── PATCH: Toggle active/inactive ──
export const PATCH = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            const db = await getDb();
            const ownerId = getDataOwnerId(user);
            const body = await request.json();

            if (!body.id) {
                return envelope.error("Template ID required", 400, "BAD_REQUEST");
            }

            const result = await db.collection("notification_templates").findOneAndUpdate(
                { _id: new ObjectId(body.id), userId: ownerId },
                {
                    $set: {
                        active: body.active,
                        updatedAt: new Date(),
                    },
                },
                { returnDocument: "after" },
            );

            if (!result) {
                return envelope.error("Template not found", 404, "NOT_FOUND");
            }

            return envelope.ok({
                id: result._id.toString(),
                name: result.name,
                active: result.active,
            });
        }),
    ),
    { tier: "write" },
);
