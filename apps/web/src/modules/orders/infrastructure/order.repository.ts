import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { IOrderRepository, Order, OrderItem, CreateOrderDTO, UpdateOrderDTO, LegacyDeductionItem } from "../domain/types";

function toEntity(doc: Record<string, unknown>, client?: Record<string, unknown> | null): Order {
    const totalAmount = Number(doc.total_amount || doc.grand_total || 0);
    const totalPaid = Number(doc.total_paid || 0);
    const balanceDue = Number(doc.balance_due ?? (totalAmount - totalPaid));

    return {
        id: String(doc._id),
        userId: String(doc.userId || doc.created_by || ""),
        clientId: doc.client_id ? String(doc.client_id) : (doc.customer_id ? String(doc.customer_id) : null),
        productName: String(doc.product_name || "Unknown Product"),
        quantity: Number(doc.quantity || 0),
        unit: String(doc.unit || "kg"),
        materialSource: (doc.material_source as "own" | "client") || "own",
        rate: Number(doc.rate || 0),
        totalAmount,
        totalPaid,
        balanceDue,
        deliveryDate: doc.delivery_date ? String(doc.delivery_date) : (doc.expected_delivery ? String(doc.expected_delivery) : null),
        status: (String(doc.status || doc.order_status || "pending")) as Order["status"],
        paymentStatus: (String(doc.payment_status || "pending")) as Order["paymentStatus"],
        client: client ? { name: String(client.name || ""), email: client.email as string, address: client.address as string } : null,
        // Sales order fields (defaults for legacy orders)
        orderItems: Array.isArray(doc.order_items) ? doc.order_items as OrderItem[] : [],
        subtotal: Number(doc.subtotal || 0),
        discountAmount: Number(doc.discount_amount || 0),
        taxableAmount: Number(doc.taxable_amount || 0),
        cgstAmount: Number(doc.cgst_amount || 0),
        sgstAmount: Number(doc.sgst_amount || 0),
        igstAmount: Number(doc.igst_amount || 0),
        cessAmount: Number(doc.cess_amount || 0),
        totalTax: Number(doc.total_tax || 0),
        shippingCharges: Number(doc.shipping_charges || 0),
        roundOff: Number(doc.round_off || 0),
        createdAt: (doc.createdAt || doc.created_at || new Date()) as Date,
        updatedAt: (doc.updatedAt || doc.updated_at || doc.createdAt || doc.created_at || new Date()) as Date,
        processedAt: doc.processedAt ? (doc.processedAt as Date) : (doc.processed_at ? (doc.processed_at as Date) : null),
        completedAt: doc.completedAt ? (doc.completedAt as Date) : (doc.completed_at ? (doc.completed_at as Date) : null),
    };
}

export class MongoOrderRepository implements IOrderRepository {
    private async ordersCol() { return (await getDb()).collection("orders"); }
    private async inventoryCol() { return (await getDb()).collection("inventory"); }
    private async orderItemsCol() { return (await getDb()).collection("order_inventory_items"); }

    async findById(id: string, userId: string): Promise<Order | null> {
        try {
            const col = await this.ordersCol();
            const doc = await col.findOne({ _id: new ObjectId(id), userId });
            if (!doc) return null;
            // Lookup client
            let client = null;
            if (doc.client_id) {
                try {
                    const clientDoc = await (await getDb()).collection("clients").findOne({ _id: new ObjectId(String(doc.client_id)) });
                    client = clientDoc;
                } catch { /* invalid client_id */ }
            }
            return toEntity(doc as Record<string, unknown>, client as Record<string, unknown> | null);
        } catch { return null; }
    }

    async findAll(userId: string, filters?: { clientId?: string }): Promise<Order[]> {
        const col = await this.ordersCol();
        const matchStage: any = { userId };
        
        if (filters?.clientId) {
            matchStage.$or = [
                { client_id: filters.clientId },
                { customer_id: filters.clientId }
            ];
        }

        const docs = await col.aggregate([
            { $match: matchStage },
            { $sort: { createdAt: -1 } },
            {
                $addFields: {
                    client_oid: {
                        $cond: {
                            if: { $and: [{ $ne: ["$client_id", null] }, { $ne: ["$client_id", ""] }] },
                            then: {
                                $convert: {
                                    input: "$client_id",
                                    to: "objectId",
                                    onError: null,
                                    onNull: null,
                                }
                            },
                            else: {
                                $cond: {
                                    if: { $and: [{ $ne: ["$customer_id", null] }, { $ne: ["$customer_id", ""] }] },
                                    then: {
                                        $convert: {
                                            input: "$customer_id",
                                            to: "objectId",
                                            onError: null,
                                            onNull: null,
                                        }
                                    },
                                    else: null,
                                }
                            }
                        },
                    },
                },
            },
            { $lookup: { from: "clients", localField: "client_oid", foreignField: "_id", as: "clientArr" } },
            { $addFields: { clientDoc: { $arrayElemAt: ["$clientArr", 0] } } },
        ]).toArray();

        return docs.map((d) => toEntity(d as Record<string, unknown>, (d as Record<string, unknown>).clientDoc as Record<string, unknown> | null));
    }

