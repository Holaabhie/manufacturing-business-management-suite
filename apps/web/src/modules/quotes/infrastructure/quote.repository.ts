import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { IQuoteRepository, Quotation, QuoteItem, CreateQuoteDTO, UpdateQuoteDTO, QuoteStatus } from "../domain/types";
import { getFinancialYear } from "@/lib/utils/financial-year";

function isQuoteExpired(validUntil: string, rawStatus: string): boolean {
    if (rawStatus !== "Sent") return false;
    if (!validUntil) return false;

    try {
        const todayStr = new Date().toISOString().split("T")[0];
        const validUntilDateStr = validUntil.includes("T") ? validUntil.split("T")[0] : validUntil;
        return validUntilDateStr < todayStr;
    } catch {
        return false;
    }
}

function toEntity(doc: Record<string, unknown>): Quotation {
    const rawItems = (doc.items as Record<string, unknown>[]) || [];
    const items: QuoteItem[] = rawItems.map((item) => ({
        item_id: item.item_id ? String(item.item_id) : undefined,
        description: String(item.description || ""),
        hsn_sac: String(item.hsn_sac || item.hsnCode || item.hsn || ""),
        qty: Number(item.qty || item.quantity || 0),
        unit: String(item.unit || "pcs"),
        rate: Number(item.rate || 0),
        discount: Number(item.discount || 0),
        gst_rate: Number(item.gst_rate ?? item.gstRate ?? 0),
        cgst: Number(item.cgst || 0),
        sgst: Number(item.sgst || 0),
        igst: Number(item.igst || 0),
        line_total: Number(item.line_total || item.amount || 0),
    }));

    const rawCustomer = (doc.customer as Record<string, unknown>) || {};
    const clientName = String(doc.clientName || rawCustomer.name || "");
    const clientId = doc.clientId ? String(doc.clientId) : (doc.client_id ? String(doc.client_id) : (rawCustomer.id ? String(rawCustomer.id) : null));
    const clientAddress = String(doc.clientAddress || rawCustomer.address || "");
    const clientGSTIN = String(doc.clientGSTIN || rawCustomer.gstin || "");
    const clientPhone = String(doc.clientPhone || rawCustomer.phone || "");
    const clientEmail = String(doc.clientEmail || rawCustomer.email || "");

    const customer = {
        id: clientId,
        name: clientName,
        address: clientAddress,
        gstin: clientGSTIN,
        phone: clientPhone,
        email: clientEmail,
    };

    const validUntil = String(doc.valid_until || doc.validUntil || "");
    const rawStatus = String(doc.status || "Draft") as QuoteStatus;
    const computedStatus: QuoteStatus = isQuoteExpired(validUntil, rawStatus) ? "Expired" : rawStatus;

    return {
        id: String(doc._id),
        userId: String(doc.userId || ""),
        quotation_number: String(doc.quotation_number || doc.quotationNumber || ""),
        quotation_date: String(doc.quotation_date || doc.quotationDate || ""),
        valid_until: validUntil,
        customer,
        clientId,
        clientName,
        clientAddress,
        clientGSTIN,
        clientPhone,
        clientEmail,
        items,
        subtotal: Number(doc.subtotal || 0),
        total_discount: Number(doc.total_discount ?? doc.totalDiscount ?? 0),
        total_tax: Number(doc.total_tax ?? doc.totalTax ?? 0),
        grand_total: Number(doc.grand_total ?? doc.grandTotal ?? doc.totalAmount ?? 0),
        cgst_amount: Number(doc.cgst_amount ?? doc.cgstAmount ?? 0),
        sgst_amount: Number(doc.sgst_amount ?? doc.sgstAmount ?? 0),
        igst_amount: Number(doc.igst_amount ?? doc.igstAmount ?? 0),
        is_igst: Boolean(doc.is_igst ?? doc.isIGST ?? false),
        terms: String(doc.terms || ""),
        notes: String(doc.notes || ""),
        status: computedStatus,
        converted_order_id: doc.converted_order_id ? String(doc.converted_order_id) : null,
        converted_lines: Array.isArray(doc.converted_lines)
            ? (doc.converted_lines as Record<string, unknown>[]).map((cl) => ({
                line_index: Number(cl.line_index),
                order_id: cl.order_id ? String(cl.order_id) : null,
                converted_at: cl.converted_at ? (cl.converted_at instanceof Date ? cl.converted_at.toISOString() : String(cl.converted_at)) : new Date().toISOString(),
            }))
            : [],
        created_by: String(doc.created_by || doc.createdBy || ""),
        createdAt: String(doc.created_at || doc.createdAt || ""),
        updatedAt: String(doc.updated_at || doc.updatedAt || ""),
    };
}

