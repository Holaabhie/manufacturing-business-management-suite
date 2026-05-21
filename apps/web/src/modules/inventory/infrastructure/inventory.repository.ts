/**
 * Inventory Infrastructure — MongoDB Repository
 * ─────────────────────────────────────────────────────────
 * Concrete implementation of IInventoryRepository using MongoDB.
 * This is the ONLY layer that knows about the database.
 */

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type {
    IInventoryRepository,
    InventoryItem,
    CreateInventoryItemDTO,
    UpdateInventoryItemDTO,
    StockLevel,
} from "../domain/types";

// ─── MongoDB Document Shape ─────────────────────────────────────
interface InventoryDocument {
    _id: ObjectId;
    userId: string;
    organizationId?: string;
    name: string;
    quantity: number;
    unit: string;
    min_stock_level: number;
    supplier_whatsapp: string;
    purchase_cost_per_unit: number;
    hsn_code?: string;
    tax_rate?: number;
    track_inventory?: boolean;
    item_type?: string;
    item_name?: string; // mapping for the Item mongoose schema just in case
    last_source_po_id?: string;
    last_source_po_number?: string;
    last_received_at?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Mapper: Document → Domain Entity ───────────────────────────
function toDomainEntity(doc: InventoryDocument): InventoryItem {
    return {
        id: doc._id.toString(),
        organizationId: "", // Will be populated when multi-tenancy is enforced
        userId: doc.userId,
        name: doc.name,
        quantity: doc.quantity,
        unit: doc.unit,
        minStockLevel: doc.min_stock_level,
        supplierWhatsapp: doc.supplier_whatsapp,
        purchaseCostPerUnit: doc.purchase_cost_per_unit,
        hsn_code: doc.hsn_code,
        tax_rate: doc.tax_rate,
        track_inventory: doc.track_inventory,
        item_type: doc.item_type || "Goods",
        lastSourcePoId: doc.last_source_po_id,
        lastSourcePoNumber: doc.last_source_po_number,
        lastReceivedAt: doc.last_received_at,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

// ─── Repository Implementation ──────────────────────────────────

export class MongoInventoryRepository implements IInventoryRepository {
    private readonly collectionName = "inventory";

    private async collection() {
        const db = await getDb();
        return db.collection<InventoryDocument>(this.collectionName);
    }

    async findById(id: string, userId: string): Promise<InventoryItem | null> {
        const col = await this.collection();
        let objectId: ObjectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            return null;
        }
        const doc = await col.findOne({ _id: objectId, userId });
        return doc ? toDomainEntity(doc) : null;
    }

    async findAll(userId: string): Promise<InventoryItem[]> {
        const col = await this.collection();
        const docs = await col.find({ userId }).sort({ name: 1 }).toArray();
        return docs.map(toDomainEntity);
    }

    async create(userId: string, data: CreateInventoryItemDTO): Promise<InventoryItem> {
        const col = await this.collection();
        const now = new Date();
        const doc: Omit<InventoryDocument, "_id"> = {
            userId,
            organizationId: userId, // Defaulting to userId until multitenancy is fully mapped
            name: data.name,
            item_name: data.name, // To satisfy Item schema
            item_code: `ITM-${Date.now()}`, // To satisfy Item schema required field
            created_by: userId,
            quantity: data.quantity,
            unit: data.unit,
            primary_unit: data.unit, // Item schema
            min_stock_level: data.minStockLevel,
            supplier_whatsapp: data.supplierWhatsapp || "",
            purchase_cost_per_unit: data.purchaseCostPerUnit,
            purchase_price: data.purchaseCostPerUnit, // Item schema
            hsn_code: data.hsn_code || "",
            tax_rate: data.tax_rate || 18,
            track_inventory: data.track_inventory ?? true,
            item_type: data.item_type || "Goods",
            createdAt: now,
            updatedAt: now,
        } as Omit<InventoryDocument, "_id">;

        const result = await col.insertOne(doc as InventoryDocument);
        const created = await col.findOne({ _id: result.insertedId });
        return toDomainEntity(created!);
    }

    async update(
        id: string,
        userId: string,
        data: UpdateInventoryItemDTO,
    ): Promise<InventoryItem | null> {
        const col = await this.collection();
        let objectId: ObjectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            return null;
        }

        // Build update object from the provided fields
        const updateFields: Record<string, unknown> = { updatedAt: new Date() };
        if (data.name !== undefined) updateFields.name = data.name;
        if (data.quantity !== undefined) updateFields.quantity = data.quantity;
        if (data.unit !== undefined) updateFields.unit = data.unit;
        if (data.minStockLevel !== undefined) updateFields.min_stock_level = data.minStockLevel;
        if (data.supplierWhatsapp !== undefined) updateFields.supplier_whatsapp = data.supplierWhatsapp;
        if (data.purchaseCostPerUnit !== undefined) {
            updateFields.purchase_cost_per_unit = data.purchaseCostPerUnit;
            updateFields.purchase_price = data.purchaseCostPerUnit;
        }
        if (data.hsn_code !== undefined) updateFields.hsn_code = data.hsn_code;
        if (data.tax_rate !== undefined) updateFields.tax_rate = data.tax_rate;
        if (data.track_inventory !== undefined) updateFields.track_inventory = data.track_inventory;
        if (data.item_type !== undefined) updateFields.item_type = data.item_type;

        const result = await col.findOneAndUpdate(
            { _id: objectId, userId },
            { $set: updateFields },
            { returnDocument: "after" },
        );

        return result ? toDomainEntity(result as unknown as InventoryDocument) : null;
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const col = await this.collection();
        let objectId: ObjectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            return false;
        }
        const result = await col.deleteOne({ _id: objectId, userId });
        return result.deletedCount === 1;
    }

