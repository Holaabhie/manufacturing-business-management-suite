export type { Order, OrderStatus, PaymentStatus, CreateOrderDTO, UpdateOrderDTO, OrderItem, OrderMaterial, LegacyDeductionItem, IOrderRepository } from "./domain/types";
export { createOrderSchema, updateOrderSchema } from "./domain/schemas";
export { OrderService } from "./application/order.service";
export { MongoOrderRepository, getOrderRepository } from "./infrastructure/order.repository";

import { OrderService } from "./application/order.service";
import { getOrderRepository } from "./infrastructure/order.repository";

let _svc: OrderService | null = null;
export function getOrderService(): OrderService {
    if (!_svc) _svc = new OrderService(getOrderRepository());
    return _svc;
}
