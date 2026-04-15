/**
 * Inventory Application Service
 * ─────────────────────────────────────────────────────────
 * Orchestrates business operations for inventory management.
 * This is the entry point called by API routes — it coordinates
 * domain logic, repository calls, and cross-cutting concerns.
 *
 * Dependencies are injected via constructor (repository interface),
 * making this testable without a database.
 */

import type {
    IInventoryRepository,
    InventoryItem,
    CreateInventoryItemDTO,
    UpdateInventoryItemDTO,
    StockLevel,
} from "../domain/types";
import {
    createInventoryItemSchema,
    updateInventoryItemSchema,
} from "../domain/schemas";
import {
    NotFoundError,
    ValidationError,
    InsufficientStockError,
    type FieldError,
} from "@/shared/lib/errors";

export class InventoryService {
    constructor(private readonly repo: IInventoryRepository) { }

    /**
     * Get all inventory items for a user.
     */
    async findAll(userId: string): Promise<InventoryItem[]> {
        return this.repo.findAll(userId);
    }

    /**
     * Get a single inventory item by ID.
     */
    async findById(id: string, userId: string): Promise<InventoryItem> {
        const item = await this.repo.findById(id, userId);
        if (!item) {
            throw new NotFoundError("Inventory item", id);
        }
        return item;
    }

    /**
     * Create a new inventory item with validated input.
     */
    async create(userId: string, input: unknown): Promise<InventoryItem> {
        const parsed = createInventoryItemSchema.safeParse(input);
        if (!parsed.success) {
            const fieldErrors: FieldError[] = parsed.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            throw new ValidationError(fieldErrors);
        }

        return this.repo.create(userId, parsed.data);
    }

    /**
     * Update an existing inventory item with validated input.
     */
    async update(
        id: string,
        userId: string,
        input: unknown,
    ): Promise<InventoryItem> {
        const parsed = updateInventoryItemSchema.safeParse(input);
        if (!parsed.success) {
            const fieldErrors: FieldError[] = parsed.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            throw new ValidationError(fieldErrors);
        }

        const updated = await this.repo.update(id, userId, parsed.data);
        if (!updated) {
            throw new NotFoundError("Inventory item", id);
        }
        return updated;
    }

    /**
     * Delete an inventory item.
     */
    async delete(id: string, userId: string): Promise<void> {
        const deleted = await this.repo.delete(id, userId);
        if (!deleted) {
            throw new NotFoundError("Inventory item", id);
        }
    }

    /**
     * Get items with stock below their minimum level.
     */
    async findLowStock(userId: string): Promise<StockLevel[]> {
        return this.repo.findLowStock(userId);
    }

    /**
     * Deduct stock from an inventory item.
     * Validates that sufficient stock exists before deduction.
     */
    async deductStock(
        id: string,
        userId: string,
        quantity: number,
    ): Promise<InventoryItem> {
        // Verify item exists and has sufficient stock
        const item = await this.repo.findById(id, userId);
        if (!item) {
            throw new NotFoundError("Inventory item", id);
        }

        if (item.quantity < quantity) {
            throw new InsufficientStockError(item.name, quantity, item.quantity);
        }

        const updated = await this.repo.deductStock(id, userId, quantity);
        if (!updated) {
            throw new NotFoundError("Inventory item", id);
        }
        return updated;
    }
}
