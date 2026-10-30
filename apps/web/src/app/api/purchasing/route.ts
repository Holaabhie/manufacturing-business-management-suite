type PurchasingItemCandidate = { inventoryItemId?: string; inventoryId?: string; materialName?: string; quantity?: number; unit?: string; unitPrice?: number; unitCost?: number; [key: string]: unknown };
/**
 * Purchasing API — /api/purchasing
 * ─────────────────────────────────────────────────────────
 * GET  — List all purchase orders
 * POST — Create a new purchase order
 *        Optionally upserts line items into inventory when
 *        addToInventory is true (request-only flag).
 */

import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { requireRole } from "@/lib/require-role";
import { getPurchasingService } from "@/modules/purchasing";
import { getDb } from "@/lib/mongodb";
import { assertCanCreate } from "@/lib/entitlements";
import {
    paginationQuerySchema,
    buildPaginatedEnvelope,
    buildTruncatedEnvelope,
    PURCHASING_ORDER_SORT_FIELDS,
    isValidSortField,
    escapeRegex,
} from "@/shared/lib/pagination";

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const searchParams = url.searchParams;
        const hasPagination = searchParams.has("page") || searchParams.has("limit") || searchParams.has("q") || searchParams.has("sort");

        const rawSort = searchParams.get("sort") || undefined;
        if (rawSort && !isValidSortField(rawSort, PURCHASING_ORDER_SORT_FIELDS)) {
            return NextResponse.json(
                { success: false, error: `Invalid sort field '${rawSort}'. Whitelisted: ${PURCHASING_ORDER_SORT_FIELDS.join(", ")}` },
                { status: 400 }
            );
        }

        const parsed = paginationQuerySchema.safeParse({
            page: searchParams.get("page") ?? 1,
            limit: searchParams.get("limit") ?? 25,
            sort: rawSort ?? "createdAt",
            order: searchParams.get("order") ?? "desc",
            q: searchParams.get("q") ?? undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0]?.message || "Invalid query parameters" },
                { status: 400 }
            );
        }

        const query = parsed.data;
        const db = await getDb();
        const userId = getDataOwnerId(user);
        const filter: Record<string, unknown> = { userId };

        if (query.q && query.q.trim()) {
            const escaped = escapeRegex(query.q.trim());
            filter.$or = [
                { poNumber: { $regex: escaped, $options: "i" } },
                { vendorName: { $regex: escaped, $options: "i" } },
            ];
        }

        const col = db.collection("purchase_orders");
        const total = await col.countDocuments(filter);

        const sortDirection = query.order === "asc" ? 1 : -1;
        const sortField = query.sort || "createdAt";
        const skip = (query.page - 1) * query.limit;
        const take = hasPagination ? query.limit : 500;

        const docs = await col
            .find(filter)
            .sort({ [sortField]: sortDirection })
            .skip(skip)
            .limit(take)
            .toArray();

        const formatted = docs.map((doc) => ({
            id: doc._id.toString(),
            userId: doc.userId,
            poNumber: doc.poNumber,
            vendorId: doc.vendorId,
            vendorName: doc.vendorName,
            items: doc.items,
            status: doc.status,
            subtotal: doc.subtotal,
            taxAmount: doc.taxAmount,
            totalAmount: doc.totalAmount,
            paidAmount: doc.paidAmount ?? 0,
            notes: doc.notes,
            orderedAt: doc.orderedAt,
            receivedAt: doc.receivedAt,
            inventorySyncedOnCreate: doc.inventorySyncedOnCreate,
            lastPaymentMode: doc.lastPaymentMode,
            lastPaymentDate: doc.lastPaymentDate,
            lastPaymentReference: doc.lastPaymentReference,
            lastPaymentNotes: doc.lastPaymentNotes,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        }));

        if (hasPagination) {
            return NextResponse.json(buildPaginatedEnvelope(formatted, query.page, query.limit, total), {
                headers: { "X-Total-Count": String(total) },
            });
        }

        return NextResponse.json(buildTruncatedEnvelope(formatted, total, 500), {
            headers: {
                "X-Total-Count": String(total),
                "X-Truncated": String(total > 500),
            },
        });
    } catch (error: unknown) {
        console.error("Error fetching purchase orders:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await requireRole(["Owner", "Admin", "Manager", "Accountant"]);
        if (authResult.error || !authResult.user) {
            return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 });
        }
        const user = authResult.user;

        const body = await request.json();

        // Extract request-only flag before passing to service
        // (Zod schema strips unknown keys, but we read it here explicitly)
        const addToInventory = body.addToInventory === true;

        // ── Pre-check inventory plan limits if addToInventory is true ────────
        if (addToInventory && Array.isArray(body.items) && body.items.length > 0) {
            const userId = getDataOwnerId(user);
            const db = await getDb();

            const candidateOps = body.items.filter((i: PurchasingItemCandidate) => {
                const hasId = i.inventoryItemId && typeof i.inventoryItemId === "string";
                const hasName = i.materialName && typeof i.materialName === "string" && String(i.materialName).trim().length > 0;
                const qty = Number(i.quantity);
                return (hasId || hasName) && qty > 0;
            });

            if (candidateOps.length > 0) {
                const uniqueIdMap = new Map<string, ObjectId>();
                const uniqueNameSet = new Set<string>();

                for (const i of candidateOps) {
                    const trimmedName = String(i.materialName || "").trim();
                    const validObjectId = i.inventoryItemId && ObjectId.isValid(i.inventoryItemId);
                    if (validObjectId) {
                        uniqueIdMap.set(i.inventoryItemId, new ObjectId(i.inventoryItemId));
                    } else if (trimmedName) {
                        uniqueNameSet.add(trimmedName);
                    }
                }

                const existingIdSet = new Set<string>();
                if (uniqueIdMap.size > 0) {
                    const foundById = await db.collection("inventory").find(
                        { _id: { $in: Array.from(uniqueIdMap.values()) }, userId },
                        { projection: { _id: 1 } }
                    ).toArray();
                    foundById.forEach((doc) => existingIdSet.add(doc._id.toString()));
                }

                const existingNameSet = new Set<string>();
                if (uniqueNameSet.size > 0) {
                    const foundByName = await db.collection("inventory").find(
                        { name: { $in: Array.from(uniqueNameSet) }, userId },
                        { projection: { name: 1 } }
                    ).toArray();
                    foundByName.forEach((doc) => existingNameSet.add(doc.name));
                }

                let newInsertsCount = 0;
                for (const [idStr] of uniqueIdMap) {
                    if (!existingIdSet.has(idStr)) newInsertsCount++;
                }
                for (const nameStr of uniqueNameSet) {
                    if (!existingNameSet.has(nameStr)) newInsertsCount++;
                }

                if (newInsertsCount > 0) {
                    const limitError = await assertCanCreate(user, "inventory", newInsertsCount);
                    if (limitError) return limitError;
                }
            }
        }

        const service = getPurchasingService();
        const order = await service.createOrder(getDataOwnerId(user), body);

        // ── Inventory upsert (guarded, non-blocking) ────────────────
        // Runs only on initial PO creation (POST). When a PO created with
        // this flag is later marked "Received", the service skips
        // addStockFromPurchase() to prevent double-counting.
        let inventorySynced = false;
        if (addToInventory && Array.isArray(body.items) && body.items.length > 0) {
            try {
                const userId = getDataOwnerId(user);
                const db = await getDb();

                const ops = body.items
                    .filter((i: PurchasingItemCandidate) => {
                        const hasId = i.inventoryItemId && typeof i.inventoryItemId === "string";
                        const hasName = i.materialName && typeof i.materialName === "string" && String(i.materialName).trim().length > 0;
                        const qty = Number(i.quantity);
                        return (hasId || hasName) && qty > 0;
                    })
                    .map((i: PurchasingItemCandidate) => {
                        // Prefer ObjectId match; fall back to trimmed name + userId
                        const trimmedName = String(i.materialName || "").trim();
                        const validObjectId = i.inventoryItemId && ObjectId.isValid(i.inventoryItemId);

                        const filter = validObjectId
                            ? { _id: new ObjectId(i.inventoryItemId), userId }
                            : { name: trimmedName, userId };

                        return {
                            updateOne: {
                                filter,
                                update: {
                                    $inc: { quantity: Number(i.quantity) || 0 },
                                    $set: {
                                        unit: i.unit || "kg",
                                        purchase_cost_per_unit: Number(i.unitPrice) || 0,
                                        purchase_price: Number(i.unitPrice) || 0,
                                        updatedAt: new Date(),
                                    },
                                    $setOnInsert: {
                                        name: trimmedName,
                                        userId,
                                        min_stock_level: 0,
                                        supplier_whatsapp: "",
                                        hsn_code: "",
                                        tax_rate: 18,
                                        track_inventory: true,
                                        item_type: "Goods",
                                        item_name: trimmedName,
                                        item_code: `ITM-${Date.now()}`,
                                        created_by: userId,
                                        primary_unit: i.unit || "kg",
                                        source: "purchase_order",
                                        createdAt: new Date(),
                                    },
                                },
                                upsert: true,
                            },
                        };
                    });

                if (ops.length > 0) {
                    await db.collection("inventory").bulkWrite(ops);
                    inventorySynced = true;

                    // Persist the flag on the PO document so the "Received"
                    // flow knows to skip addStockFromPurchase()
                    try {
                        await db.collection("purchase_orders").updateOne(
                            { _id: new ObjectId(order.id) },
                            { $set: { inventorySyncedOnCreate: true } },
                        );
                    } catch (flagErr) {
                        console.error("Failed to set inventorySyncedOnCreate flag:", flagErr);
                        // Non-fatal: stock was added, flag just didn't persist
                    }
                }
            } catch (e) {
                console.error("Inventory sync failed for PO:", e);
                // PO already saved — do not throw
                inventorySynced = false;
            }
        }

        return NextResponse.json(
            { success: true, data: order, inventorySynced },
            { status: 201 },
        );
    } catch (error: unknown) {
        console.error("Error creating purchase order:", error);
        const err = error as { statusCode?: number; details?: unknown; message?: string };
        const status = err.statusCode || 500;
        return NextResponse.json(
            { error: (error as Error).message, details: (error as { details?: unknown }).details },
            { status },
        );
    }
}
