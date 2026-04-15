/**
 * Inventory Module — Barrel Export
 * ─────────────────────────────────────────────────────────
 * Single entry point for all inventory module exports.
 *
 * Usage:
 *   import { inventoryService, type InventoryItem } from "@/modules/inventory";
 */

// Domain types
export type {
    InventoryItem,
    StockLevel,
    CreateInventoryItemDTO,
    UpdateInventoryItemDTO,
    IInventoryRepository,
} from "./domain/types";

// Validation schemas
export {
    createInventoryItemSchema,
    updateInventoryItemSchema,
    deductStockSchema,
    type CreateInventoryInput,
    type UpdateInventoryInput,
    type DeductStockInput,
} from "./domain/schemas";

// Application service
export { InventoryService } from "./application/inventory.service";

// Infrastructure
export {
    MongoInventoryRepository,
    getInventoryRepository,
} from "./infrastructure/inventory.repository";

// ─── Pre-wired service instance ─────────────────────────────────
// For convenience in API routes. Uses the singleton repository.
import { InventoryService } from "./application/inventory.service";
import { getInventoryRepository } from "./infrastructure/inventory.repository";

let _service: InventoryService | null = null;

export function getInventoryService(): InventoryService {
    if (!_service) {
        _service = new InventoryService(getInventoryRepository());
    }
    return _service;
}
