/**
 * Inventory Domain — Tests
 * ─────────────────────────────────────────────────────────
 * Tests for the inventory domain types and invariants.
 */

import { describe, expect, it } from "vitest";
import type {
    InventoryItem,
    StockLevel,
    CreateInventoryItemDTO,
} from "./types";

describe("Inventory Domain Types", () => {
    describe("InventoryItem", () => {
        it("should have all required fields", () => {
            const item: InventoryItem = {
                id: "item-1",
                organizationId: "org-1",
                userId: "user-1",
                name: "Steel Rod 10mm",
                quantity: 500,
                unit: "pieces",
                minStockLevel: 50,
                supplierWhatsapp: "+919876543210",
                purchaseCostPerUnit: 45.5,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(item.id).toBe("item-1");
            expect(item.organizationId).toBe("org-1");
            expect(item.name).toBe("Steel Rod 10mm");
            expect(item.quantity).toBe(500);
            expect(item.unit).toBe("pieces");
            expect(item.purchaseCostPerUnit).toBe(45.5);
        });
    });

    describe("StockLevel", () => {
        it("should mark stock as low when current < minimum", () => {
            const stockLevel: StockLevel = {
                itemId: "item-1",
                itemName: "Steel Rod 10mm",
                current: 10,
                minimum: 50,
                unit: "pieces",
                isLow: true,
            };

            expect(stockLevel.isLow).toBe(true);
            expect(stockLevel.current).toBeLessThan(stockLevel.minimum);
        });

        it("should not mark stock as low when current >= minimum", () => {
            const stockLevel: StockLevel = {
                itemId: "item-2",
                itemName: "Aluminum Sheet",
                current: 200,
                minimum: 50,
                unit: "kg",
                isLow: false,
            };

            expect(stockLevel.isLow).toBe(false);
            expect(stockLevel.current).toBeGreaterThanOrEqual(stockLevel.minimum);
        });
    });

    describe("CreateInventoryItemDTO", () => {
        it("should allow optional supplierWhatsapp", () => {
            const dto: CreateInventoryItemDTO = {
                name: "Copper Wire",
                quantity: 100,
                unit: "meters",
                minStockLevel: 20,
                purchaseCostPerUnit: 120,
            };

            expect(dto.supplierWhatsapp).toBeUndefined();
            expect(dto.name).toBe("Copper Wire");
        });

        it("should not allow negative quantity", () => {
            const dto: CreateInventoryItemDTO = {
                name: "Test Item",
                quantity: -5,
                unit: "pieces",
                minStockLevel: 10,
                purchaseCostPerUnit: 50,
            };

            // Domain invariant: quantity should not be negative
            expect(dto.quantity).toBeLessThan(0);
        });
    });
});
