export type { Bill, BillStatus, BillItem, CreateBillDTO, UpdateBillDTO, IBillingRepository } from "./domain/types";
export { createBillSchema, updateBillSchema } from "./domain/schemas";
export { BillingService } from "./application/billing.service";
export { MongoBillingRepository, getBillingRepository } from "./infrastructure/billing.repository";

import { BillingService } from "./application/billing.service";
import { getBillingRepository } from "./infrastructure/billing.repository";

let _svc: BillingService | null = null;
export function getBillingService(): BillingService {
    if (!_svc) _svc = new BillingService(getBillingRepository());
    return _svc;
}
