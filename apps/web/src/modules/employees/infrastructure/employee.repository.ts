/**
 * Employees Infrastructure — MongoDB Repository
 */

import { getDb } from "@/lib/mongodb";
import crypto from "crypto";
import type {
    IEmployeeRepository,
    Employee,
    EmployeeStatus,
    CreateEmployeeDTO,
    UpdateEmployeeProfileDTO,
    EmployeeActivity,
    EmployeeSession,
} from "../domain/types";
import type { PermissionMap } from "@/lib/permissions";

// ─── Document → Domain Mapper ───────────────────────────────────
function toDomainEntity(doc: Record<string, unknown>): Employee {
    return {
        id: String(doc._id),
        employeeId: (doc.employeeId as string) || "—",
        adminId: (doc.adminId as string) || "",
        organizationId: (doc.organizationId as string) || "",
        fullName: (doc.fullName as string) || (doc.full_name as string) || "Unnamed",
        email: (doc.email as string) || "",
        phone: (doc.phone as string) || (doc.phone_number as string) || "",
        department: (doc.department as string) || "General",
        designation: (doc.designation as string) || "",
        role: "Staff",
        status: ((doc.status as string) || "active") as EmployeeStatus,
        permissions: (doc.permissions as PermissionMap) || null,
        permissionTemplateId: (doc.permissionTemplateId as string) || "custom",
        lastLogin: (doc.lastLogin as Date) || null,
        lastActiveAt: (doc.lastActiveAt as Date) || null,
        firstLoginCompleted: (doc.firstLoginCompleted as boolean) ?? false,
        tempPasswordActive: (doc.tempPasswordActive as boolean) ?? false,
        failedLoginAttempts: (doc.failedLoginAttempts as number) || 0,
        lockedUntil: (doc.lockedUntil as Date) || null,
        avatarUrl: (doc.avatar_url as string) || null,
        createdAt: doc.createdAt as Date,
        updatedAt: doc.updatedAt as Date,
    };
}

export class MongoEmployeeRepository implements IEmployeeRepository {
    private async collection() {
        const db = await getDb();
        return db.collection("users");
    }

    async findById(id: string, adminId: string): Promise<Employee | null> {
        const col = await this.collection();
        const doc = await col.findOne(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { _id: id as any, adminId, role: "Staff" },
            { projection: { passwordHash: 0 } },
        );
        return doc ? toDomainEntity(doc as Record<string, unknown>) : null;
    }

    async findAll(adminId: string): Promise<Employee[]> {
        const col = await this.collection();
        const docs = await col
            .find(
                { adminId, role: "Staff" },
                { projection: { passwordHash: 0 } },
            )
            .sort({ createdAt: -1 })
            .toArray();
        return docs.map((d) => toDomainEntity(d as Record<string, unknown>));
    }

    async findByEmail(email: string): Promise<Employee | null> {
        const col = await this.collection();
        const doc = await col.findOne(
            { email },
            { projection: { passwordHash: 0 } },
        );
        return doc ? toDomainEntity(doc as Record<string, unknown>) : null;
    }