    async findLowStock(userId: string): Promise<StockLevel[]> {
        const col = await this.collection();
        const docs = await col
            .find({ userId })
            .sort({ name: 1 })
            .toArray();

        return docs
            .map((doc) => ({
                itemId: doc._id.toString(),
                itemName: doc.name,
                current: doc.quantity,
                minimum: doc.min_stock_level,
                unit: doc.unit,
                isLow: doc.quantity <= doc.min_stock_level,
            }))
            .filter((s) => s.isLow);
    }

    async deductStock(
        id: string,
        userId: string,
        quantity: number,
    ): Promise<InventoryItem | null> {
        const col = await this.collection();
        let objectId: ObjectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            return null;
        }

        const result = await col.findOneAndUpdate(
            { _id: objectId, userId },
            {
                $inc: { quantity: -quantity },
                $set: { updatedAt: new Date() },
            },
            { returnDocument: "after" },
        );

        return result ? toDomainEntity(result as unknown as InventoryDocument) : null;
    }

    /**
     * Atomically add stock from a received purchase order.
     * Increments quantity and records the source PO for traceability.
     */
    async addStockFromPO(
        id: string,
        userId: string,
        quantity: number,
        poId: string,
        poNumber: string,
    ): Promise<InventoryItem | null> {
        const col = await this.collection();
        let objectId: ObjectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            return null;
        }

        const result = await col.findOneAndUpdate(
            { _id: objectId, userId },
            {
                $inc: { quantity },
                $set: {
                    updatedAt: new Date(),
                    last_source_po_id: poId,
                    last_source_po_number: poNumber,
                    last_received_at: new Date(),
                },
            },
            { returnDocument: "after" },
        );

        return result ? toDomainEntity(result as unknown as InventoryDocument) : null;
    }
}

// ─── Singleton ──────────────────────────────────────────────────
let instance: MongoInventoryRepository | null = null;

export function getInventoryRepository(): IInventoryRepository {
    if (!instance) {
        instance = new MongoInventoryRepository();
    }
    return instance;
}
