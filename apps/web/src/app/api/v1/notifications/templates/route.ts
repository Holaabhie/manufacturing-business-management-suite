/**
 * Notification Templates API — /api/v1/notifications/templates
 * ─────────────────────────────────────────────────────────
 * CRUD for notification templates. Seeds default templates
 * on first access. Supports toggle active/inactive, and
 * per-channel content fields.
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
        whatsappContent: "Hi {{client_name}}, your order #{{order_id}} for {{product_name}} is now *{{status}}*. 📦",
        telegramContent: "📦 *Order Update*\nHi {{client_name}}, your order #{{order_id}} for _{{product_name}}_ is now *{{status}}*.",
        emailSubject: "Order #{{order_id}} — Status Update",
        emailBody: "<p>Hi {{client_name}},</p><p>Your order <strong>#{{order_id}}</strong> for {{product_name}} is now <strong>{{status}}</strong>.</p>",
        smsContent: "Order #{{order_id}} for {{product_name}} is now {{status}}. — IND Manager",
        variables: ["client_name", "order_id", "product_name", "status"],
        active: true,
        version: 1,
    },
    {
        name: "Invoice Generated",
        trigger: "invoice_created",
        channels: ["whatsapp", "email"],
        template: "Dear {{client_name}}, Invoice #{{invoice_number}} of ₹{{amount}} has been generated for your order.",
        whatsappContent: "Dear {{client_name}}, Invoice *#{{invoice_number}}* of *₹{{amount}}* has been generated. 🧾",
        emailSubject: "Invoice #{{invoice_number}} — ₹{{amount}}",
        emailBody: "<p>Dear {{client_name}},</p><p>Invoice <strong>#{{invoice_number}}</strong> of <strong>₹{{amount}}</strong> has been generated for your order.</p>",
        smsContent: "Invoice #{{invoice_number}} of ₹{{amount}} generated. — IND Manager",
        variables: ["client_name", "invoice_number", "amount"],
        active: true,
        version: 1,
    },
    {
        name: "Payment Reminder",
        trigger: "payment_overdue",
        channels: ["whatsapp", "email", "telegram", "sms"],
        template: "Reminder: Payment of ₹{{amount}} for order #{{order_id}} is overdue since {{due_date}}. Please process at your earliest.",
        whatsappContent: "⏰ Reminder: Payment of *₹{{amount}}* for order *#{{order_id}}* is overdue since {{due_date}}. Please process at your earliest.",
        telegramContent: "⏰ *Payment Reminder*\nPayment of *₹{{amount}}* for order #{{order_id}} is overdue since {{due_date}}.",
        emailSubject: "Payment Reminder — ₹{{amount}} Overdue",
        emailBody: "<p>Reminder: Payment of <strong>₹{{amount}}</strong> for order <strong>#{{order_id}}</strong> is overdue since {{due_date}}.</p><p>Please process at your earliest convenience.</p>",
        smsContent: "Payment of ₹{{amount}} for order #{{order_id}} overdue since {{due_date}}. — IND Manager",
        variables: ["amount", "order_id", "due_date"],
        active: true,
        version: 1,
    },
    {
        name: "Low Stock Alert",
        trigger: "stock_low",
        channels: ["telegram"],
        template: "⚠️ Low stock alert: {{material_name}} is at {{current_stock}} {{unit}} (min: {{min_level}} {{unit}}). Reorder needed.",
        telegramContent: "⚠️ *Low Stock Alert*\n`{{material_name}}` is at *{{current_stock}} {{unit}}* (minimum: {{min_level}} {{unit}}).\nReorder needed!",
        smsContent: "LOW STOCK: {{material_name}} at {{current_stock}} {{unit}} (min: {{min_level}}). Reorder needed. — IND Manager",
        variables: ["material_name", "current_stock", "unit", "min_level"],
        active: true,
        version: 1,
    },
    {
        name: "Production Complete",
        trigger: "production_complete",
        channels: ["whatsapp"],
        template: "✅ Production complete! Order #{{order_id}} for {{product_name}} ({{quantity}} {{unit}}) is ready for delivery.",
        whatsappContent: "✅ Production complete!\nOrder *#{{order_id}}* for *{{product_name}}* ({{quantity}} {{unit}}) is ready for delivery. 🎉",
        emailSubject: "Production Complete — Order #{{order_id}}",
        emailBody: "<p>✅ Production is complete!</p><p>Order <strong>#{{order_id}}</strong> for <strong>{{product_name}}</strong> ({{quantity}} {{unit}}) is ready for delivery.</p>",
        variables: ["order_id", "product_name", "quantity", "unit"],
        active: false,
        version: 1,
    },
    {
        name: "Overdue Payment",
        trigger: "payment_critical",
        channels: ["whatsapp", "email"],
        template: "URGENT: Payment of ₹{{amount}} for order #{{order_id}} is critically overdue ({{days_overdue}} days). Please settle immediately.",
        whatsappContent: "🚨 URGENT: Payment of *₹{{amount}}* for order *#{{order_id}}* is critically overdue (*{{days_overdue}} days*). Please settle immediately.",
        emailSubject: "URGENT: ₹{{amount}} Payment Critically Overdue",
        emailBody: "<p style='color:#dc2626;font-weight:bold'>URGENT</p><p>Payment of <strong>₹{{amount}}</strong> for order <strong>#{{order_id}}</strong> is critically overdue (<strong>{{days_overdue}} days</strong>).</p><p>Please settle immediately.</p>",
        smsContent: "URGENT: ₹{{amount}} payment for order #{{order_id}} overdue {{days_overdue}} days. Settle immediately. — IND Manager",
        variables: ["amount", "order_id", "days_overdue"],
        active: true,
        version: 1,
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
                whatsappContent: t.whatsappContent,
                telegramContent: t.telegramContent,
                emailSubject: t.emailSubject,
                emailBody: t.emailBody,
                smsContent: t.smsContent,
                variables: t.variables || [],
                active: t.active,
                version: t.version || 1,
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

            if (!body.name) {
                return envelope.error("Template name is required", 400, "VALIDATION_ERROR");
            }

            const result = await db.collection("notification_templates").insertOne({
                userId: ownerId,
                name: body.name,
                trigger: body.trigger || "custom",
                channels: body.channels || ["whatsapp"],
                template: body.template || "",
                whatsappContent: body.whatsappContent || "",
                telegramContent: body.telegramContent || "",
                emailSubject: body.emailSubject || "",
                emailBody: body.emailBody || "",
                smsContent: body.smsContent || "",
                variables: body.variables || [],
                active: body.active ?? true,
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const created = await db
                .collection("notification_templates")
                .findOne({ _id: result.insertedId });

            return envelope.created({
                id: created!._id.toString(),
                name: created!.name,
                trigger: created!.trigger,
                channels: created!.channels,
                template: created!.template,
                active: created!.active,
                version: created!.version || 1,
                createdAt: created!.createdAt,
            });
        }),
    ),
    { tier: "write" },
);

// ── PATCH: Toggle active/inactive (bulk — backward compatible) ──
export const PATCH = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            const db = await getDb();
            const ownerId = getDataOwnerId(user);
            const body = await request.json();

            if (!body.id) {
                return envelope.error("Template ID required", 400, "BAD_REQUEST");
            }

            const updateFields: Record<string, unknown> = { updatedAt: new Date() };

            // Support both simple toggle and full update
            if (body.active !== undefined) updateFields.active = body.active;
            if (body.name !== undefined) updateFields.name = body.name;
            if (body.trigger !== undefined) updateFields.trigger = body.trigger;
            if (body.channels !== undefined) updateFields.channels = body.channels;
            if (body.template !== undefined) updateFields.template = body.template;
            if (body.whatsappContent !== undefined) updateFields.whatsappContent = body.whatsappContent;
            if (body.telegramContent !== undefined) updateFields.telegramContent = body.telegramContent;
            if (body.emailSubject !== undefined) updateFields.emailSubject = body.emailSubject;
            if (body.emailBody !== undefined) updateFields.emailBody = body.emailBody;
            if (body.smsContent !== undefined) updateFields.smsContent = body.smsContent;
            if (body.variables !== undefined) updateFields.variables = body.variables;

            const result = await db.collection("notification_templates").findOneAndUpdate(
                { _id: new ObjectId(body.id), userId: ownerId },
                { $set: updateFields },
                { returnDocument: "after" },
            );

            if (!result) {
                return envelope.error("Template not found", 404, "NOT_FOUND");
            }

            return envelope.ok({
                id: result._id.toString(),
                name: result.name,
                active: result.active,
                version: result.version || 1,
                updatedAt: result.updatedAt,
            });
        }),
    ),
    { tier: "write" },
);
