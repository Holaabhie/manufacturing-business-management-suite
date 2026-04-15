import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { IClientRepository, Client, CreateClientDTO, UpdateClientDTO, ClientProduct, CreateClientProductDTO, ClientProductMaterial, CreateClientProductMaterialDTO } from "../domain/types";

interface ClientDoc {
    _id: ObjectId;
    userId: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    createdAt: Date;
    updatedAt: Date;
}

function toEntity(doc: ClientDoc): Client {
    return {
        id: doc._id.toString(),
        userId: doc.userId,
        name: doc.name || "",
        email: doc.email || "",
        phone: doc.phone || "",
        address: doc.address || "",
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

export class MongoClientRepository implements IClientRepository {
    private async col() {
        const db = await getDb();
        return db.collection<ClientDoc>("clients");
    }

    async findById(id: string, userId: string): Promise<Client | null> {
        try {
            const c = await this.col();
            const doc = await c.findOne({ _id: new ObjectId(id), userId });
            return doc ? toEntity(doc) : null;
        } catch { return null; }
    }

    async findAll(userId: string): Promise<Client[]> {
        const c = await this.col();
        const docs = await c.find({ userId }).sort({ name: 1 }).toArray();
        return docs.map(toEntity);
    }

    async create(userId: string, data: CreateClientDTO): Promise<Client> {
        const c = await this.col();
        const now = new Date();
        const result = await c.insertOne({
            userId,
            name: data.name,
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            createdAt: now,
            updatedAt: now,
        } as ClientDoc);
        const created = await c.findOne({ _id: result.insertedId });
        return toEntity(created!);
    }

    async update(id: string, userId: string, data: UpdateClientDTO): Promise<Client | null> {
        try {
            const c = await this.col();
            const fields: Record<string, unknown> = { updatedAt: new Date() };
            if (data.name !== undefined) fields.name = data.name;
            if (data.email !== undefined) fields.email = data.email;
            if (data.phone !== undefined) fields.phone = data.phone;
            if (data.address !== undefined) fields.address = data.address;

            const result = await c.findOneAndUpdate(
                { _id: new ObjectId(id), userId },
                { $set: fields },
                { returnDocument: "after" },
            );
            return result ? toEntity(result as unknown as ClientDoc) : null;
        } catch { return null; }
    }

    async delete(id: string, userId: string): Promise<boolean> {
        try {
            const c = await this.col();
            const result = await c.deleteOne({ _id: new ObjectId(id), userId });
            return result.deletedCount === 1;
        } catch { return false; }
    }

    // Product Methods
    private async productCol() {
        return (await getDb()).collection("client_products");
    }

    async findProducts(clientId: string, userId: string): Promise<ClientProduct[]> {
        const c = await this.productCol();
        const docs = await c.find({ clientId, userId }).toArray();
        return docs.map((d) => ({
            id: d._id.toString(),
            clientId: d.clientId,
            userId: d.userId,
            name: d.name,
            defaultRate: Number(d.defaultRate || 0),
            createdAt: d.createdAt,
        }));
    }

    async createProduct(userId: string, data: CreateClientProductDTO): Promise<ClientProduct> {
        const c = await this.productCol();
        const now = new Date();
        const doc = {
            userId,
            clientId: data.clientId,
            name: data.name,
            defaultRate: data.defaultRate || 0,
            createdAt: now,
        };
        const result = await c.insertOne(doc);
        return {
            id: result.insertedId.toString(),
            ...doc,
        };
    }

    async deleteProduct(productId: string, userId: string): Promise<boolean> {
        try {
            const c = await this.productCol();
            const result = await c.deleteOne({ _id: new ObjectId(productId), userId });
            if (result.deletedCount === 1) {
                await (await this.materialCol()).deleteMany({ productId, userId });
            }
            return result.deletedCount === 1;
        } catch { return false; }
    }

    // Material Methods
    private async materialCol() {
        return (await getDb()).collection("client_product_materials");
    }

    async findMaterialsByProduct(productId: string, userId: string): Promise<ClientProductMaterial[]> {
        const c = await this.materialCol();
        const docs = await c.find({ productId, userId }).toArray();
        return docs.map((d) => ({
            id: d._id.toString(),
            productId: d.productId,
            clientId: d.clientId,
            userId: d.userId,
            name: d.name,
            type: d.type || "",
            defaultQty: d.defaultQty,
            createdAt: d.createdAt,
        }));
    }

    async createMaterial(userId: string, data: CreateClientProductMaterialDTO): Promise<ClientProductMaterial> {
        const c = await this.materialCol();
        const now = new Date();
        const doc = {
            userId,
            clientId: data.clientId,
            productId: data.productId,
            name: data.name,
            type: data.type || "",
            defaultQty: data.defaultQty,
            createdAt: now,
        };
        const result = await c.insertOne(doc);
        return {
            id: result.insertedId.toString(),
            ...doc,
        };
    }

    async deleteMaterial(materialId: string, userId: string): Promise<boolean> {
        try {
            const c = await this.materialCol();
            const result = await c.deleteOne({ _id: new ObjectId(materialId), userId });
            return result.deletedCount === 1;
        } catch { return false; }
    }
}

let instance: MongoClientRepository | null = null;
export function getClientRepository(): IClientRepository {
    if (!instance) instance = new MongoClientRepository();
    return instance;
}
