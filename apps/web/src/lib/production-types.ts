// ─── Production Module Type Definitions ─────────────────────────────
// Shared across pages, API routes, and components.

export type ProductionStatus = "pending" | "running" | "paused" | "completed";

export type ShiftType = "morning" | "afternoon" | "night";

export interface ProductionMaterial {
    inventoryId: string;
    name: string;
    quantityUsed: number;
    unit: string;
    availableStock: number;
}

export interface ProductionActivityLog {
    id: string;
    timestamp: string;
    action: string;
    performedBy: string;
    performedByRole: string;
    details: string;
}

export interface AssignedStaffMember {
    id: string;
    name: string;
    email: string;
}

export interface Production {
    id: string;
    // Order linkage
    orderId: string;
    orderProductName: string;
    orderQuantity: number;
    clientName: string;
    deliveryDate: string | null;

    // Production config
    batchNumber: string;
    materials: ProductionMaterial[];
    machineId: string;
    machineName: string;
    operatorId: string;
    operatorName: string;

    // Targets
    expectedOutput: number;
    startTime: string;
    shift: ShiftType;
    targetCompletion: string;

    // Live progress
    status: ProductionStatus;
    outputUnit?: "kg" | "pcs" | "units";
    producedQuantity: number;
    rejectQuantity: number;
    progressPercent: number;

    // Staff assignment
    assignedStaff?: AssignedStaffMember[];

    // Activity
    activityLog: ProductionActivityLog[];
    notes: string;

    // Timestamps
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    createdBy: string;
}

export interface ProductionKPIs {
    efficiency: number; // (producedQuantity / expectedOutput) * 100
    materialConsumption: number; // total material units consumed
    wastage: number; // (rejectQuantity / producedQuantity) * 100
    staffContribution: { name: string; produced: number; role: string }[];
}

// Machine master data shape (from database)
export interface Machine {
    id: string;
    machineName: string;
    machineType: string;
    capacity: string;
    status: "active" | "inactive" | "maintenance";
    adminId: string;
    createdAt: string;
    updatedAt: string;
}

// Staff/Operator shape (from employees API)
export interface Operator {
    id: string;
    fullName: string;
    employeeId: string;
    department: string;
    designation: string;
    status: string;
}

// Production Progress Entry (from productionProgress collection)
export interface ProductionProgressEntry {
    id: string;
    productionId: string;
    producedQty: number;
    rejectedQty: number;
    notes: string;
    updatedBy: string;
    updatedByName: string;
    updatedByRole: string;
    timestamp: string;
}
