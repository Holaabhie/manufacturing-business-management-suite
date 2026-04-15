/**
 * Purchasing Domain — Types
 * ─────────────────────────────────────────────────────────
 * Pure TypeScript types with ZERO framework dependencies.
 * These define the core business vocabulary for purchasing.
 */

// ─── Purchase Status ────────────────────────────────────────────
export type PurchaseStatus = "Pending" | "Ordered" | "Received";

// ─── Vendor Entity ──────────────────────────────────────────────
export interface Vendor {
    id: string;
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

// ─── Purchase Order Line Item ───────────────────────────────────
export interface PurchaseOrderItem {
    inventoryItemId: string;
    materialName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
}

// ─── Purchase Order Entity ──────────────────────────────────────
export interface PurchaseOrder {
    id: string;
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

// ─── DTOs ───────────────────────────────────────────────────────

export interface CreateVendorDTO {
    name: string;
    contactPerson: string;
    phone: string;
    email?: string;
    address?: string;
    gstin?: string;
    notes?: string;
}

export interface UpdateVendorDTO {
    name?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
    notes?: string;
}

export interface CreatePurchaseOrderItemDTO {
    inventoryItemId: string;
    materialName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
}

export interface CreatePurchaseOrderDTO {
    vendorId: string;
    vendorName: string;
    items: CreatePurchaseOrderItemDTO[];
    taxPercent: number;
    notes?: string;
}

export interface UpdatePurchaseStatusDTO {
    status: PurchaseStatus;
}

// ─── Repository Interfaces ──────────────────────────────────────

export interface IVendorRepository {
    findAll(userId: string): Promise<Vendor[]>;
    findById(id: string, userId: string): Promise<Vendor | null>;
    create(userId: string, data: CreateVendorDTO): Promise<Vendor>;
    update(id: string, userId: string, data: UpdateVendorDTO): Promise<Vendor | null>;
    delete(id: string, userId: string): Promise<boolean>;
}

export interface IPurchaseOrderRepository {
    findAll(userId: string): Promise<PurchaseOrder[]>;
    findById(id: string, userId: string): Promise<PurchaseOrder | null>;
    create(userId: string, data: CreatePurchaseOrderDTO): Promise<PurchaseOrder>;
    updateStatus(id: string, userId: string, status: PurchaseStatus): Promise<PurchaseOrder | null>;
    delete(id: string, userId: string): Promise<boolean>;
    getNextPoNumber(userId: string): Promise<string>;
}
