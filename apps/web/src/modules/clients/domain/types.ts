/**
 * Clients Domain — Types
 */

export interface Client {
    id: string;
    userId: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    avatarUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateClientDTO {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface UpdateClientDTO {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    avatarUrl?: string;
}

export interface ClientProduct {
    id: string;
    clientId: string;
    userId: string;
    name: string;
    defaultRate: number;
    createdAt: Date;
}

export interface CreateClientProductDTO {
    clientId: string;
    name: string;
    defaultRate?: number;
}

export interface ClientProductMaterial {
    id: string;
    productId: string;
    clientId: string;
    userId: string;
    name: string;
    type: string;
    defaultQty?: number;
    createdAt: Date;
}

export interface CreateClientProductMaterialDTO {
    productId: string;
    clientId: string;
    name: string;
    type?: string;
    defaultQty?: number;
}

export interface IClientRepository {
    findById(id: string, userId: string): Promise<Client | null>;
    findAll(userId: string): Promise<Client[]>;
    create(userId: string, data: CreateClientDTO): Promise<Client>;
    update(id: string, userId: string, data: UpdateClientDTO): Promise<Client | null>;
    delete(id: string, userId: string): Promise<boolean>;

    // Product methods
    findProducts(clientId: string, userId: string): Promise<ClientProduct[]>;
    createProduct(userId: string, data: CreateClientProductDTO): Promise<ClientProduct>;
    deleteProduct(productId: string, userId: string): Promise<boolean>;

    // Material methods
    findMaterialsByProduct(productId: string, userId: string): Promise<ClientProductMaterial[]>;
    createMaterial(userId: string, data: CreateClientProductMaterialDTO): Promise<ClientProductMaterial>;
    deleteMaterial(materialId: string, userId: string): Promise<boolean>;
}
