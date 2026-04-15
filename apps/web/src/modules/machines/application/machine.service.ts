/**
 * Machines Application Service
 * ─────────────────────────────────────────────────────────
 * Business logic for machine management.
 * Includes duplicate-name check that was previously inline in the route.
 */

import type {
    IMachineRepository,
    Machine,
} from "../domain/types";
import {
    createMachineSchema,
    updateMachineSchema,
} from "../domain/schemas";
import {
    NotFoundError,
    ValidationError,
    AlreadyExistsError,
    AuthorizationError,
    type FieldError,
} from "@/shared/lib/errors";

export class MachineService {
    constructor(private readonly repo: IMachineRepository) { }

    async findAll(adminId: string): Promise<Machine[]> {
        return this.repo.findAll(adminId);
    }

    async findById(id: string, adminId: string): Promise<Machine> {
        const machine = await this.repo.findById(id, adminId);
        if (!machine) {
            throw new NotFoundError("Machine", id);
        }
        return machine;
    }

    async create(
        adminId: string,
        userRole: string,
        input: unknown,
    ): Promise<Machine> {
        // Only admins can create machines
        if (userRole !== "Admin") {
            throw new AuthorizationError("machines.create");
        }

        const parsed = createMachineSchema.safeParse(input);
        if (!parsed.success) {
            const fieldErrors: FieldError[] = parsed.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            throw new ValidationError(fieldErrors);
        }

        // Check for duplicate machine name
        const existing = await this.repo.findByName(adminId, parsed.data.machineName);
        if (existing) {
            throw new AlreadyExistsError("Machine", "machineName", parsed.data.machineName);
        }

        return this.repo.create(adminId, parsed.data);
    }

    async update(
        id: string,
        adminId: string,
        userRole: string,
        input: unknown,
    ): Promise<Machine> {
        if (userRole !== "Admin") {
            throw new AuthorizationError("machines.update");
        }

        const parsed = updateMachineSchema.safeParse(input);
        if (!parsed.success) {
            const fieldErrors: FieldError[] = parsed.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            throw new ValidationError(fieldErrors);
        }

        // If renaming, check for duplicate
        if (parsed.data.machineName) {
            const existing = await this.repo.findByName(adminId, parsed.data.machineName);
            if (existing && existing.id !== id) {
                throw new AlreadyExistsError("Machine", "machineName", parsed.data.machineName);
            }
        }

        const updated = await this.repo.update(id, adminId, parsed.data);
        if (!updated) {
            throw new NotFoundError("Machine", id);
        }
        return updated;
    }

    async delete(id: string, adminId: string, userRole: string): Promise<void> {
        if (userRole !== "Admin") {
            throw new AuthorizationError("machines.delete");
        }

        const deleted = await this.repo.delete(id, adminId);
        if (!deleted) {
            throw new NotFoundError("Machine", id);
        }
    }
}
