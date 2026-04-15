/**
 * Purchasing Module — Barrel Export
 * ─────────────────────────────────────────────────────────
 * Single entry point for all purchasing module exports.
 *
 * Usage:
 *   import { getPurchasingService, type PurchaseOrder } from "@/modules/purchasing";
 */

// Domain types
export type {
    Vendor,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseStatus,
    CreateVendorDTO,
    UpdateVendorDTO,
    CreatePurchaseOrderDTO,
    CreatePurchaseOrderItemDTO,
    UpdatePurchaseStatusDTO,
    IVendorRepository,
    IPurchaseOrderRepository,
} from "./domain/types";

// Validation schemas
export {
    createVendorSchema,
    updateVendorSchema,
    createPurchaseOrderSchema,
    updatePurchaseStatusSchema,
    purchaseOrderItemSchema,
    type CreateVendorInput,
    type UpdateVendorInput,
    type CreatePurchaseOrderInput,
    type PurchaseOrderItemInput,
    type UpdatePurchaseStatusInput,
} from "./domain/schemas";

// Application service
export { PurchasingService } from "./application/purchasing.service";

// Infrastructure
export {
    MongoVendorRepository,
    MongoPurchaseOrderRepository,
    getVendorRepository,
    getPurchaseOrderRepository,
} from "./infrastructure/purchasing.repository";

// ─── Pre-wired service instance ─────────────────────────────────
import { PurchasingService } from "./application/purchasing.service";
import { getVendorRepository, getPurchaseOrderRepository } from "./infrastructure/purchasing.repository";
import { getInventoryRepository } from "@/modules/inventory/infrastructure/inventory.repository";

let _service: PurchasingService | null = null;

export function getPurchasingService(): PurchasingService {
    if (!_service) {
        _service = new PurchasingService(
            getVendorRepository(),
            getPurchaseOrderRepository(),
            getInventoryRepository(),
        );
    }
    return _service;
}
