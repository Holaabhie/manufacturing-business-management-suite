/**
 * Purchasing Infrastructure — MongoDB Repository
 * ─────────────────────────────────────────────────────────
 * Concrete implementation for Vendors and Purchase Orders.
 */

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type {
    IVendorRepository,
    IPurchaseOrderRepository,
    Vendor,
    PurchaseOrder,
    PurchaseOrderItem,
    CreateVendorDTO,
    UpdateVendorDTO,
    CreatePurchaseOrderDTO,
    PurchaseStatus,
} from "../domain/types";

// ─── Document Shapes ────────────────────────────────────────────

interface VendorDocument {
    _id: ObjectId;
    userId: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    gstin?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface PurchaseOrderDocument {
    _id: ObjectId;
    userId: string;
    poNumber: string;
    vendorId: string;
    vendorName: string;
    items: PurchaseOrderItem[];
    status: PurchaseStatus;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    notes?: string;
    orderedAt?: Date;
    receivedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Mappers ────────────────────────────────────────────────────

function toVendorEntity(doc: VendorDocument): Vendor {
    return {
        id: doc._id.toString(),
        userId: doc.userId,
        name: doc.name,
        contactPerson: doc.contactPerson,
        phone: doc.phone,
        email: doc.email,
        address: doc.address,
        gstin: doc.gstin,
        notes: doc.notes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

function toPurchaseOrderEntity(doc: PurchaseOrderDocument): PurchaseOrder {
    return {
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
        notes: doc.notes,
        orderedAt: doc.orderedAt,
        receivedAt: doc.receivedAt,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

// ─── Vendor Repository ──────────────────────────────────────────

export class MongoVendorRepository implements IVendorRepository {
    private readonly collectionName = "vendors";

    private async collection() {
        const db = await getDb();
        return db.collection<VendorDocument>(this.collectionName);
    }

    async findAll(userId: string): Promise<Vendor[]> {
        const col = await this.collection();
        const docs = await col.find({ userId }).sort({ name: 1 }).toArray();
        return docs.map(toVendorEntity);
    }

    async findById(id: string, userId: string): Promise<Vendor | null> {
        const col = await this.collection();
        let objectId: ObjectId;
        try { objectId = new ObjectId(id); } catch { return null; }
        const doc = await col.findOne({ _id: objectId, userId });
        return doc ? toVendorEntity(doc) : null;
    }

    async create(userId: string, data: CreateVendorDTO): Promise<Vendor> {
        const col = await this.collection();
        const now = new Date();
        const doc: Omit<VendorDocument, "_id"> = {
            userId,
            name: data.name,
            contactPerson: data.contactPerson,
            phone: data.phone,
            email: data.email || "",
            address: data.address || "",
            gstin: data.gstin || "",
            notes: data.notes || "",
            createdAt: now,
            updatedAt: now,
        };
        const result = await col.insertOne(doc as VendorDocument);
        const created = await col.findOne({ _id: result.insertedId });
        return toVendorEntity(created!);
    }

    async update(id: string, userId: string, data: UpdateVendorDTO): Promise<Vendor | null> {
        const col = await this.collection();
        let objectId: ObjectId;
        try { objectId = new ObjectId(id); } catch { return null; }

        const updateFields: Record<string, unknown> = { updatedAt: new Date() };
        if (data.name !== undefined) updateFields.name = data.name;
        if (data.contactPerson !== undefined) updateFields.contactPerson = data.contactPerson;
        if (data.phone !== undefined) updateFields.phone = data.phone;
        if (data.email !== undefined) updateFields.email = data.email;
        if (data.address !== undefined) updateFields.address = data.address;
        if (data.gstin !== undefined) updateFields.gstin = data.gstin;
        if (data.notes !== undefined) updateFields.notes = data.notes;

        const result = await col.findOneAndUpdate(
            { _id: objectId, userId },
            { $set: updateFields },
            { returnDocument: "after" },
        );
        return result ? toVendorEntity(result as unknown as VendorDocument) : null;
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const col = await this.collection();
        let objectId: ObjectId;
        try { objectId = new ObjectId(id); } catch { return false; }
        const result = await col.deleteOne({ _id: objectId, userId });
        return result.deletedCount === 1;
    }
}

// ─── Purchase Order Repository ──────────────────────────────────

export class MongoPurchaseOrderRepository implements IPurchaseOrderRepository {
    private readonly collectionName = "purchase_orders";

    private async collection() {
        const db = await getDb();
        return db.collection<PurchaseOrderDocument>(this.collectionName);
    }

    async getNextPoNumber(userId: string): Promise<string> {
        const col = await this.collection();
        const count = await col.countDocuments({ userId });
        const num = count + 1;
        return `PO-${String(num).padStart(4, "0")}`;
    }

    async findAll(userId: string): Promise<PurchaseOrder[]> {
        const col = await this.collection();
        const docs = await col.find({ userId }).sort({ createdAt: -1 }).toArray();
        return docs.map(toPurchaseOrderEntity);
    }

    async findById(id: string, userId: string): Promise<PurchaseOrder | null> {
        const col = await this.collection();
        let objectId: ObjectId;
        try { objectId = new ObjectId(id); } catch { return null; }
        const doc = await col.findOne({ _id: objectId, userId });
        return doc ? toPurchaseOrderEntity(doc) : null;
    }

    async create(userId: string, data: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
        const col = await this.collection();
        const now = new Date();
        const poNumber = await this.getNextPoNumber(userId);

        const items: PurchaseOrderItem[] = data.items.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            materialName: item.materialName,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
        }));

        const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
        const taxAmount = subtotal * (data.taxPercent / 100);
        const totalAmount = subtotal + taxAmount;

        const doc: Omit<PurchaseOrderDocument, "_id"> = {
            userId,
            poNumber,
            vendorId: data.vendorId,
            vendorName: data.vendorName,
            items,
            status: "Pending",
            subtotal,
            taxAmount,
            totalAmount,
            notes: data.notes || "",
            createdAt: now,
            updatedAt: now,
        };

        const result = await col.insertOne(doc as PurchaseOrderDocument);
        const created = await col.findOne({ _id: result.insertedId });
        return toPurchaseOrderEntity(created!);
    }

    async updateStatus(id: string, userId: string, status: PurchaseStatus): Promise<PurchaseOrder | null> {
        const col = await this.collection();
        let objectId: ObjectId;
        try { objectId = new ObjectId(id); } catch { return null; }

        const updateFields: Record<string, unknown> = {
            status,
            updatedAt: new Date(),
        };

        if (status === "Ordered") updateFields.orderedAt = new Date();
        if (status === "Received") updateFields.receivedAt = new Date();

        const result = await col.findOneAndUpdate(
            { _id: objectId, userId },
            { $set: updateFields },
            { returnDocument: "after" },
        );
        return result ? toPurchaseOrderEntity(result as unknown as PurchaseOrderDocument) : null;
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const col = await this.collection();
        let objectId: ObjectId;
        try { objectId = new ObjectId(id); } catch { return false; }
        const result = await col.deleteOne({ _id: objectId, userId });
        return result.deletedCount === 1;
    }
}

// ─── Singletons ─────────────────────────────────────────────────

let vendorInstance: MongoVendorRepository | null = null;
let poInstance: MongoPurchaseOrderRepository | null = null;

export function getVendorRepository(): IVendorRepository {
    if (!vendorInstance) vendorInstance = new MongoVendorRepository();
    return vendorInstance;
}

export function getPurchaseOrderRepository(): IPurchaseOrderRepository {
    if (!poInstance) poInstance = new MongoPurchaseOrderRepository();
    return poInstance;
}
