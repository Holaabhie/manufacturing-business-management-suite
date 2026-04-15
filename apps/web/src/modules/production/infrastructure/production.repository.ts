import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { IProductionRepository, Production, CreateProductionDTO, UpdateProductionDTO, ActivityLogEntry, ProductionMaterial } from "../domain/types";

function toEntity(doc: Record<string, unknown>): Production {
    return {
        id: String(doc._id),
        userId: String(doc.userId || ""),
        orderId: String(doc.orderId || ""),
        orderProductName: String(doc.orderProductName || ""),
        orderQuantity: Number(doc.orderQuantity || 0),
        clientName: String(doc.clientName || ""),
        deliveryDate: doc.deliveryDate ? String(doc.deliveryDate) : null,
        batchNumber: String(doc.batchNumber || ""),
        materials: (doc.materials as ProductionMaterial[]) || [],
        machineId: String(doc.machineId || ""),
        machineName: String(doc.machineName || ""),
        operatorId: String(doc.operatorId || ""),
        operatorName: String(doc.operatorName || ""),
        expectedOutput: Number(doc.expectedOutput || 0),
        startTime: String(doc.startTime || ""),
        shift: (String(doc.shift || "morning")) as Production["shift"],
        targetCompletion: String(doc.targetCompletion || ""),
        status: (String(doc.status || "pending")) as Production["status"],
        producedQuantity: Number(doc.producedQuantity || 0),
        rejectQuantity: Number(doc.rejectQuantity || 0),
        progressPercent: Number(doc.progressPercent || 0),
        activityLog: (doc.activityLog as ActivityLogEntry[]) || [],
        notes: String(doc.notes || ""),
        createdAt: doc.createdAt as Date,
        updatedAt: doc.updatedAt as Date,
        completedAt: (doc.completedAt as Date) || null,
        createdBy: String(doc.createdBy || ""),
    };
}

export class MongoProductionRepository implements IProductionRepository {
    private async col() { return (await getDb()).collection("productions"); }

    async findById(id: string, userId: string): Promise<Production | null> {
        try {
            const c = await this.col();
            const doc = await c.findOne({ _id: new ObjectId(id), userId });
            return doc ? toEntity(doc as Record<string, unknown>) : null;
        } catch { return null; }
    }

    async findAll(userId: string): Promise<Production[]> {
        const c = await this.col();
        const docs = await c.find({ userId }).sort({ createdAt: -1 }).toArray();
        return docs.map((d) => toEntity(d as Record<string, unknown>));
    }

    async create(
        userId: string,
        data: CreateProductionDTO,
        batchNumber: string,
        createdBy: string,
        initialLog: ActivityLogEntry,
    ): Promise<Production> {
        const c = await this.col();
        const now = new Date();
        const doc = {
            userId,
            orderId: data.orderId,
            orderProductName: data.orderProductName,
            orderQuantity: data.orderQuantity,
            clientName: data.clientName,
            deliveryDate: data.deliveryDate || null,
            batchNumber,
            materials: data.materials || [],
            machineId: data.machineId || "",
            machineName: data.machineName || "",
            operatorId: data.operatorId || "",
            operatorName: data.operatorName || "",
            expectedOutput: data.expectedOutput,
            startTime: data.startTime,
            shift: data.shift || "morning",
            targetCompletion: data.targetCompletion,
            status: "pending",
            producedQuantity: 0,
            rejectQuantity: 0,
            progressPercent: 0,
            activityLog: [initialLog],
            notes: data.notes || "",
            createdAt: now,
            updatedAt: now,
            completedAt: null,
            createdBy,
        };
        const result = await c.insertOne(doc);
        return { ...toEntity(doc as Record<string, unknown>), id: result.insertedId.toString() };
    }

    async update(id: string, userId: string, data: UpdateProductionDTO): Promise<Production | null> {
        try {
            const c = await this.col();
            const fields: Record<string, unknown> = { updatedAt: new Date() };
            if (data.status !== undefined) fields.status = data.status;
            if (data.producedQuantity !== undefined) fields.producedQuantity = data.producedQuantity;
            if (data.rejectQuantity !== undefined) fields.rejectQuantity = data.rejectQuantity;
            if (data.progressPercent !== undefined) fields.progressPercent = data.progressPercent;
            if (data.notes !== undefined) fields.notes = data.notes;
            if (data.status === "completed") fields.completedAt = new Date();

            const result = await c.findOneAndUpdate(
                { _id: new ObjectId(id), userId },
                { $set: fields },
                { returnDocument: "after" },
            );
            return result ? toEntity(result as unknown as Record<string, unknown>) : null;
        } catch { return null; }
    }

    async delete(id: string, userId: string): Promise<boolean> {
        try {
            const c = await this.col();
            const result = await c.deleteOne({ _id: new ObjectId(id), userId });
            return result.deletedCount === 1;
        } catch { return false; }
    }

    async getProductionCount(userId: string): Promise<number> {
        const c = await this.col();
        return c.countDocuments({ userId });
    }

    async deductMaterials(materials: ProductionMaterial[]): Promise<void> {
        const db = await getDb();
        const invCol = db.collection("inventory");
        for (const mat of materials) {
            if (!mat.inventoryId) continue;
            const invItem = await invCol.findOne({ _id: new ObjectId(mat.inventoryId) });
            if (!invItem) continue;
            const newQty = Number(invItem.quantity) - Number(mat.quantityUsed);
            await invCol.updateOne(
                { _id: new ObjectId(mat.inventoryId) },
                { $set: { quantity: Math.max(0, newQty), updatedAt: new Date() } },
            );
        }
    }
}

let instance: MongoProductionRepository | null = null;
export function getProductionRepository(): IProductionRepository {
    if (!instance) instance = new MongoProductionRepository();
    return instance;
}
