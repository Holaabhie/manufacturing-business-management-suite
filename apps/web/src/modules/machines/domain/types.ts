/**
 * Machines Domain — Types
 * ─────────────────────────────────────────────────────────
 * Pure TypeScript types for machine management.
 */

// ─── Entity ─────────────────────────────────────────────────────

export type MachineStatus = "active" | "inactive" | "maintenance";

export interface Machine {
    id: string;
    adminId: string;
    machineName: string;
    machineType: string;
    capacity: string;
    status: MachineStatus;
    createdAt: Date;
    updatedAt: Date;
}

// ─── DTOs ───────────────────────────────────────────────────────

export interface CreateMachineDTO {
    machineName: string;
    machineType?: string;
    capacity?: string;
}

export interface UpdateMachineDTO {
    machineName?: string;
    machineType?: string;
    capacity?: string;
    status?: MachineStatus;
}

// ─── Repository Interface ───────────────────────────────────────

export interface IMachineRepository {
    findById(id: string, adminId: string): Promise<Machine | null>;
    findAll(adminId: string): Promise<Machine[]>;
    findByName(adminId: string, name: string): Promise<Machine | null>;
    create(adminId: string, data: CreateMachineDTO): Promise<Machine>;
    update(id: string, adminId: string, data: UpdateMachineDTO): Promise<Machine | null>;
    delete(id: string, adminId: string): Promise<boolean>;
}
