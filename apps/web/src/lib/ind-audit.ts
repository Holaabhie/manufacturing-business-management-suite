import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { headers } from "next/headers";

/**
 * IND Manager — Audit logging utility (v2)
 *
 * Records all significant actions to the `ind_audit_logs` collection.
 * Call after every create, update, or delete operation.
 *
 * This is an append-only, immutable log — records are never updated or deleted.
 * Uses raw MongoDB driver (getDb()) — no Mongoose dependency.
 */

export interface IndAuditLogEntry {
    businessId: string | ObjectId;
    userId: string | ObjectId;
    action: string;            // e.g. "ORDER_CREATED", "INVOICE_SENT"
    entityType: string;        // e.g. "order", "invoice", "inventory"
    entityId: string | ObjectId;
    changes?: {
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
    };
    ipAddress?: string | null;
    userAgent?: string | null;
}

/**
 * Log a single auditable action to `ind_audit_logs`.
 *
 * @example
 * ```ts
 * await logIndAction({
 *   businessId: user.businessId,
 *   userId: user._id,
 *   action: IndAuditActions.ORDER_CREATED,
 *   entityType: "order",
 *   entityId: newOrder.insertedId,
 *   changes: { after: orderData },
 * });
 * ```
 */
export async function logIndAction(entry: IndAuditLogEntry): Promise<void> {
    try {
        const db = await getDb();

        // Try to extract IP and User-Agent from request headers if not provided
        let ipAddress = entry.ipAddress ?? null;
        let userAgent = entry.userAgent ?? null;

        if (!ipAddress || !userAgent) {
            try {
                const hdrs = await headers();
                if (!ipAddress) {
                    ipAddress =
                        hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                        hdrs.get("x-real-ip") ||
                        null;
                }
                if (!userAgent) {
                    userAgent = hdrs.get("user-agent") || null;
                }
            } catch {
                // headers() not available outside request context — skip
            }
        }

        await db.collection("ind_audit_logs").insertOne({
            businessId: toObjectId(entry.businessId),
            userId: toObjectId(entry.userId),
            action: entry.action,
            entityType: entry.entityType,
            entityId: toObjectId(entry.entityId),
            changes: entry.changes ?? {},
            ipAddress,
            userAgent,
            createdAt: new Date(),
        });
    } catch (err) {
        // Audit logging should never crash the main operation
        console.error("[ind-audit] Failed to log action:", err instanceof Error ? err.message : err);
    }
}

/**
 * Log multiple actions in a single batch insert.
 * Useful for bulk operations like batch inventory updates.
 */
export async function logIndActions(entries: IndAuditLogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    try {
        const db = await getDb();

        let ipAddress: string | null = null;
        let userAgent: string | null = null;

        try {
            const hdrs = await headers();
            ipAddress =
                hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                hdrs.get("x-real-ip") ||
                null;
            userAgent = hdrs.get("user-agent") || null;
        } catch {
            // Not in request context
        }

        const docs = entries.map((entry) => ({
            businessId: toObjectId(entry.businessId),
            userId: toObjectId(entry.userId),
            action: entry.action,
            entityType: entry.entityType,
            entityId: toObjectId(entry.entityId),
            changes: entry.changes ?? {},
            ipAddress: entry.ipAddress ?? ipAddress,
            userAgent: entry.userAgent ?? userAgent,
            createdAt: new Date(),
        }));

        await db.collection("ind_audit_logs").insertMany(docs, { ordered: false });
    } catch (err) {
        console.error("[ind-audit] Failed to log batch actions:", err instanceof Error ? err.message : err);
    }
}

// ─── Standard action constants ───────────────────────────────────

export const IndAuditActions = {
    // Auth
    USER_LOGGED_IN: "USER_LOGGED_IN",
    USER_LOGGED_OUT: "USER_LOGGED_OUT",
    USER_CREATED: "USER_CREATED",
    USER_UPDATED: "USER_UPDATED",
    USER_DEACTIVATED: "USER_DEACTIVATED",
    PASSWORD_CHANGED: "PASSWORD_CHANGED",
    OTP_REQUESTED: "OTP_REQUESTED",
    OTP_VERIFIED: "OTP_VERIFIED",

    // Business
    BUSINESS_CREATED: "BUSINESS_CREATED",
    BUSINESS_UPDATED: "BUSINESS_UPDATED",

    // Orders
    ORDER_CREATED: "ORDER_CREATED",
    ORDER_UPDATED: "ORDER_UPDATED",
    ORDER_DELETED: "ORDER_DELETED",
    ORDER_STATUS_CHANGED: "ORDER_STATUS_CHANGED",

    // Invoices
    INVOICE_CREATED: "INVOICE_CREATED",
    INVOICE_SENT: "INVOICE_SENT",
    INVOICE_UPDATED: "INVOICE_UPDATED",

    // Inventory
    INVENTORY_CREATED: "INVENTORY_CREATED",
    INVENTORY_UPDATED: "INVENTORY_UPDATED",
    INVENTORY_DELETED: "INVENTORY_DELETED",
    STOCK_ADJUSTED: "STOCK_ADJUSTED",

    // Production
    PRODUCTION_CREATED: "PRODUCTION_CREATED",
    PRODUCTION_UPDATED: "PRODUCTION_UPDATED",
    PRODUCTION_COMPLETED: "PRODUCTION_COMPLETED",

    // Payments
    PAYMENT_RECORDED: "PAYMENT_RECORDED",
    PAYMENT_UPDATED: "PAYMENT_UPDATED",
} as const;

export type IndAuditAction = (typeof IndAuditActions)[keyof typeof IndAuditActions];

// ─── Helpers ─────────────────────────────────────────────────────

function toObjectId(id: string | ObjectId): ObjectId | string {
    if (id instanceof ObjectId) return id;
    if (typeof id === "string" && ObjectId.isValid(id)) return new ObjectId(id);
    return id;
}