export class MongoQuoteRepository implements IQuoteRepository {
    private async col() {
        return (await getDb()).collection("quotations");
    }

    async findById(id: string, userId: string): Promise<Quotation | null> {
        try {
            const c = await this.col();
            const doc = await c.findOne({ _id: new ObjectId(id), userId });
            return doc ? toEntity(doc as Record<string, unknown>) : null;
        } catch {
            return null;
        }
    }

    async findAll(userId: string): Promise<Quotation[]> {
        const c = await this.col();
        const docs = await c.find({ userId }).sort({ created_at: -1 }).toArray();
        return docs.map((d) => toEntity(d as Record<string, unknown>));
    }

    async findByNumber(userId: string, quotationNumber: string): Promise<Quotation | null> {
        const c = await this.col();
        const doc = await c.findOne({ userId, quotation_number: quotationNumber });
        return doc ? toEntity(doc as Record<string, unknown>) : null;
    }

    async create(userId: string, createdBy: string, data: CreateQuoteDTO): Promise<Quotation> {
        const c = await this.col();
        const now = new Date().toISOString();

        const clientName = data.clientName || data.customer?.name || "";
        const clientId = data.clientId || data.customer?.id || null;
        const clientAddress = data.clientAddress || data.customer?.address || "";
        const clientGSTIN = data.clientGSTIN || data.customer?.gstin || "";
        const clientPhone = data.clientPhone || data.customer?.phone || "";
        const clientEmail = data.clientEmail || data.customer?.email || "";

        const customer = {
            id: clientId,
            name: clientName,
            address: clientAddress,
            gstin: clientGSTIN,
            phone: clientPhone,
            email: clientEmail,
        };

        const doc = {
            userId,
            quotation_number: data.quotation_number,
            quotation_date: data.quotation_date,
            valid_until: data.valid_until,
            customer,
            clientId,
            client_id: clientId,
            clientName,
            clientAddress,
            clientGSTIN,
            clientPhone,
            clientEmail,
            items: data.items || [],
            subtotal: data.subtotal || 0,
            total_discount: data.total_discount || 0,
            total_tax: data.total_tax || 0,
            grand_total: data.grand_total || 0,
            cgst_amount: data.cgst_amount || 0,
            sgst_amount: data.sgst_amount || 0,
            igst_amount: data.igst_amount || 0,
            is_igst: Boolean(data.is_igst),
            terms: data.terms || "",
            notes: data.notes || "",
            status: data.status || "Draft",
            converted_order_id: data.converted_order_id || null,
            converted_lines: data.converted_lines || [],
            created_by: createdBy,
            created_at: now,
            updated_at: now,
            financial_year: getFinancialYear(data.quotation_date || now),
        };

        const result = await c.insertOne(doc);
        return {
            ...toEntity(doc as Record<string, unknown>),
            id: result.insertedId.toString(),
        };
    }

