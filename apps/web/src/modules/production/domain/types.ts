/**
 * Production Domain — Types
 */

export type ProductionStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type Shift = "morning" | "afternoon" | "night";

export interface ProductionMaterial {
    inventoryId: string;
    name: string;
    quantityUsed: number;
    unit?: string;
}

export interface ActivityLogEntry {
    id: string;
    timestamp: string;
    action: string;
    performedBy: string;
    performedByRole: string;
    details: string;
}

export interface Production {
    id: string;
    userId: string;
    orderId: string;
    orderProductName: string;
    orderQuantity: number;
    clientName: string;
    deliveryDate: string | null;
    batchNumber: string;
    materials: ProductionMaterial[];
    machineId: string;
    machineName: string;
    operatorId: string;
    operatorName: string;
    expectedOutput: number;
    startTime: string;
    shift: Shift;
    targetCompletion: string;
    status: ProductionStatus;
    producedQuantity: number;
    rejectQuantity: number;
    progressPercent: number;
    activityLog: ActivityLogEntry[];
    notes: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    createdBy: string;
}

export interface CreateProductionDTO {
    orderId: string;
    orderProductName: string;
    orderQuantity: number;
    clientName: string;
    deliveryDate?: string;
    batchNumber?: string;
    materials?: ProductionMaterial[];
    machineId?: string;
    machineName?: string;
    operatorId?: string;
    operatorName?: string;
    expectedOutput: number;
    startTime: string;
    shift?: Shift;
    targetCompletion: string;
    notes?: string;
}

export interface UpdateProductionDTO {
    status?: ProductionStatus;
    producedQuantity?: number;
    rejectQuantity?: number;
    progressPercent?: number;
    notes?: string;
}

export interface IProductionRepository {
    findById(id: string, userId: string): Promise<Production | null>;
    findAll(userId: string): Promise<Production[]>;
    create(userId: string, data: CreateProductionDTO, batchNumber: string, createdBy: string, initialLog: ActivityLogEntry): Promise<Production>;
    update(id: string, userId: string, data: UpdateProductionDTO): Promise<Production | null>;
    delete(id: string, userId: string): Promise<boolean>;
    getProductionCount(userId: string): Promise<number>;
    deductMaterials(materials: ProductionMaterial[]): Promise<void>;
}
