import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { IBillingRepository, Bill, CreateBillDTO, UpdateBillDTO } from "../domain/types";
import { getFinancialYear } from "@/lib/utils/financial-year";

function toEntity(doc: Record<string, unknown>): Bill {
    const rawItems = (doc.items as Record<string, unknown>[]) || [];
    // Normalize each item to ensure gstRate, unit, hsnCode are always present
    const items: Bill["items"] = rawItems.map((item) => ({
        description: String(item.description || ""),
        hsnCode: String(item.hsnCode || item.hsn || ""),
        quantity: Number(item.quantity || 0),
        unit: String(item.unit || "pcs"),
        rate: Number(item.rate || 0),
        amount: Number(item.amount || 0),
        gstRate: Number(item.gstRate || 0),
    }));
    return {
        id: String(doc._id),
        userId: String(doc.userId || ""),
        billNumber: String(doc.billNumber || ""),
        billDate: String(doc.billDate || ""),
        dueDate: String(doc.dueDate || ""),
        clientId: doc.client_id ? String(doc.client_id) : null,
        clientName: String(doc.clientName || ""),
        clientAddress: String(doc.clientAddress || ""),
        clientGSTIN: String(doc.clientGSTIN || ""),
        clientPhone: String(doc.clientPhone || ""),
        clientEmail: String(doc.clientEmail || ""),
        items,
        subtotal: Number(doc.subtotal || 0),
        cgstAmount: Number(doc.cgstAmount || 0),
        sgstAmount: Number(doc.sgstAmount || 0),
        igstAmount: Number(doc.igstAmount || 0),
        totalAmount: Number(doc.totalAmount || 0),
        amountInWords: String(doc.amountInWords || ""),
        notes: String(doc.notes || ""),
        terms: String(doc.terms || ""),
        status: (String(doc.status || "draft")) as Bill["status"],
        tallySynced: Boolean(doc.tallySynced || false),
        tallyVoucherNumber: doc.tallyVoucherNumber ? String(doc.tallyVoucherNumber) : undefined,
        tallySyncedAt: doc.tallySyncedAt ? String(doc.tallySyncedAt) : undefined,
        createdAt: String(doc.created_at || doc.createdAt || ""),
        updatedAt: String(doc.updated_at || doc.updatedAt || ""),
    };
}

export class MongoBillingRepository implements IBillingRepository {
    private async col() { return (await getDb()).collection("bills"); }

    async findById(id: string, userId: string): Promise<Bill | null> {
        try {
            const c = await this.col();
            const doc = await c.findOne({ _id: new ObjectId(id), userId });
            return doc ? toEntity(doc as Record<string, unknown>) : null;
        } catch { return null; }
    }

    async findAll(userId: string): Promise<Bill[]> {
        const c = await this.col();
        const docs = await c.find({ userId }).sort({ created_at: -1 }).toArray();
        return docs.map((d) => toEntity(d as Record<string, unknown>));
    }

    async findByBillNumber(userId: string, billNumber: string): Promise<Bill | null> {
        const c = await this.col();
        const doc = await c.findOne({ userId, billNumber });
        return doc ? toEntity(doc as Record<string, unknown>) : null;
    }

    async countByBillNumberPrefix(userId: string, prefix: string): Promise<number> {
        const c = await this.col();
        return c.countDocuments({ userId, billNumber: { $regex: `^${prefix}` } });
    }

    async create(userId: string, data: CreateBillDTO): Promise<Bill> {
        const c = await this.col();
        const now = new Date().toISOString();
        const doc = {
            userId,
            billNumber: data.billNumber,
            billDate: data.billDate,
            dueDate: data.dueDate,
            client_id: data.client_id || null,
            clientName: data.clientName,
            clientAddress: data.clientAddress || "",
            clientGSTIN: data.clientGSTIN || "",
            clientPhone: data.clientPhone || "",
            clientEmail: data.clientEmail || "",
            items: data.items || [],
            subtotal: data.subtotal || 0,
            cgstAmount: data.cgstAmount || 0,
            sgstAmount: data.sgstAmount || 0,
            igstAmount: data.igstAmount || 0,
            totalAmount: data.totalAmount || 0,
            amountInWords: data.amountInWords || "",
            notes: data.notes || "",
            terms: data.terms || "",
            status: data.status || "draft",
            created_at: now,
            updated_at: now,
            financial_year: getFinancialYear(data.billDate || now),
        };
        const result = await c.insertOne(doc);
        return { ...toEntity(doc as Record<string, unknown>), id: result.insertedId.toString() };
    }

    async update(id: string, userId: string, data: UpdateBillDTO): Promise<Bill | null> {
        try {
            const c = await this.col();
            const fields: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (data.billDate !== undefined) fields.billDate = data.billDate;
            if (data.dueDate !== undefined) fields.dueDate = data.dueDate;
            if (data.clientName !== undefined) fields.clientName = data.clientName;
            if (data.clientAddress !== undefined) fields.clientAddress = data.clientAddress;
            if (data.items !== undefined) fields.items = data.items;
            if (data.subtotal !== undefined) fields.subtotal = data.subtotal;
            if (data.totalAmount !== undefined) fields.totalAmount = data.totalAmount;
            if (data.notes !== undefined) fields.notes = data.notes;
            if (data.terms !== undefined) fields.terms = data.terms;
            if (data.status !== undefined) fields.status = data.status;
            if (data.tallySynced !== undefined) fields.tallySynced = data.tallySynced;
            if (data.tallyVoucherNumber !== undefined) fields.tallyVoucherNumber = data.tallyVoucherNumber;
            if (data.tallySyncedAt !== undefined) fields.tallySyncedAt = data.tallySyncedAt;

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
}

let instance: MongoBillingRepository | null = null;
export function getBillingRepository(): IBillingRepository {
    if (!instance) instance = new MongoBillingRepository();
    return instance;
}
