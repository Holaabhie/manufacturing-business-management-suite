export type {
    VendorBill,
    VendorBillPayment,
    VendorSnapshot,
    VendorBillItem,
    TdsDetails,
    BillStatus,
    PaymentStatus,
    SupplyType,
    BillPaymentMode,
    CreateVendorBillDTO,
    UpdateVendorBillDTO,
    RecordBillPaymentDTO,
    VoidBillPaymentDTO,
    VendorBillListSummary,
    PoSummaryResponse,
    IVendorBillRepository,
} from "./domain/types";

export {
    createVendorBillSchema,
    updateVendorBillSchema,
    recordBillPaymentSchema,
    voidBillPaymentSchema,
    billStatusTransitionSchema,
    vendorSnapshotSchema,
    vendorBillItemSchema,
    tdsSchema,
    type CreateVendorBillInput,
    type UpdateVendorBillInput,
    type RecordBillPaymentInput,
    type VoidBillPaymentInput,
    type BillStatusTransitionInput,
} from "./domain/schemas";

export {
    VendorBillService,
    getTodayIST,
    addDaysToKolkataDate,
} from "./application/vendor-bill.service";

export {
    MongoVendorBillRepository,
    getVendorBillRepository,
} from "./infrastructure/vendor-bill.repository";

export {
    generateSequentialVendorBillNumber,
    peekNextVendorBillNumber,
} from "./infrastructure/vendor-bill-sequence";

import { VendorBillService } from "./application/vendor-bill.service";
import { getVendorBillRepository } from "./infrastructure/vendor-bill.repository";

let _service: VendorBillService | null = null;
export function getVendorBillService(): VendorBillService {
    if (!_service) {
        _service = new VendorBillService(getVendorBillRepository());
    }
    return _service;
}

export { getVendorBillTenantUserId } from "./tenant-scope";
