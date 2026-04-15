export type { Payment, CreatePaymentDTO, IPaymentRepository } from "./domain/types";
export { createPaymentSchema } from "./domain/schemas";
export { PaymentService } from "./application/payment.service";
export { MongoPaymentRepository, getPaymentRepository } from "./infrastructure/payment.repository";

import { PaymentService } from "./application/payment.service";
import { getPaymentRepository } from "./infrastructure/payment.repository";

let _svc: PaymentService | null = null;
export function getPaymentService(): PaymentService {
    if (!_svc) _svc = new PaymentService(getPaymentRepository());
    return _svc;
}
