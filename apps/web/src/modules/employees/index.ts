/**
 * Employees Module — Barrel Export
 */

export type {
    Employee,
    EmployeeStatus,
    EmployeeDetail,
    EmployeeActivity,
    EmployeeSession,
    CreateEmployeeDTO,
    UpdateEmployeeProfileDTO,
    EmployeeAction,
    EmployeeActionPayload,
    IEmployeeRepository,
} from "./domain/types";

export {
    createEmployeeSchema,
    updateEmployeeProfileSchema,
    employeeActionSchema,
    type CreateEmployeeInput,
    type UpdateEmployeeProfileInput,
    type EmployeeActionInput,
} from "./domain/schemas";

export { EmployeeService } from "./application/employee.service";
export { MongoEmployeeRepository, getEmployeeRepository } from "./infrastructure/employee.repository";

import { EmployeeService } from "./application/employee.service";
import { getEmployeeRepository } from "./infrastructure/employee.repository";

let _service: EmployeeService | null = null;

export function getEmployeeService(): EmployeeService {
    if (!_service) {
        _service = new EmployeeService(getEmployeeRepository());
    }
    return _service;
}
