/**
 * Employees Application Service
 * ─────────────────────────────────────────────────────────
 * Orchestrates employee management with audit logging.
 * Extracts all business logic from the 411-line route handler
 * into testable, reusable methods.
 */

import bcrypt from "bcrypt";
import type {
    IEmployeeRepository,
    Employee,
    EmployeeDetail,
    EmployeeActionPayload,
} from "../domain/types";
import {
    createEmployeeSchema,
    employeeActionSchema,
} from "../domain/schemas";
import {
    NotFoundError,
    ValidationError,
    AlreadyExistsError,
    type FieldError,
} from "@/shared/lib/errors";
import { ROLE_PRESETS, EMPTY_PERMISSIONS, type FlatPermissionMap as PermissionMap } from "@/lib/permissions";
import { destroyAllUserSessions } from "@/lib/auth-session";

// ─── Temp Password Generator ────────────────────────────────────
function generateTempPassword(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let result = "";
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export class EmployeeService {
    constructor(private readonly repo: IEmployeeRepository) { }

    // ─── List Employees ─────────────────────────────────
    async findAll(adminId: string): Promise<{ employees: Employee[]; total: number }> {
        const employees = await this.repo.findAll(adminId);
        return { employees, total: employees.length };
    }

    // ─── Get Employee Detail ────────────────────────────
    async findByIdWithDetails(
        id: string,
        adminId: string,
    ): Promise<EmployeeDetail> {
        const employee = await this.repo.findById(id, adminId);
        if (!employee) throw new NotFoundError("Employee", id);

        const [recentActivity, activeSessions] = await Promise.all([
            this.repo.getRecentActivity(id),
            this.repo.getActiveSessions(id),
        ]);

        return { employee, recentActivity, activeSessions };
    }

    // ─── Create Employee ───────────────────────────────
    async create(
        adminId: string,
        organizationId: string,
        subscriptionTier: string,
        input: unknown,
    ): Promise<{ employee: Employee; tempPassword: string }> {
        const parsed = createEmployeeSchema.safeParse(input);
        if (!parsed.success) {
            const fieldErrors: FieldError[] = parsed.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            throw new ValidationError(fieldErrors);
        }

        // Check duplicate email
        if (parsed.data.email) {
            const existing = await this.repo.findByEmail(parsed.data.email);
            if (existing) {
                throw new AlreadyExistsError("User", "email", parsed.data.email);
            }
        }

        // Generate credentials
        const nextNum = await this.repo.getNextEmployeeNumber(adminId);
        const employeeId = `EMP-${String(nextNum).padStart(4, "0")}`;
        const tempPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const employee = await this.repo.create(
            adminId,
            organizationId,
            parsed.data,
            employeeId,
            passwordHash,
        );

        return { employee, tempPassword };
    }

    // ─── Execute Action ────────────────────────────────
    async executeAction(
        id: string,
        adminId: string,
        payload: unknown,
    ): Promise<Record<string, unknown>> {
        // Validate action payload
        const parsed = employeeActionSchema.safeParse(payload);
        if (!parsed.success) {
            const fieldErrors: FieldError[] = parsed.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            throw new ValidationError(fieldErrors);
        }

        const data = parsed.data as EmployeeActionPayload;

        // Verify employee exists
        const employee = await this.repo.findById(id, adminId);
        if (!employee) throw new NotFoundError("Employee", id);

        switch (data.action) {
            case "toggle_status":
                return this.toggleStatus(id, employee);

            case "reset_password":
                return this.resetPassword(id);

            case "unlock_account":
                await this.repo.unlockAccount(id);
                return { ok: true };

            case "terminate_sessions":
                await destroyAllUserSessions(id);
                return { ok: true };

            case "update_permissions":
                return this.updatePermissions(id, data);

            case "update_profile":
                return this.updateProfile(id, employee, data);

            default:
                throw new ValidationError("Invalid action", "action");
        }
    }

    // ─── Toggle Status ──────────────────────────────────
    private async toggleStatus(
        id: string,
        employee: Employee,
    ): Promise<Record<string, unknown>> {
        const newStatus = employee.status === "active" ? "inactive" : "active";
        await this.repo.updateStatus(id, newStatus);

        // Kill sessions if deactivating
        if (newStatus === "inactive") {
            await destroyAllUserSessions(id);
        }

        return { ok: true, status: newStatus };
    }

    // ─── Reset Password ────────────────────────────────
    private async resetPassword(id: string): Promise<Record<string, unknown>> {
        const tempPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        await this.repo.updatePassword(id, passwordHash);
        await destroyAllUserSessions(id);
        return { ok: true, tempPassword };
    }

    // ─── Update Permissions ────────────────────────────
    private async updatePermissions(
        id: string,
        data: EmployeeActionPayload,
    ): Promise<Record<string, unknown>> {
        let newPermissions: PermissionMap;
        let templateId: string;

        const roleKey = data.templateId as keyof typeof ROLE_PRESETS;
        if (data.templateId && ROLE_PRESETS[roleKey]) {
            newPermissions = ROLE_PRESETS[roleKey].permissions;
            templateId = data.templateId;
        } else if (data.permissions) {
            newPermissions = data.permissions as PermissionMap;
            templateId = "custom";
        } else {
            throw new ValidationError("Permissions or template required", "permissions");
        }

        await this.repo.updatePermissions(id, newPermissions, templateId);
        return { ok: true, permissions: newPermissions, templateId };
    }

    // ─── Update Profile ────────────────────────────────
    private async updateProfile(
        id: string,
        employee: Employee,
        data: EmployeeActionPayload,
    ): Promise<Record<string, unknown>> {
        // Check email uniqueness if changing
        if (data.email && data.email !== employee.email) {
            const existing = await this.repo.findByEmail(data.email);
            if (existing && existing.id !== id) {
                throw new AlreadyExistsError("User", "email", data.email);
            }
        }

        await this.repo.updateProfile(id, {
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            department: data.department,
            designation: data.designation,
        });

        return { ok: true };
    }

    // ─── Delete Employee ───────────────────────────────
    async delete(id: string, adminId: string): Promise<Employee> {
        const employee = await this.repo.findById(id, adminId);
        if (!employee) throw new NotFoundError("Employee", id);

        await destroyAllUserSessions(id);
        const deleted = await this.repo.delete(id, adminId);
        if (!deleted) throw new NotFoundError("Employee", id);

        return employee;
    }
}