    async create(
        adminId: string,
        organizationId: string,
        data: CreateEmployeeDTO,
        employeeId: string,
        passwordHash: string,
    ): Promise<Employee> {
        const col = await this.collection();
        const { DEFAULT_TEMPLATES } = await import("@/lib/permissions");
        const now = new Date();
        const userId = crypto.randomUUID();

        // Resolve permissions
        let permissions: PermissionMap;
        const template = data.permissionTemplate || "operations";
        if (data.customPermissions) {
            permissions = data.customPermissions as unknown as PermissionMap;
        } else if (DEFAULT_TEMPLATES[template]) {
            permissions = DEFAULT_TEMPLATES[template].permissions;
        } else {
            permissions = DEFAULT_TEMPLATES["operations"].permissions;
        }

        const doc = {
            _id: userId,
            email: data.email || `${employeeId.toLowerCase()}@staff.local`,
            passwordHash,
            role: "Staff",
            subscription_tier: "starter",
            subscription_status: "active",
            fullName: data.fullName,
            full_name: data.fullName,
            phone: data.phone || undefined,
            department: data.department || "General",
            designation: data.designation || "",
            employeeId,
            adminId,
            organizationId,
            permissions,
            permissionTemplateId: data.customPermissions ? "custom" : template,
            status: "active",
            firstLoginCompleted: false,
            failedLoginAttempts: 0,
            tempPasswordActive: true,
            createdAt: now,
            updatedAt: now,
            invitedBy: adminId,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await col.insertOne(doc as any);

        return toDomainEntity(doc as Record<string, unknown>);
    }

    async updateStatus(id: string, status: EmployeeStatus): Promise<boolean> {
        const col = await this.collection();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await col.updateOne(
            { _id: id as any },
            { $set: { status, updatedAt: new Date() } },
        );
        return result.modifiedCount === 1;
    }

    async updatePassword(id: string, passwordHash: string): Promise<boolean> {
        const col = await this.collection();
        const result = await col.updateOne(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { _id: id as any },
            {
                $set: {
                    passwordHash,
                    tempPasswordActive: true,
                    failedLoginAttempts: 0,
                    lockedUntil: undefined,
                    updatedAt: new Date(),
                },
            },
        );
        return result.modifiedCount === 1;
    }

    async unlockAccount(id: string): Promise<boolean> {
        const col = await this.collection();
        const result = await col.updateOne(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { _id: id as any },
            {
                $set: {
                    failedLoginAttempts: 0,
                    lockedUntil: undefined,
                    updatedAt: new Date(),
                },
            },
        );
        return result.modifiedCount === 1;
    }

    async updatePermissions(
        id: string,
        permissions: PermissionMap,
        templateId: string,
    ): Promise<boolean> {
        const col = await this.collection();
        const result = await col.updateOne(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { _id: id as any },
            {
                $set: {
                    permissions,
                    permissionTemplateId: templateId,
                    updatedAt: new Date(),
                },
            },
        );
        return result.modifiedCount === 1;
    }

    async updateProfile(id: string, data: UpdateEmployeeProfileDTO): Promise<boolean> {
        const col = await this.collection();
        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (data.fullName !== undefined) {
            updates.fullName = data.fullName;
            updates.full_name = data.fullName;
        }
        if (data.email !== undefined) updates.email = data.email;
        if (data.phone !== undefined) updates.phone = data.phone;
        if (data.department !== undefined) updates.department = data.department;
        if (data.designation !== undefined) updates.designation = data.designation;

        const result = await col.updateOne(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { _id: id as any },
            { $set: updates },
        );
        return result.modifiedCount === 1;
    }

    async delete(id: string, adminId: string): Promise<boolean> {
        const col = await this.collection();
        const result = await col.deleteOne(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { _id: id as any, adminId, role: "Staff" },
        );
        return result.deletedCount === 1;
    }

    async getNextEmployeeNumber(adminId: string): Promise<number> {
        const col = await this.collection();
        const lastEmployee = await col
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .find({
                $or: [{ adminId }, { _id: adminId as any }],
                employeeId: { $regex: /^EMP-\d+$/ },
            } as any)
            .sort({ employeeId: -1 })
            .limit(1)
            .toArray();

        if (lastEmployee.length > 0) {
            const match = (lastEmployee[0] as Record<string, unknown>).employeeId;
            const parsed = String(match).match(/^EMP-(\d+)$/);
            if (parsed) return parseInt(parsed[1], 10) + 1;
        }
        return 1;
    }

    async getRecentActivity(userId: string, limit = 20): Promise<EmployeeActivity[]> {
        const db = await getDb();
        const docs = await db
            .collection("auditlogs")
            .find({ userId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();

        return docs.map((a) => ({
            id: a._id.toString(),
            action: String(a.action || ""),
            actionType: String(a.actionType || ""),
            module: String(a.module || ""),
            timestamp: a.timestamp as Date,
            ipAddress: a.ipAddress as string | undefined,
            deviceType: a.deviceType as string | undefined,
            browser: a.browser as string | undefined,
            severity: a.severity as string | undefined,
        }));
    }

    async getActiveSessions(userId: string): Promise<EmployeeSession[]> {
        const db = await getDb();
        const docs = await db
            .collection("sessions")
            .find({ userId, expiresAt: { $gt: new Date() } })
            .sort({ lastActiveAt: -1 })
            .toArray();

        return docs.map((s) => ({
            id: String(s._id),
            ipAddress: String(s.ipAddress || "Unknown"),
            userAgent: String(s.userAgent || "Unknown"),
            deviceType: String(s.deviceType || "Unknown"),
            lastActiveAt: s.lastActiveAt as Date,
            createdAt: s.createdAt as Date,
        }));
    }
}

// ─── Singleton ──────────────────────────────────────────────────
let instance: MongoEmployeeRepository | null = null;

export function getEmployeeRepository(): IEmployeeRepository {
    if (!instance) {
        instance = new MongoEmployeeRepository();
    }
    return instance;
}
