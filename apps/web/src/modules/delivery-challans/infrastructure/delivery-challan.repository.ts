import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type {
    IDeliveryChallanRepository,
    DeliveryChallan,
    ChallanItem,
    ChallanStatus,
    ChallanPurpose,
    CreateDeliveryChallanDTO,
    UpdateDeliveryChallanDTO,
} from "../domain/types";

function toEntity(doc: Record<string, unknown>): DeliveryChallan {
    const rawItems = (doc.items as Record<string, unknown>[]) || [];
    const items: ChallanItem[] = rawItems.map((item) => ({
        description: String(item.description || ""),
        qty: Number(item.qty || 0),
        unit: String(item.unit || "pcs"),
        remarks: item.remarks ? String(item.remarks) : "",
    }));

    const rawConsignee = (doc.consignee as Record<string, unknown>) || {};
    const consignee = {
        name: String(rawConsignee.name || ""),
        address: String(rawConsignee.address || ""),
        phone: String(rawConsignee.phone || ""),
        gstin: String(rawConsignee.gstin || ""),
    };

    const shipTo = doc.ship_to_address ? String(doc.ship_to_address) : consignee.address;

    return {
        id: String(doc._id),
        userId: String(doc.userId || ""),
        challan_number: String(doc.challan_number || ""),
        challan_date: String(doc.challan_date || ""),
        purpose: (String(doc.purpose || "Sale")) as ChallanPurpose,
        status: (String(doc.status || "Draft")) as ChallanStatus,
        client_id: doc.client_id ? String(doc.client_id) : null,
        consignee,
        ship_to_address: shipTo,
        order_id: doc.order_id ? String(doc.order_id) : null,
        items,
        transporter_name: String(doc.transporter_name || ""),
        vehicle_no: String(doc.vehicle_no || ""),
        lr_number: String(doc.lr_number || ""),
        eway_bill_no: String(doc.eway_bill_no || ""),
        dispatch_date: doc.dispatch_date ? String(doc.dispatch_date) : null,
        expected_delivery_date: doc.expected_delivery_date ? String(doc.expected_delivery_date) : null,
        delivered_date: doc.delivered_date ? String(doc.delivered_date) : null,
        notes: String(doc.notes || ""),
        created_by: String(doc.created_by || ""),
        created_at: doc.created_at instanceof Date ? doc.created_at.toISOString() : String(doc.created_at || ""),
        updated_at: doc.updated_at instanceof Date ? doc.updated_at.toISOString() : String(doc.updated_at || ""),
        financial_year: String(doc.financial_year || ""),
    };
}

export class MongoDeliveryChallanRepository implements IDeliveryChallanRepository {
    private async col() {
        return (await getDb()).collection("delivery_challans");
    }

    async findAll(userId: string): Promise<DeliveryChallan[]> {
        const col = await this.col();
        const docs = await col
            .find({ userId })
            .sort({ created_at: -1 })
            .toArray();
        return docs.map(toEntity);
    }

    async findById(id: string, userId: string): Promise<DeliveryChallan | null> {
        const col = await this.col();
        let query: Record<string, unknown> = { userId };
        if (ObjectId.isValid(id)) {
            query._id = new ObjectId(id);
        } else {
            query.id = id;
        }

        const doc = await col.findOne(query);
        if (!doc) return null;
        return toEntity(doc);
    }

    async findByNumber(userId: string, challanNumber: string): Promise<DeliveryChallan | null> {
        const col = await this.col();
        const doc = await col.findOne({ userId, challan_number: challanNumber });
        if (!doc) return null;
        return toEntity(doc);
    }

    async findByOrderId(userId: string, orderId: string): Promise<DeliveryChallan[]> {
        const col = await this.col();
        const docs = await col
            .find({ userId, order_id: orderId })
            .sort({ created_at: -1 })
            .toArray();
        return docs.map(toEntity);
    }

    async create(
        userId: string,
        createdBy: string,
        data: CreateDeliveryChallanDTO,
        challanNumber: string,
        fy: string
    ): Promise<DeliveryChallan> {
        const col = await this.col();
        const now = new Date();

        const doc = {
            userId,
            challan_number: challanNumber,
            challan_date: data.challan_date,
            purpose: data.purpose || "Sale",
            status: data.status || "Draft",
            client_id: data.client_id || null,
            consignee: data.consignee,
            ship_to_address: data.ship_to_address || data.consignee.address || "",
            order_id: data.order_id || null,
            items: data.items,
            transporter_name: data.transporter_name || "",
            vehicle_no: data.vehicle_no || "",
            lr_number: data.lr_number || "",
            eway_bill_no: data.eway_bill_no || "",
            dispatch_date: data.dispatch_date || null,
            expected_delivery_date: data.expected_delivery_date || null,
            delivered_date: data.delivered_date || null,
            notes: data.notes || "",
            created_by: createdBy,
            created_at: now,
            updated_at: now,
            financial_year: fy,
        };

        const res = await col.insertOne(doc);
        return toEntity({ ...doc, _id: res.insertedId });
    }

    async update(
        id: string,
        userId: string,
        data: Partial<UpdateDeliveryChallanDTO>
    ): Promise<DeliveryChallan | null> {
        const col = await this.col();
        let query: Record<string, unknown> = { userId };
        if (ObjectId.isValid(id)) {
            query._id = new ObjectId(id);
        } else {
            query.id = id;
        }

        const updateFields: Record<string, unknown> = {
            ...data,
            updated_at: new Date(),
        };

        const res = await col.findOneAndUpdate(
            query,
            { $set: updateFields },
            { returnDocument: "after" }
        );

        if (!res) return null;
        return toEntity(res);
    }

    async updateStatus(
        id: string,
        userId: string,
        status: ChallanStatus,
        extraUpdates: Record<string, unknown> = {}
    ): Promise<DeliveryChallan | null> {
        const col = await this.col();
        let query: Record<string, unknown> = { userId };
        if (ObjectId.isValid(id)) {
            query._id = new ObjectId(id);
        } else {
            query.id = id;
        }

        const updateFields: Record<string, unknown> = {
            status,
            ...extraUpdates,
            updated_at: new Date(),
        };

        const res = await col.findOneAndUpdate(
            query,
            { $set: updateFields },
            { returnDocument: "after" }
        );

        if (!res) return null;
        return toEntity(res);
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const col = await this.col();
        let query: Record<string, unknown> = { userId };
        if (ObjectId.isValid(id)) {
            query._id = new ObjectId(id);
        } else {
            query.id = id;
        }

        const res = await col.deleteOne(query);
        return res.deletedCount > 0;
    }
}

let _repo: MongoDeliveryChallanRepository | null = null;
export function getDeliveryChallanRepository(): MongoDeliveryChallanRepository {
    if (!_repo) _repo = new MongoDeliveryChallanRepository();
    return _repo;
}
