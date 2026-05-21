// Types for the Materials Step in Production Wizard

export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    purchase_cost_per_unit?: number;
    item_type?: string;
}

export interface SelectedMaterial {
    inventoryId: string;
    name: string;
    quantityUsed: number;
    unit: string;
    availableStock: number;
    unitCost?: number;
}

export interface MaterialHistoryResponse {
    matched: boolean;
    matchType: string | null;
    sourceJobId: string | null;
    sourceBatchNumber: string | null;
    sourceProductName: string | null;
    sourceCompletedAt: string | null;
    materials: {
        id: string;
        inventoryItemId: string;
        itemName: string;
        quantityUsed: number;
        unit: string;
        wastagePercent: number;
    }[];
}

export interface RecentMaterial {
    inventoryItemId: string;
    itemName: string;
    unit: string;
    lastUsed: string;
    usageCount: number;
}

export interface MaterialTemplate {
    id: string;
    name: string;
    productName: string;
    items: { inventoryItemId: string; itemName: string; quantity: number; unit: string }[];
    createdAt: string;
}

export interface StockWarning {
    index: number;
    type: "over" | "low" | "adjusted";
    message: string;
}

export interface PreFillInfo {
    active: boolean;
    sourceBatchNumber: string;
    sourceProductName: string;
    sourceDate: string;
    itemCount: number;
    adjustments: string[];
}
