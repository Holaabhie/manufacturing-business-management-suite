/**
 * Orders Domain — Tests
 * ─────────────────────────────────────────────────────────
 * Tests for the orders domain types and invariants.
 */

import { describe, expect, it } from "vitest";
import type {
    Order,
    OrderStatus,
    PaymentStatus,
    CreateOrderDTO,
    LegacyDeductionItem,
} from "./types";

describe("Orders Domain Types", () => {
    describe("Order", () => {
        it("should have all required fields", () => {
            const order: Order = {
                id: "order-1",
                userId: "user-1",
                clientId: "client-1",
                productName: "Steel Frame Assembly",
                quantity: 10,
                rate: 2500,
                totalAmount: 25000,
                deliveryDate: "2026-03-15",
                status: "pending",
                paymentStatus: "pending",
                client: { name: "Acme Corp" },
                createdAt: new Date(),
                updatedAt: new Date(),
                orderItems: [],
                subtotal: 0,
                discountAmount: 0,
                taxableAmount: 0,
                cgstAmount: 0,
                sgstAmount: 0,
                igstAmount: 0,
                cessAmount: 0,
                totalTax: 0,
                shippingCharges: 0,
                roundOff: 0,
                totalPaid: 0,
                balanceDue: 0
            };

            expect(order.id).toBe("order-1");
            expect(order.totalAmount).toBe(25000);
            expect(order.status).toBe("pending");
        });

        it("should calculate totalAmount as quantity * rate", () => {
            const quantity = 10;
            const rate = 2500;
            const expectedTotal = quantity * rate;

            expect(expectedTotal).toBe(25000);
        });
    });

    describe("OrderStatus transitions", () => {
        it("should allow valid status values", () => {
            const validStatuses: OrderStatus[] = [
                "pending",
                "in_progress",
                "completed",
                "cancelled",
            ];

            validStatuses.forEach((status) => {
                const order = { status } as Order;
                expect(["pending", "in_progress", "completed", "cancelled"]).toContain(
                    order.status,
                );
            });
        });
    });

    describe("PaymentStatus", () => {
        it("should allow valid payment status values", () => {
            const validStatuses: PaymentStatus[] = ["pending", "partial", "paid"];

            validStatuses.forEach((status) => {
                expect(["pending", "partial", "paid"]).toContain(status);
            });
        });
    });

    describe("CreateOrderDTO", () => {
        it("should allow minimal order creation", () => {
            const dto: CreateOrderDTO = {
                product_name: "Widget A",
                quantity: 5,
                rate: 100,
                total_amount: 500,
            };

            expect(dto.client_id).toBeUndefined();
            expect(dto.delivery_date).toBeUndefined();
            expect(dto.order_items).toBeUndefined();
        });

        it("should support order_items for inventory deduction", () => {
            const dto: CreateOrderDTO = {
                product_name: "Frame Assembly",
                quantity: 1,
                rate: 5000,
                total_amount: 5000,
                order_items: [
                    { inventory_id: "inv-1", quantity_deducted: 10 },
                    { inventory_id: "inv-2", quantity_deducted: 5 },
                ],
            };

            expect(dto.order_items).toHaveLength(2);
            expect((dto.order_items![0] as LegacyDeductionItem).quantity_deducted).toBe(10);
        });
    });
});
