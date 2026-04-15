export type { Production, ProductionStatus, Shift, ProductionMaterial, ActivityLogEntry, CreateProductionDTO, UpdateProductionDTO, IProductionRepository } from "./domain/types";
export { createProductionSchema, updateProductionSchema } from "./domain/schemas";
export { ProductionService } from "./application/production.service";
export { MongoProductionRepository, getProductionRepository } from "./infrastructure/production.repository";

import { ProductionService } from "./application/production.service";
import { getProductionRepository } from "./infrastructure/production.repository";

let _svc: ProductionService | null = null;
export function getProductionService(): ProductionService {
    if (!_svc) _svc = new ProductionService(getProductionRepository());
    return _svc;
}
