import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type {
    IDeliveryChallanRepository,
    DeliveryChallan,
    ChallanStatus,
    ConsigneeSnapshot,
} from "../domain/types";
import {
    createDeliveryChallanSchema,
    updateDeliveryChallanSchema,
} from "../domain/schemas";
import {
    NotFoundError,
    ValidationError,
    ConflictError,
    type FieldError,
} from "@/shared/lib/errors";
import { generateSequentialChallanNumber } from "../infrastructure/delivery-challan-sequence";
import { getCurrentFinancialYear } from "@/lib/invoice/utils";

function getTodayIST(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export interface ChallanWithWarnings extends DeliveryChallan {
    warnings?: string[];
}

export interface OrderChallanSummary {
    order_id: string;
    order_number: string;
    product_name: string;
    order_qty: number;
    order_quantity?: number;
    unit: string;
    client_id: string | null;
    client: Record<string, unknown> | null;
    dispatched_qty: number;
    remaining_qty: number;
    total_challans?: number;
    warnings: string[];
}

export class DeliveryChallanService {
    constructor(private readonly repo: IDeliveryChallanRepository) {}

    private async verifyClientTenant(client_id: string, tenantId: string): Promise<Record<string, unknown>> {
        const db = await getDb();
        const idFilter = ObjectId.isValid(client_id)
            ? { $in: [client_id, new ObjectId(client_id)] }
            : client_id;

        const client = await db.collection("clients").findOne({
            _id: idFilter as any,
            $or: [
                { organizationId: tenantId },
                { userId: tenantId },
                { tenantId: tenantId },
            ],
        });
        if (!client) {
            throw new NotFoundError("Client", client_id);
        }
        return client;
    }

    private async verifyOrderTenant(order_id: string, tenantId: string): Promise<Record<string, unknown>> {
        const db = await getDb();
        const idFilter = ObjectId.isValid(order_id)
            ? { $in: [order_id, new ObjectId(order_id)] }
            : order_id;

        const order = await db.collection("orders").findOne({
            _id: idFilter as any,
            $or: [
                { organizationId: tenantId },
                { userId: tenantId },
                { tenantId: tenantId },
            ],
        });
        if (!order) {
            throw new NotFoundError("Order", order_id);
        }
        return order;
    }

    async findAll(userId: string): Promise<DeliveryChallan[]> {
        return this.repo.findAll(userId);
    }

    async findById(id: string, userId: string): Promise<DeliveryChallan> {
        const challan = await this.repo.findById(id, userId);
        if (!challan) throw new NotFoundError("DeliveryChallan", id);
        return challan;
    }

    async create(userId: string, createdBy: string, input: unknown): Promise<ChallanWithWarnings> {
        const parsed = createDeliveryChallanSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."),
                message: i.message,
            }));
            throw new ValidationError(errs);
        }

        const data = parsed.data;

        // Verify client belongs to tenant if client_id provided
        let clientDoc: Record<string, unknown> | null = null;
        if (data.client_id) {
            clientDoc = await this.verifyClientTenant(data.client_id, userId);
        }

        // Verify order belongs to tenant if order_id provided
        let orderDoc: Record<string, unknown> | null = null;
        if (data.order_id) {
            orderDoc = await this.verifyOrderTenant(data.order_id, userId);
        }

        // Enforce ≥1 item if Dispatched
        if (data.status === "Dispatched" && (!data.items || data.items.length === 0)) {
            throw new ValidationError([{ field: "items", message: "Cannot dispatch a delivery challan with no items." }]);
        }

        // Build consignee snapshot
        const consignee: ConsigneeSnapshot = data.consignee && data.consignee.name
            ? data.consignee
            : clientDoc
            ? {
                name: String(clientDoc.name || clientDoc.company || "Client"),
                address: String(clientDoc.address || ""),
                phone: String(clientDoc.phone || ""),
                gstin: String(clientDoc.gstin || ""),
            }
            : {
                name: "Direct Consignee",
                address: "",
                phone: "",
                gstin: "",
            };

        // Generate race-safe sequential challan number if not provided
        let challanNumber = data.challan_number;
        const fy = getCurrentFinancialYear(data.challan_date ? new Date(data.challan_date) : undefined);
        if (!challanNumber) {
            challanNumber = await generateSequentialChallanNumber(userId, data.challan_date ? new Date(data.challan_date) : undefined);
        }

        // Check for duplicate number within tenant
        const existing = await this.repo.findByNumber(userId, challanNumber);
        if (existing) {
            challanNumber = await generateSequentialChallanNumber(userId, data.challan_date ? new Date(data.challan_date) : undefined);
        }

        // If status is Dispatched, dispatch_date defaults to today in IST
        let dispatch_date = data.dispatch_date ?? null;
        if (data.status === "Dispatched" && !dispatch_date) {
            dispatch_date = getTodayIST();
        }

        // If status is Delivered, delivered_date defaults to today in IST
        let delivered_date = data.delivered_date ?? null;
        if (data.status === "Delivered" && !delivered_date) {
            delivered_date = getTodayIST();
        }

        const challanData = {
            ...data,
            consignee,
            dispatch_date,
            delivered_date,
            ship_to_address: data.ship_to_address || consignee.address || "",
        };

        const created = await this.repo.create(userId, createdBy, challanData, challanNumber, fy);

        // Check for over-dispatch warning if linked to order
        const warnings: string[] = [];
        if (data.order_id && orderDoc) {
            const orderQty = Number(orderDoc.quantity || 0);
            const otherChallans = await this.repo.findByOrderId(userId, data.order_id);
            const alreadyDispatched = otherChallans
                .filter((c) => c.id !== created.id && c.status !== "Cancelled")
                .reduce((sum, c) => sum + c.items.reduce((s, it) => s + it.qty, 0), 0);
            const thisChallanQty = created.items.reduce((s, it) => s + it.qty, 0);
            const totalDispatched = alreadyDispatched + thisChallanQty;

            if (totalDispatched > orderQty) {
                warnings.push(
                    `Total dispatched quantity (${totalDispatched}) exceeds order quantity (${orderQty})`
                );
            }
        }

        return {
            ...created,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }

    async update(id: string, userId: string, input: unknown): Promise<ChallanWithWarnings> {
        const parsed = updateDeliveryChallanSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."),
                message: i.message,
            }));
            throw new ValidationError(errs);
        }

        const existing = await this.repo.findById(id, userId);
        if (!existing) throw new NotFoundError("DeliveryChallan", id);

        const currentStatus = existing.status;

        // Edit lock rules:
        // Draft: all fields allowed
        // Dispatched: only transport details, expected delivery date, notes allowed
        // Delivered, Returned, Cancelled: locked -> 409 Conflict
        if (currentStatus === "Delivered" || currentStatus === "Returned" || currentStatus === "Cancelled") {
            throw new ConflictError(
                `Cannot edit delivery challan in '${currentStatus}' status. Only Draft and Dispatched challans can be edited.`
            );
        }

        if (currentStatus === "Dispatched") {
            const allowedInDispatched = new Set([
                "transporter_name",
                "vehicle_no",
                "lr_number",
                "eway_bill_no",
                "expected_delivery_date",
                "notes",
            ]);
            const attemptedKeys = Object.keys(parsed.data).filter(
                (k) => (parsed.data as Record<string, unknown>)[k] !== undefined
            );
            const forbiddenKeys = attemptedKeys.filter((k) => !allowedInDispatched.has(k));
            if (forbiddenKeys.length > 0) {
                throw new ConflictError(
                    `Cannot modify ${forbiddenKeys.join(", ")} on a Dispatched delivery challan. Only transporter_name, vehicle_no, lr_number, eway_bill_no, expected_delivery_date, and notes can be edited.`
                );
            }
        }

        // Verify foreign keys if provided
        if (parsed.data.client_id) {
            await this.verifyClientTenant(parsed.data.client_id, userId);
        }
        let orderDoc: Record<string, unknown> | null = null;
        if (parsed.data.order_id) {
            orderDoc = await this.verifyOrderTenant(parsed.data.order_id, userId);
        } else if (existing.order_id) {
            try {
                orderDoc = await this.verifyOrderTenant(existing.order_id, userId);
            } catch {
                orderDoc = null;
            }
        }

        const updated = await this.repo.update(id, userId, parsed.data);
        if (!updated) throw new NotFoundError("DeliveryChallan", id);

        // Check over-dispatch warning if order linked
        const warnings: string[] = [];
        const orderId = updated.order_id;
        if (orderId && orderDoc) {
            const orderQty = Number(orderDoc.quantity || 0);
            const otherChallans = await this.repo.findByOrderId(userId, orderId);
            const alreadyDispatched = otherChallans
                .filter((c) => c.id !== updated.id && c.status !== "Cancelled")
                .reduce((sum, c) => sum + c.items.reduce((s, it) => s + it.qty, 0), 0);
            const thisChallanQty = updated.items.reduce((s, it) => s + it.qty, 0);
            const totalDispatched = alreadyDispatched + thisChallanQty;

            if (totalDispatched > orderQty) {
                warnings.push(
                    `Total dispatched quantity (${totalDispatched}) exceeds order quantity (${orderQty})`
                );
            }
        }

        return {
            ...updated,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }

    /**
     * State machine:
     * Draft -> Dispatched | Cancelled
     * Dispatched -> Delivered | Returned | Cancelled
     * Delivered -> Returned
     * Returned, Cancelled -> Terminal (no transitions)
     */
    async updateStatus(id: string, userId: string, newStatus: ChallanStatus): Promise<DeliveryChallan> {
        const challan = await this.repo.findById(id, userId);
        if (!challan) throw new NotFoundError("DeliveryChallan", id);

        const currentStatus = challan.status;

        if (currentStatus === newStatus) {
            return challan;
        }

        const validTransitions: Record<ChallanStatus, ChallanStatus[]> = {
            Draft: ["Dispatched", "Cancelled"],
            Dispatched: ["Delivered", "Returned", "Cancelled"],
            Delivered: ["Returned"],
            Returned: [],
            Cancelled: [],
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(newStatus)) {
            throw new ValidationError([
                {
                    field: "status",
                    message: `Cannot transition delivery challan from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowed.length > 0 ? allowed.join(", ") : "None (terminal status)"}.`,
                },
            ]);
        }

        const extraUpdates: Record<string, unknown> = {};

        if (newStatus === "Dispatched") {
            // Setting Dispatched requires >=1 item
            if (!challan.items || challan.items.length === 0) {
                throw new ValidationError([
                    {
                        field: "items",
                        message: "Cannot dispatch a delivery challan with no items.",
                    },
                ]);
            }
            if (!challan.dispatch_date) {
                extraUpdates.dispatch_date = getTodayIST();
            }
        }

        if (newStatus === "Delivered") {
            if (!challan.delivered_date) {
                extraUpdates.delivered_date = getTodayIST();
            }
        }

        const updated = await this.repo.updateStatus(id, userId, newStatus, extraUpdates);
        if (!updated) throw new NotFoundError("DeliveryChallan", id);
        return updated;
    }

    async duplicate(id: string, userId: string, createdBy: string): Promise<DeliveryChallan> {
        const original = await this.repo.findById(id, userId);
        if (!original) throw new NotFoundError("DeliveryChallan", id);

        const todayIST = getTodayIST();
        const fy = getCurrentFinancialYear(new Date(todayIST));
        const newNumber = await generateSequentialChallanNumber(userId, new Date(todayIST));

        const duplicateData = {
            challan_date: todayIST,
            purpose: original.purpose,
            status: "Draft" as ChallanStatus,
            client_id: original.client_id,
            consignee: { ...original.consignee },
            ship_to_address: original.ship_to_address,
            order_id: original.order_id,
            items: original.items.map((it) => ({ ...it })),
            transporter_name: "",
            vehicle_no: "",
            lr_number: "",
            eway_bill_no: "",
            dispatch_date: null,
            expected_delivery_date: null,
            delivered_date: null,
            notes: original.notes,
        };

        return this.repo.create(userId, createdBy, duplicateData, newNumber, fy);
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const challan = await this.repo.findById(id, userId);
        if (!challan) throw new NotFoundError("DeliveryChallan", id);

        // Delete allowed only for Draft or Cancelled
        if (challan.status !== "Draft" && challan.status !== "Cancelled") {
            throw new ConflictError(
                `Cannot delete delivery challan in '${challan.status}' status. Only Draft or Cancelled delivery challans can be deleted.`
            );
        }

        return this.repo.delete(id, userId);
    }

    async getOrderSummary(userId: string, orderId: string): Promise<OrderChallanSummary> {
        const order = await this.verifyOrderTenant(orderId, userId);

        const orderQty = Number(order.quantity || 0);
        const orderNumber = String(order.order_number || order.orderId || order._id || "");
        const productName = String(order.product_name || order.productName || "Product");
        const unit = String(order.unit || "pcs");
        const clientId = order.client_id ? String(order.client_id) : (order.clientId ? String(order.clientId) : null);

        // Active challans counting toward dispatched: Draft, Dispatched, Delivered (Cancelled and Returned are excluded)
        const challans = await this.repo.findByOrderId(userId, orderId);
        const activeChallans = challans.filter(
            (c) => c.status !== "Cancelled" && c.status !== "Returned"
        );

        // Dispatched quantity is sum of qty of active challans (goods still with customer / in transit)
        const dispatchedQty = activeChallans.reduce((total, c) => {
            return (
                total +
                c.items.reduce((itemTotal, it) => {
                    // Match by product name if applicable, or sum all items for single-product order
                    return itemTotal + (it.qty || 0);
                }, 0)
            );
        }, 0);

        const remainingQty = Math.max(0, orderQty - dispatchedQty);
        const warnings: string[] = [];

        if (dispatchedQty > orderQty) {
            warnings.push(
                `Total dispatched quantity (${dispatchedQty}) exceeds order quantity (${orderQty})`
            );
        }

        return {
            order_id: String(order._id || order.id),
            order_number: orderNumber,
            product_name: productName,
            order_qty: orderQty,
            order_quantity: orderQty,
            unit,
            client_id: clientId,
            client: (order.clients as Record<string, unknown>) || null,
            dispatched_qty: dispatchedQty,
            remaining_qty: remainingQty,
            total_challans: challans.length,
            warnings,
        };
    }
}
