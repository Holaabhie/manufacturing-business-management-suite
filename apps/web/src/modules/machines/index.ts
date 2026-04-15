/**
 * Machines Module — Barrel Export
 */

// Domain types
export type {
    Machine,
    MachineStatus,
    CreateMachineDTO,
    UpdateMachineDTO,
    IMachineRepository,
} from "./domain/types";

// Schemas
export {
    createMachineSchema,
    updateMachineSchema,
    type CreateMachineInput,
    type UpdateMachineInput,
} from "./domain/schemas";

// Application service
export { MachineService } from "./application/machine.service";

// Infrastructure
export { MongoMachineRepository, getMachineRepository } from "./infrastructure/machine.repository";

// Pre-wired service
import { MachineService } from "./application/machine.service";
import { getMachineRepository } from "./infrastructure/machine.repository";

let _service: MachineService | null = null;

export function getMachineService(): MachineService {
    if (!_service) {
        _service = new MachineService(getMachineRepository());
    }
    return _service;
}