    async update(id: string, userId: string, data: UpdateQuoteDTO): Promise<Quotation | null> {
        try {
            const c = await this.col();
            const fields: Record<string, unknown> = { updated_at: new Date().toISOString() };

            if (data.quotation_date !== undefined) fields.quotation_date = data.quotation_date;
            if (data.valid_until !== undefined) fields.valid_until = data.valid_until;
            if (data.customer !== undefined) fields.customer = data.customer;
            if (data.clientId !== undefined) {
                fields.clientId = data.clientId;
                fields.client_id = data.clientId;
            }
            if (data.clientName !== undefined) fields.clientName = data.clientName;
            if (data.clientAddress !== undefined) fields.clientAddress = data.clientAddress;
            if (data.clientGSTIN !== undefined) fields.clientGSTIN = data.clientGSTIN;
            if (data.clientPhone !== undefined) fields.clientPhone = data.clientPhone;
            if (data.clientEmail !== undefined) fields.clientEmail = data.clientEmail;
            if (data.items !== undefined) fields.items = data.items;
            if (data.subtotal !== undefined) fields.subtotal = data.subtotal;
            if (data.total_discount !== undefined) fields.total_discount = data.total_discount;
            if (data.total_tax !== undefined) fields.total_tax = data.total_tax;
            if (data.grand_total !== undefined) fields.grand_total = data.grand_total;
            if (data.cgst_amount !== undefined) fields.cgst_amount = data.cgst_amount;
            if (data.sgst_amount !== undefined) fields.sgst_amount = data.sgst_amount;
            if (data.igst_amount !== undefined) fields.igst_amount = data.igst_amount;
            if (data.is_igst !== undefined) fields.is_igst = data.is_igst;
            if (data.terms !== undefined) fields.terms = data.terms;
            if (data.notes !== undefined) fields.notes = data.notes;
            if (data.status !== undefined) fields.status = data.status;
            if (data.converted_order_id !== undefined) fields.converted_order_id = data.converted_order_id;
            if (data.converted_lines !== undefined) fields.converted_lines = data.converted_lines;

            const result = await c.findOneAndUpdate(
                { _id: new ObjectId(id), userId },
                { $set: fields },
                { returnDocument: "after" }
            );

            return result ? toEntity(result as unknown as Record<string, unknown>) : null;
        } catch {
            return null;
        }
    }

    async delete(id: string, userId: string): Promise<boolean> {
        try {
            const c = await this.col();
            const result = await c.deleteOne({ _id: new ObjectId(id), userId });
            return result.deletedCount === 1;
        } catch {
            return false;
        }
    }

    async claimLine(quoteId: string, ownerId: string, lineIndex: number): Promise<Quotation | null> {
        try {
            const c = await this.col();
            const todayStr = new Date().toISOString().split("T")[0];
            const filter = {
                _id: new ObjectId(quoteId),
                userId: ownerId,
                $or: [
                    { status: "Accepted" },
                    { status: "Sent", valid_until: { $gte: todayStr } }
                ],
                "converted_lines.line_index": { $ne: lineIndex },
                [`items.${lineIndex}`]: { $exists: true }
            };

            const result = await c.findOneAndUpdate(
                filter,
                {
                    $push: {
                        converted_lines: {
                            line_index: lineIndex,
                            order_id: null,
                            converted_at: new Date()
                        }
                    } as any,
                    $set: { updated_at: new Date().toISOString() }
                },
                { returnDocument: "after" }
            );

            return result ? toEntity(result as unknown as Record<string, unknown>) : null;
        } catch {
            return null;
        }
    }

    async attachOrder(quoteId: string, ownerId: string, lineIndex: number, orderId: string): Promise<{ quote: Quotation; statusChangedToAccepted: boolean } | null> {
        try {
            const c = await this.col();
            const existing = await c.findOne({ _id: new ObjectId(quoteId), userId: ownerId });
            if (!existing) return null;

            const isSent = existing.status === "Sent";
            const setFields: Record<string, unknown> = {
                "converted_lines.$[elem].order_id": orderId,
                updated_at: new Date().toISOString(),
            };
            if (isSent) {
                setFields.status = "Accepted";
            }

            const result = await c.findOneAndUpdate(
                { _id: new ObjectId(quoteId), userId: ownerId },
                { $set: setFields },
                {
                    arrayFilters: [{ "elem.line_index": lineIndex }],
                    returnDocument: "after"
                }
            );

            return result ? { quote: toEntity(result as unknown as Record<string, unknown>), statusChangedToAccepted: isSent } : null;
        } catch {
            return null;
        }
    }

    async releaseClaim(quoteId: string, ownerId: string, lineIndex: number): Promise<boolean> {
        try {
            const c = await this.col();
            const result = await c.updateOne(
                { _id: new ObjectId(quoteId), userId: ownerId },
                {
                    $pull: {
                        converted_lines: { line_index: lineIndex, order_id: null }
                    } as any,
                    $set: { updated_at: new Date().toISOString() }
                }
            );
            return result.modifiedCount > 0;
        } catch {
            return false;
        }
    }
}

let instance: MongoQuoteRepository | null = null;
export function getQuoteRepository(): IQuoteRepository {
    if (!instance) instance = new MongoQuoteRepository();
    return instance;
}
