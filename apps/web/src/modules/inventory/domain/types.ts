/**
 * Inventory Domain — Types
 * ─────────────────────────────────────────────────────────
 * Pure TypeScript types with ZERO framework dependencies.
 * These define the core business vocabulary for inventory.
 */

// ─── Entity ─────────────────────────────────────────────────────

export interface InventoryItem {
    id: string;
    organizationId: string;
    userId: string;
    name: string;
    quantity: number;
    unit: string;
    minStockLevel: number;
    supplierWhatsapp: string;
    purchaseCostPerUnit: number;
    hsn_code?: string;
    tax_rate?: number;
    track_inventory?: boolean;
    item_type?: string;
    lastSourcePoId?: string;
    lastSourcePoNumber?: string;
    lastReceivedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Value Objects ──────────────────────────────────────────────

export interface StockLevel {
    itemId: string;
    itemName: string;
    current: number;
    minimum: number;
    unit: string;
    isLow: boolean;
}

// ─── DTOs ───────────────────────────────────────────────────────

export interface CreateInventoryItemDTO {
    name: string;
    quantity: number;
    unit: string;
    minStockLevel: number;
    supplierWhatsapp?: string;
    purchaseCostPerUnit: number;
    hsn_code?: string;
    tax_rate?: number;
    track_inventory?: boolean;
    item_type?: string;
}

export interface UpdateInventoryItemDTO {
    name?: string;
    quantity?: number;
    unit?: string;
    minStockLevel?: number;
    supplierWhatsapp?: string;
    purchaseCostPerUnit?: number;
    hsn_code?: string;
    tax_rate?: number;
    track_inventory?: boolean;
    item_type?: string;
}

// ─── Repository Interface ───────────────────────────────────────
// Domain defines the interface, infrastructure implements it.

export interface IInventoryRepository {
    findById(id: string, userId: string): Promise<InventoryItem | null>;
    findAll(userId: string): Promise<InventoryItem[]>;
    create(userId: string, data: CreateInventoryItemDTO): Promise<InventoryItem>;
    update(id: string, userId: string, data: UpdateInventoryItemDTO): Promise<InventoryItem | null>;
    delete(id: string, userId: string): Promise<boolean>;
    findLowStock(userId: string): Promise<StockLevel[]>;
    deductStock(id: string, userId: string, quantity: number): Promise<InventoryItem | null>;
    addStockFromPO(id: string, userId: string, quantity: number, poId: string, poNumber: string): Promise<InventoryItem | null>;
}
