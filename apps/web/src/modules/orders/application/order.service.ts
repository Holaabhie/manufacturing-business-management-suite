import type { IOrderRepository, Order } from "../domain/types";
import { createOrderSchema, updateOrderSchema } from "../domain/schemas";
import { NotFoundError, ValidationError, type FieldError } from "@/shared/lib/errors";

const VALID_STATUSES = ["pending", "processing", "completed", "cancelled", "on_hold"];

export class OrderService {
    constructor(private readonly repo: IOrderRepository) { }

    async findAll(userId: string, filters?: { clientId?: string }): Promise<Order[]> {
        return this.repo.findAll(userId, filters);
    }

    async findById(id: string, userId: string): Promise<Order> {
        const order = await this.repo.findById(id, userId);
        if (!order) throw new NotFoundError("Order", id);
        return order;
    }

    async create(userId: string, input: unknown): Promise<Order> {
        const parsed = createOrderSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."), message: i.message,
            }));
            throw new ValidationError(errs);
        }

        const { order_items, ...orderData } = parsed.data;

        // Ensure total_amount / grand_total is set for legacy flow
        if (!orderData.grand_total && orderData.total_amount) {
            orderData.grand_total = orderData.total_amount;
        }

        const order = await this.repo.create(userId, orderData as any);

        // Separate legacy inventory-deduction items from sales order line items
        if (order_items && order_items.length > 0) {
            const legacyItems = order_items.filter(
                (item): item is { inventory_id: string; quantity_deducted: number } =>
                    "inventory_id" in item,
            );
            if (legacyItems.length > 0) {
                await this.repo.deductInventory(userId, order.id, legacyItems as any);
            }
        }

        return order;
    }

    async update(id: string, userId: string, input: unknown): Promise<Order> {
        const parsed = updateOrderSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."), message: i.message,
            }));
            throw new ValidationError(errs);
        }
        const updated = await this.repo.update(id, userId, parsed.data);
        if (!updated) throw new NotFoundError("Order", id);
        return updated;
    }

    async updateStatus(id: string, userId: string, status: string): Promise<Order> {
        if (!VALID_STATUSES.includes(status)) {
            throw new ValidationError([{ field: "status", message: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(", ")}` }]);
        }

        // Check current status — don't allow changes on fully-completed orders
        // (production done AND payment done)
        const current = await this.repo.findById(id, userId);
        if (!current) throw new NotFoundError("Order", id);
        const prodDone = (current.productionStatus || current.status) === "completed";
        const payDone = (current.paymentStatus as string) === "paid";
        if (prodDone && payDone) {
            throw new ValidationError([{ field: "status", message: "Cannot change status of a fully completed order" }]);
        }

        const updated = await this.repo.updateStatus(id, userId, status);
        if (!updated) throw new NotFoundError("Order", id);
        return updated;
    }

    async delete(id: string, userId: string): Promise<void> {
        const deleted = await this.repo.delete(id, userId);
        if (!deleted) throw new NotFoundError("Order", id);
    }
}
