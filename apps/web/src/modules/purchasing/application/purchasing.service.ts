/**
 * Purchasing Application Service
 * ─────────────────────────────────────────────────────────
 * Orchestrates business operations for purchasing management.
 * Handles vendor CRUD, purchase order lifecycle, and
 * inventory stock updates when orders are received.
 */

import type {
    IVendorRepository,
    IPurchaseOrderRepository,
    Vendor,
    PurchaseOrder,
    PurchaseStatus,
} from "../domain/types";
import type { IInventoryRepository } from "@/modules/inventory/domain/types";
import {
    createVendorSchema,
    updateVendorSchema,
    createPurchaseOrderSchema,
    updatePurchaseStatusSchema,
} from "../domain/schemas";
import {
    NotFoundError,
    ValidationError,
    BusinessRuleError,
    type FieldError,
} from "@/shared/lib/errors";

export class PurchasingService {
    constructor(
        private readonly vendorRepo: IVendorRepository,
        private readonly poRepo: IPurchaseOrderRepository,
        private readonly inventoryRepo: IInventoryRepository,
    ) {}

    // ─── Vendor Operations ──────────────────────────────────────

    async findAllVendors(userId: string): Promise<Vendor[]> {
        return this.vendorRepo.findAll(userId);
    }

    async findVendorById(id: string, userId: string): Promise<Vendor> {
        const vendor = await this.vendorRepo.findById(id, userId);
        if (!vendor) throw new NotFoundError("Vendor", id);
        return vendor;
    }

    async createVendor(userId: string, input: unknown): Promise<Vendor> {
        const parsed = createVendorSchema.safeParse(input);
        if (!parsed.success) {
            const fieldErrors: FieldError[] = parsed.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            throw new ValidationError(fieldErrors);
        }
        return this.vendorRepo.create(userId, parsed.data);
    }

    async updateVendor(id: string, userId: string, input: unknown): Promise<Vendor> {
        const parsed = updateVendorSchema.safeParse(input);
        if (!parsed.success) {
            const fieldErrors: FieldError[] = parsed.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            throw new ValidationError(fieldErrors);
        }
        const updated = await this.vendorRepo.update(id, userId, parsed.data);
        if (!updated) throw new NotFoundError("Vendor", id);
        return updated;
    }

    async deleteVendor(id: string, userId: string): Promise<void> {
        const deleted = await this.vendorRepo.delete(id, userId);
        if (!deleted) throw new NotFoundError("Vendor", id);
    }

    // ─── Purchase Order Operations ──────────────────────────────

    async findAllOrders(userId: string): Promise<PurchaseOrder[]> {
        return this.poRepo.findAll(userId);
    }

    async findOrderById(id: string, userId: string): Promise<PurchaseOrder> {
        const order = await this.poRepo.findById(id, userId);
        if (!order) throw new NotFoundError("Purchase Order", id);
        return order;
    }

    async createOrder(userId: string, input: unknown): Promise<PurchaseOrder> {
        const parsed = createPurchaseOrderSchema.safeParse(input);
        if (!parsed.success) {
            const fieldErrors: FieldError[] = parsed.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            throw new ValidationError(fieldErrors);
        }
        return this.poRepo.create(userId, parsed.data);
    }

    /**
     * Update purchase order status.
     *
     * When status transitions to "Received", automatically update
     * inventory stock levels for each line item.
     */
    async updateOrderStatus(
        id: string,
        userId: string,
        input: unknown,
    ): Promise<PurchaseOrder> {
        const parsed = updatePurchaseStatusSchema.safeParse(input);
        if (!parsed.success) {
            const fieldErrors: FieldError[] = parsed.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            throw new ValidationError(fieldErrors);
        }

        const currentOrder = await this.poRepo.findById(id, userId);
        if (!currentOrder) throw new NotFoundError("Purchase Order", id);

        // Validate state transitions
        const { status: newStatus } = parsed.data;
        this.validateStatusTransition(currentOrder.status, newStatus);

        const updated = await this.poRepo.updateStatus(id, userId, newStatus);
        if (!updated) throw new NotFoundError("Purchase Order", id);

        // When received, add stock to inventory
        if (newStatus === "Received") {
            await this.addStockFromPurchase(userId, currentOrder);
        }

        return updated;
    }

    async deleteOrder(id: string, userId: string): Promise<void> {
        const order = await this.poRepo.findById(id, userId);
        if (!order) throw new NotFoundError("Purchase Order", id);
        if (order.status === "Received") {
            throw new BusinessRuleError("Cannot delete a received purchase order");
        }
        const deleted = await this.poRepo.delete(id, userId);
        if (!deleted) throw new NotFoundError("Purchase Order", id);
    }

    // ─── Private Helpers ────────────────────────────────────────

    private validateStatusTransition(current: PurchaseStatus, next: PurchaseStatus): void {
        const validTransitions: Record<PurchaseStatus, PurchaseStatus[]> = {
            Pending: ["Ordered", "Received"],
            Ordered: ["Received"],
            Received: [],
        };

        if (!validTransitions[current]?.includes(next)) {
            throw new BusinessRuleError(
                `Cannot transition purchase order from "${current}" to "${next}"`,
            );
        }
    }

    /**
     * Add purchased quantities to inventory when PO is received.
     * Uses $inc to atomically increase stock for each line item.
     */
    private async addStockFromPurchase(
        userId: string,
        order: PurchaseOrder,
    ): Promise<void> {
        for (const item of order.items) {
            try {
                // Try to find the inventory item
                const existing = await this.inventoryRepo.findById(item.inventoryItemId, userId);
                if (existing) {
                    // Use deductStock with negative quantity to ADD stock
                    // (deductStock uses $inc: -quantity, so -(-q) = +q)
                    await this.inventoryRepo.deductStock(
                        item.inventoryItemId,
                        userId,
                        -item.quantity, // Negative deduction = addition
                    );
                }
                // If item doesn't exist in inventory, skip silently
                // (it may have been deleted)
            } catch {
                // Log but don't fail the entire receive operation
                console.warn(
                    `Failed to update stock for item ${item.materialName} (${item.inventoryItemId})`,
                );
            }
        }
    }
}
