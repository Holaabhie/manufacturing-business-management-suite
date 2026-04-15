import type { IClientRepository, Client, ClientProduct, ClientProductMaterial } from "../domain/types";
import { createClientSchema, updateClientSchema, createClientProductSchema, createClientProductMaterialSchema } from "../domain/schemas";
import { NotFoundError, ValidationError, type FieldError } from "@/shared/lib/errors";

export class ClientService {
    constructor(private readonly repo: IClientRepository) { }

    async findAll(userId: string): Promise<Client[]> {
        return this.repo.findAll(userId);
    }

    async findById(id: string, userId: string): Promise<Client> {
        const client = await this.repo.findById(id, userId);
        if (!client) throw new NotFoundError("Client", id);
        return client;
    }

    async create(userId: string, input: unknown): Promise<Client> {
        const parsed = createClientSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."), message: i.message,
            }));
            throw new ValidationError(errs);
        }
        return this.repo.create(userId, parsed.data);
    }

    async update(id: string, userId: string, input: unknown): Promise<Client> {
        const parsed = updateClientSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."), message: i.message,
            }));
            throw new ValidationError(errs);
        }
        const updated = await this.repo.update(id, userId, parsed.data);
        if (!updated) throw new NotFoundError("Client", id);
        return updated;
    }

    async delete(id: string, userId: string): Promise<void> {
        const deleted = await this.repo.delete(id, userId);
        if (!deleted) throw new NotFoundError("Client", id);
    }

    // Product Methods

    async findProducts(clientId: string, userId: string): Promise<ClientProduct[]> {
        return this.repo.findProducts(clientId, userId);
    }

    async createProduct(clientId: string, userId: string, input: unknown): Promise<ClientProduct> {
        const parsed = createClientProductSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."), message: i.message,
            }));
            throw new ValidationError(errs);
        }

        return this.repo.createProduct(userId, {
            clientId,
            name: parsed.data.name,
            defaultRate: parsed.data.defaultRate,
        });
    }

    async deleteProduct(productId: string, userId: string): Promise<void> {
        const deleted = await this.repo.deleteProduct(productId, userId);
        if (!deleted) throw new NotFoundError("ClientProduct", productId);
    }

    // Material Methods

    async findMaterialsByProduct(productId: string, userId: string): Promise<ClientProductMaterial[]> {
        return this.repo.findMaterialsByProduct(productId, userId);
    }

    async createMaterial(productId: string, clientId: string, userId: string, input: unknown): Promise<ClientProductMaterial> {
        const parsed = createClientProductMaterialSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."), message: i.message,
            }));
            throw new ValidationError(errs);
        }

        return this.repo.createMaterial(userId, {
            productId,
            clientId,
            name: parsed.data.name,
            type: parsed.data.type,
            defaultQty: parsed.data.defaultQty,
        });
    }

    async deleteMaterial(materialId: string, userId: string): Promise<void> {
        const deleted = await this.repo.deleteMaterial(materialId, userId);
        if (!deleted) throw new NotFoundError("ClientProductMaterial", materialId);
    }
}
