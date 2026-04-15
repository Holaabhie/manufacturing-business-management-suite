/**
 * Employees Domain — Types
 * ─────────────────────────────────────────────────────────
 * Pure TypeScript types for employee/staff management.
 * Employees are Staff role users linked to an Admin.
 */

import type { PermissionMap } from "@/lib/permissions";

// ─── Entity ─────────────────────────────────────────────────────

export type EmployeeStatus = "active" | "inactive";

export interface Employee {
    id: string;
    employeeId: string;
    adminId: string;
    organizationId: string;
    fullName: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    role: "Staff";
    status: EmployeeStatus;
    permissions: PermissionMap | null;
    permissionTemplateId: string;
    lastLogin: Date | null;
    lastActiveAt: Date | null;
    firstLoginCompleted: boolean;
    tempPasswordActive: boolean;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Activity & Session Types ───────────────────────────────────

export interface EmployeeActivity {
    id: string;
    action: string;
    actionType: string;
    module: string;
    timestamp: Date;
    ipAddress?: string;
    deviceType?: string;
    browser?: string;
    severity?: string;
}

export interface EmployeeSession {
    id: string;
    ipAddress: string;
    userAgent: string;
    deviceType: string;
    lastActiveAt: Date;
    createdAt: Date;
}

export interface EmployeeDetail {
    employee: Employee;
    recentActivity: EmployeeActivity[];
    activeSessions: EmployeeSession[];
}

// ─── DTOs ───────────────────────────────────────────────────────

export interface CreateEmployeeDTO {
    fullName: string;
    email?: string;
    phone?: string;
    department?: string;
    designation?: string;
    permissionTemplate?: string;
    customPermissions?: PermissionMap;
}

export interface UpdateEmployeeProfileDTO {
    fullName?: string;
    email?: string;
    phone?: string;
    department?: string;
    designation?: string;
}

// ─── Action Types (for the multi-action PUT) ────────────────────

export type EmployeeAction =
    | "toggle_status"
    | "reset_password"
    | "unlock_account"
    | "terminate_sessions"
    | "update_permissions"
    | "update_profile";

export interface EmployeeActionPayload {
    action: EmployeeAction;
    // For update_permissions
    templateId?: string;
    permissions?: PermissionMap;
    // For update_profile
    fullName?: string;
    email?: string;
    phone?: string;
    department?: string;
    designation?: string;
}

// ─── Repository Interface ───────────────────────────────────────

export interface IEmployeeRepository {
    findById(id: string, adminId: string): Promise<Employee | null>;
    findAll(adminId: string): Promise<Employee[]>;
    findByEmail(email: string): Promise<Employee | null>;
    create(adminId: string, organizationId: string, data: CreateEmployeeDTO, employeeId: string, passwordHash: string): Promise<Employee>;
    updateStatus(id: string, status: EmployeeStatus): Promise<boolean>;
    updatePassword(id: string, passwordHash: string): Promise<boolean>;
    unlockAccount(id: string): Promise<boolean>;
    updatePermissions(id: string, permissions: PermissionMap, templateId: string): Promise<boolean>;
    updateProfile(id: string, data: UpdateEmployeeProfileDTO): Promise<boolean>;
    delete(id: string, adminId: string): Promise<boolean>;
    getNextEmployeeNumber(adminId: string): Promise<number>;
    getRecentActivity(userId: string, limit?: number): Promise<EmployeeActivity[]>;
    getActiveSessions(userId: string): Promise<EmployeeSession[]>;
}
