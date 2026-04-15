/**
 * Machines Infrastructure — MongoDB Repository
 */

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type {
    IMachineRepository,
    Machine,
    CreateMachineDTO,
    UpdateMachineDTO,
} from "../domain/types";

interface MachineDocument {
    _id: ObjectId;
    adminId: string;
    machineName: string;
    machineType: string;
    capacity: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

function toDomainEntity(doc: MachineDocument): Machine {
    return {
        id: doc._id.toString(),
        adminId: doc.adminId,
        machineName: doc.machineName,
        machineType: doc.machineType || "",
        capacity: doc.capacity || "",
        status: (doc.status as Machine["status"]) || "active",
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

export class MongoMachineRepository implements IMachineRepository {
    private readonly collectionName = "machines";

    private async collection() {
        const db = await getDb();
        return db.collection<MachineDocument>(this.collectionName);
    }

    async findById(id: string, adminId: string): Promise<Machine | null> {
        const col = await this.collection();
        try {
            const doc = await col.findOne({ _id: new ObjectId(id), adminId });
            return doc ? toDomainEntity(doc) : null;
        } catch {
            return null;
        }
    }

    async findAll(adminId: string): Promise<Machine[]> {
        const col = await this.collection();
        const docs = await col.find({ adminId }).sort({ createdAt: -1 }).toArray();
        return docs.map(toDomainEntity);
    }

    async findByName(adminId: string, name: string): Promise<Machine | null> {
        const col = await this.collection();
        const doc = await col.findOne({ adminId, machineName: name });
        return doc ? toDomainEntity(doc) : null;
    }

    async create(adminId: string, data: CreateMachineDTO): Promise<Machine> {
        const col = await this.collection();
        const now = new Date();
        const doc: Omit<MachineDocument, "_id"> = {
            adminId,
            machineName: data.machineName,
            machineType: data.machineType || "",
            capacity: data.capacity || "",
            status: "active",
            createdAt: now,
            updatedAt: now,
        };

        const result = await col.insertOne(doc as MachineDocument);
        const created = await col.findOne({ _id: result.insertedId });
        return toDomainEntity(created!);
    }

    async update(
        id: string,
        adminId: string,
        data: UpdateMachineDTO,
    ): Promise<Machine | null> {
        const col = await this.collection();
        try {
            const updateFields: Record<string, unknown> = { updatedAt: new Date() };
            if (data.machineName !== undefined) updateFields.machineName = data.machineName;
            if (data.machineType !== undefined) updateFields.machineType = data.machineType;
            if (data.capacity !== undefined) updateFields.capacity = data.capacity;
            if (data.status !== undefined) updateFields.status = data.status;

            const result = await col.findOneAndUpdate(
                { _id: new ObjectId(id), adminId },
                { $set: updateFields },
                { returnDocument: "after" },
            );

            return result ? toDomainEntity(result as unknown as MachineDocument) : null;
        } catch {
            return null;
        }
    }

    async delete(id: string, adminId: string): Promise<boolean> {
        const col = await this.collection();
        try {
            const result = await col.deleteOne({ _id: new ObjectId(id), adminId });
            return result.deletedCount === 1;
        } catch {
            return false;
        }
    }
}

// ─── Singleton ──────────────────────────────────────────────────
let instance: MongoMachineRepository | null = null;

export function getMachineRepository(): IMachineRepository {
    if (!instance) {
        instance = new MongoMachineRepository();
    }
    return instance;
}
