import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { IPaymentRepository, Payment, CreatePaymentDTO } from "../domain/types";
import { getFinancialYear } from "@/lib/utils/financial-year";

function toEntity(doc: Record<string, unknown>, client?: Record<string, unknown> | null, order?: Record<string, unknown> | null): Payment {
    return {
        id: String(doc._id),
        userId: String(doc.userId || ""),
        amount: Number(doc.amount || 0),
        paymentDate: doc.payment_date ? new Date(doc.payment_date as string | Date).toISOString() : "",
        paymentMethod: String(doc.payment_method || ""),
        notes: String(doc.notes || ""),
        referenceId: String(doc.reference_id || doc.referenceId || ""),
        clientId: doc.client_id ? String(doc.client_id) : null,
        orderId: doc.order_id ? String(doc.order_id) : null,
        client: client ? { name: String(client.name || "") } : null,
        order: order ? { productName: String(order.product_name || order.productName || "") } : null,
        createdAt: new Date(doc.createdAt as string | Date),
        updatedAt: new Date(doc.createdAt as string | Date),
    };
}

export class MongoPaymentRepository implements IPaymentRepository {
    private async col() { return (await getDb()).collection("payments"); }

    async findById(id: string, userId: string): Promise<Payment | null> {
        const col = await this.col();
        const docs = await col.aggregate([
            { $match: { _id: new ObjectId(id), userId } },
            {
                $addFields: {
                    client_oid: {
                        $cond: {
                            if: { $and: [{ $ne: ["$client_id", null] }, { $ne: ["$client_id", ""] }] },
                            then: { $toObjectId: "$client_id" },
                            else: null
                        }
                    },
                    order_oid: {
                        $cond: {
                            if: { $and: [{ $ne: ["$order_id", null] }, { $ne: ["$order_id", ""] }] },
                            then: { $toObjectId: "$order_id" },
                            else: null
                        }
                    }
                }
            },
            { $lookup: { from: "clients", localField: "client_oid", foreignField: "_id", as: "clientArr" } },
            { $lookup: { from: "orders", localField: "order_oid", foreignField: "_id", as: "orderArr" } },
            { $addFields: { clientDoc: { $arrayElemAt: ["$clientArr", 0] } } },
            { $addFields: { orderDoc: { $arrayElemAt: ["$orderArr", 0] } } },
        ]).toArray();

        if (docs.length === 0) return null;
        const d = docs[0];
        return toEntity(d as Record<string, unknown>, (d as Record<string, unknown>).clientDoc as Record<string, unknown>, (d as Record<string, unknown>).orderDoc as Record<string, unknown>);
    }

    async findAll(userId: string): Promise<Payment[]> {
        const col = await this.col();
        const docs = await col.aggregate([
            { $match: { userId } },
            { $sort: { createdAt: -1 } },
            {
                $addFields: {
                    client_oid: {
                        $cond: {
                            if: { $and: [{ $ne: ["$client_id", null] }, { $ne: ["$client_id", ""] }] },
                            then: { $toObjectId: "$client_id" },
                            else: null
                        }
                    },
                    order_oid: {
                        $cond: {
                            if: { $and: [{ $ne: ["$order_id", null] }, { $ne: ["$order_id", ""] }] },
                            then: { $toObjectId: "$order_id" },
                            else: null
                        }
                    }
                }
            },
            { $lookup: { from: "clients", localField: "client_oid", foreignField: "_id", as: "clientArr" } },
            { $lookup: { from: "orders", localField: "order_oid", foreignField: "_id", as: "orderArr" } },
            { $addFields: { clientDoc: { $arrayElemAt: ["$clientArr", 0] } } },
            { $addFields: { orderDoc: { $arrayElemAt: ["$orderArr", 0] } } },
        ]).toArray();

        return docs.map((d) => toEntity(d as Record<string, unknown>, (d as Record<string, unknown>).clientDoc as Record<string, unknown>, (d as Record<string, unknown>).orderDoc as Record<string, unknown>));
    }

    async create(userId: string, data: CreatePaymentDTO): Promise<Payment> {
        const col = await this.col();
        const now = new Date();
        const doc = {
            userId,
            amount: data.amount,
            payment_date: data.payment_date ? new Date(data.payment_date) : now,
            payment_method: data.payment_method || "cash",
            notes: data.notes || "",
            reference_id: data.reference_id || null,
            client_id: data.client_id || null,
            order_id: data.order_id || null,
            createdAt: now,
            financial_year: getFinancialYear(data.payment_date ? new Date(data.payment_date) : now),
        };
        const result = await col.insertOne(doc);
        return { ...toEntity(doc as Record<string, unknown>), id: result.insertedId.toString() };
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const col = await this.col();
        const result = await col.deleteOne({ _id: new ObjectId(id), userId });
        return result.deletedCount === 1;
    }
}

let instance: MongoPaymentRepository | null = null;
export function getPaymentRepository(): IPaymentRepository {
    if (!instance) instance = new MongoPaymentRepository();
    return instance;
}