    async create(userId: string, data: CreateOrderDTO): Promise<Order> {
        const col = await this.ordersCol();
        const now = new Date();
        const doc = {
            userId,
            client_id: data.client_id || null,
            product_name: data.product_name,
            quantity: data.quantity,
            unit: data.unit || "kg",
            material_source: data.material_source || "own",
            rate: data.rate,
            total_amount: data.total_amount,
            delivery_date: data.delivery_date || null,
            status: data.status || "pending",
            payment_status: data.payment_status || "pending",
            createdAt: now,
            updatedAt: now,
        };
        const result = await col.insertOne(doc);
        return { ...toEntity(doc as Record<string, unknown>), id: result.insertedId.toString() };
    }

    async update(id: string, userId: string, data: UpdateOrderDTO): Promise<Order | null> {
        try {
            const col = await this.ordersCol();
            const fields: Record<string, unknown> = { updatedAt: new Date() };
            if (data.client_id !== undefined) fields.client_id = data.client_id;
            if (data.product_name !== undefined) fields.product_name = data.product_name;
            if (data.quantity !== undefined) fields.quantity = data.quantity;
            if (data.unit !== undefined) fields.unit = data.unit;
            if (data.material_source !== undefined) fields.material_source = data.material_source;
            if (data.rate !== undefined) fields.rate = data.rate;
            if (data.total_amount !== undefined) fields.total_amount = data.total_amount;
            if (data.delivery_date !== undefined) fields.delivery_date = data.delivery_date;
            if (data.status !== undefined) fields.status = data.status;
            if (data.payment_status !== undefined) fields.payment_status = data.payment_status;

            const result = await col.findOneAndUpdate(
                { _id: new ObjectId(id), userId },
                { $set: fields },
                { returnDocument: "after" },
            );
            return result ? toEntity(result as unknown as Record<string, unknown>) : null;
        } catch { return null; }
    }

    async updateStatus(id: string, userId: string, status: string): Promise<Order | null> {
        try {
            const col = await this.ordersCol();
            const now = new Date();
            const fields: Record<string, unknown> = { status, updatedAt: now };

            if (status === "processing") {
                fields.processedAt = now;
            } else if (status === "completed") {
                fields.completedAt = now;
                // Also set processedAt if it wasn't set before
                const existing = await col.findOne({ _id: new ObjectId(id), userId });
                if (existing && !existing.processedAt) {
                    fields.processedAt = now;
                }
            }

            const result = await col.findOneAndUpdate(
                { _id: new ObjectId(id), userId },
                { $set: fields },
                { returnDocument: "after" },
            );
            return result ? toEntity(result as unknown as Record<string, unknown>) : null;
        } catch { return null; }
    }

    async delete(id: string, userId: string): Promise<boolean> {
        try {
            const col = await this.ordersCol();
            const result = await col.deleteOne({ _id: new ObjectId(id), userId });
            return result.deletedCount === 1;
        } catch { return false; }
    }

    async deductInventory(userId: string, orderId: string, items: LegacyDeductionItem[]): Promise<void> {
        const invCol = await this.inventoryCol();
        const oiCol = await this.orderItemsCol();

        for (const item of items) {
            const invItem = await invCol.findOne({ _id: new ObjectId(item.inventory_id) });
            if (!invItem) continue;

            const newQty = Number(invItem.quantity) - Number(item.quantity_deducted);
            await invCol.updateOne(
                { _id: new ObjectId(item.inventory_id) },
                { $set: { quantity: newQty, updatedAt: new Date() } },
            );

            await oiCol.insertOne({
                order_id: orderId,
                inventory_id: item.inventory_id,
                quantity_deducted: Number(item.quantity_deducted),
                userId,
                createdAt: new Date(),
            });
        }
    }
}

let instance: MongoOrderRepository | null = null;
export function getOrderRepository(): IOrderRepository {
    if (!instance) instance = new MongoOrderRepository();
    return instance;
}
