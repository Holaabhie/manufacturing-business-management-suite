export type {
    DeliveryChallan,
    ChallanStatus,
    ChallanPurpose,
    ChallanItem,
    ConsigneeSnapshot,
    CreateDeliveryChallanDTO,
    UpdateDeliveryChallanDTO,
    IDeliveryChallanRepository,
} from "./domain/types";

export {
    createDeliveryChallanSchema,
    updateDeliveryChallanSchema,
    challanItemSchema,
    consigneeSnapshotSchema,
    challanStatusTransitionSchema,
    type CreateDeliveryChallanInput,
    type UpdateDeliveryChallanInput,
} from "./domain/schemas";

export {
    DeliveryChallanService,
    type ChallanWithWarnings,
    type OrderChallanSummary,
} from "./application/delivery-challan.service";

export {
    MongoDeliveryChallanRepository,
    getDeliveryChallanRepository,
} from "./infrastructure/delivery-challan.repository";

export {
    generateSequentialChallanNumber,
    peekNextChallanNumber,
} from "./infrastructure/delivery-challan-sequence";

import { DeliveryChallanService } from "./application/delivery-challan.service";
import { getDeliveryChallanRepository } from "./infrastructure/delivery-challan.repository";

let _svc: DeliveryChallanService | null = null;
export function getDeliveryChallanService(): DeliveryChallanService {
    if (!_svc) _svc = new DeliveryChallanService(getDeliveryChallanRepository());
    return _svc;
}
