import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/require-role";
import { ROLE_PRESETS, EMPTY_PERMISSIONS, type FlatPermissionMap as PermissionMap } from "@/lib/permissions";
import type { WithId } from "mongodb";
import type { UserDoc } from "@/lib/auth-session";
import { logAudit, logPermissionChange, getClientIp } from "@/lib/audit";
import { destroyAllUserSessions } from "@/lib/auth-session";

// ═════════════════════════════════════════════════════════════════
// GET: Single employee detail
// ═════════════════════════════════════════════════════════════════
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireAdmin();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { id } = await params;
        const admin = result.user!;
        const adminId = admin._id.toString();
        const db = await getDb();

        const employee = await db.collection("users").findOne(
            { _id: id as any, adminId, role: "Staff" },
            { projection: { passwordHash: 0 } }
        );

        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        // Get recent activity from audit logs
        const recentActivity = await db.collection("auditlogs")
            .find({ userId: id })
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();

        // Get active sessions
        const activeSessions = await db.collection("sessions")
            .find({ userId: id, expiresAt: { $gt: new Date() } })
            .sort({ lastActiveAt: -1 })
            .toArray();

        return NextResponse.json({
            employee: {
                id: employee._id.toString(),
                employeeId: employee.employeeId || "—",
                fullName: employee.fullName || employee.full_name || "Unnamed",
                email: employee.email || "",
                phone: employee.phone || employee.phone_number || "",
                department: employee.department || "General",
                designation: employee.designation || "",
                role: employee.role,
                status: employee.status || "active",
                permissions: employee.permissions || null,
                permissionTemplate: employee.permissionTemplateId || "custom",
                avatar_url: employee.avatar_url || null,
                lastLogin: employee.lastLogin || null,
                lastActiveAt: employee.lastActiveAt || null,
                firstLoginCompleted: employee.firstLoginCompleted ?? false,
                tempPasswordActive: employee.tempPasswordActive ?? false,
                failedLoginAttempts: employee.failedLoginAttempts || 0,
                lockedUntil: employee.lockedUntil || null,
                createdAt: employee.createdAt,
                updatedAt: employee.updatedAt,
            },
            recentActivity: recentActivity.map((a: any) => ({
                id: a._id.toString(),
                action: a.action,
                actionType: a.actionType,
                module: a.module,
                timestamp: a.timestamp,
                ipAddress: a.ipAddress,
                deviceType: a.deviceType,
                browser: a.browser,
                severity: a.severity,
            })),
            activeSessions: activeSessions.map((s: any) => ({
                id: s._id,
                ipAddress: s.ipAddress || "Unknown",
                userAgent: s.userAgent || "Unknown",
                deviceType: s.deviceType || "Unknown",
                lastActiveAt: s.lastActiveAt,
                createdAt: s.createdAt,
            })),
        });
    } catch (error: any) {
        console.error("[Employee Detail] GET error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ═════════════════════════════════════════════════════════════════
// PUT: Update employee (status, permissions, profile, reset pwd)
// ═════════════════════════════════════════════════════════════════
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireAdmin();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { id } = await params;
        const admin = result.user!;
        const adminId = admin._id.toString();
        const body = await request.json();
        const db = await getDb();

        const ipAddress = getClientIp(request);
        const userAgent = request.headers.get("user-agent") || undefined;

        const employee = await db.collection("users").findOne(
            { _id: id as any, adminId, role: "Staff" }
        );
        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        const action = body.action;

        // ─── Action: Toggle Status (active/inactive) ─────
        if (action === "toggle_status") {
            const newStatus = employee.status === "active" ? "inactive" : "active";

            await db.collection("users").updateOne(
                { _id: id as any },
                { $set: { status: newStatus, updatedAt: new Date() } }
            );

            // Kill all sessions if deactivating
            if (newStatus === "inactive") {
                await destroyAllUserSessions(id);
            }

            logAudit({
                organizationId: (admin as any).organizationId || adminId,
                userId: adminId,
                userName: admin.fullName || admin.full_name || admin.email,
                userRole: "Admin",
                action: `${newStatus === "active" ? "Activated" : "Deactivated"} employee ${employee.fullName || employee.employeeId}`,
                actionType: "update",
                module: "team",
                resourceId: id,
                resourceType: "employee",
                severity: newStatus === "inactive" ? "warning" : "info",
                ipAddress,
                userAgent,
            });

            return NextResponse.json({ ok: true, status: newStatus });
        }

        // ─── Action: Reset Password (auto-generate) ─────
        if (action === "reset_password") {
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
            let newPassword = "";
            for (let i = 0; i < 12; i++) {
                newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const passwordHash = await bcrypt.hash(newPassword, 10);

            await db.collection("users").updateOne(
                { _id: id as any },
                {
                    $set: {
                        passwordHash,
                        tempPasswordActive: true,
                        failedLoginAttempts: 0,
                        lockedUntil: undefined,
                        updatedAt: new Date(),
                    },
                }
            );

            // Kill all active sessions
            await destroyAllUserSessions(id);

            logAudit({
                organizationId: (admin as any).organizationId || adminId,
                userId: adminId,
                userName: admin.fullName || admin.full_name || admin.email,
                userRole: "Admin",
                action: `Reset password for ${employee.fullName || employee.employeeId}`,
                actionType: "security" as any,
                module: "team",
                resourceId: id,
                resourceType: "employee",
                severity: "warning",
                ipAddress,
                userAgent,
            });

            return NextResponse.json({ ok: true, tempPassword: newPassword });
        }

        // ─── Action: Change Password (admin-typed) ──────
        if (action === "change_password") {
            const { newPassword, adminPassword } = body;

            if (!newPassword || typeof newPassword !== "string") {
                return NextResponse.json(
                    { error: "New password is required" },
                    { status: 400 }
                );
            }

            // Verify admin's own password if provided (security confirmation)
            if (adminPassword) {
                const adminDoc = await db.collection("users").findOne({ _id: admin._id as any });
                if (!adminDoc?.passwordHash) {
                    return NextResponse.json(
                        { error: "Admin password verification failed" },
                        { status: 403 }
                    );
                }
                const adminPwdValid = await bcrypt.compare(adminPassword, adminDoc.passwordHash);
                if (!adminPwdValid) {
                    return NextResponse.json(
                        { error: "Incorrect admin password. Please try again." },
                        { status: 403 }
                    );
                }
            }

            // Validate password strength using enterprise password policy
            const { checkPasswordOrError } = await import("@/lib/password-policy");
            const passwordError = checkPasswordOrError(newPassword, {
                fullName: employee.fullName || employee.full_name,
            });
            if (passwordError) {
                return NextResponse.json({ error: passwordError }, { status: 400 });
            }

            const passwordHash = await bcrypt.hash(newPassword, 12);

            await db.collection("users").updateOne(
                { _id: id as any },
                {
                    $set: {
                        passwordHash,
                        passwordChangedAt: new Date(),
                        tempPasswordActive: false,
                        failedLoginAttempts: 0,
                        lockedUntil: undefined,
                        updatedAt: new Date(),
                    },
                }
            );

            // Kill all active sessions (force re-login with new password)
            await destroyAllUserSessions(id);

            logAudit({
                organizationId: (admin as any).organizationId || adminId,
                userId: adminId,
                userName: admin.fullName || admin.full_name || admin.email,
                userRole: "Admin",
                action: `Admin ${admin.fullName || admin.full_name || admin.email} changed password for Staff ${employee.fullName || employee.employeeId} at ${new Date().toISOString()}`,
                actionType: "security" as any,
                module: "team",
                resourceId: id,
                resourceType: "employee",
                severity: "warning",
                ipAddress,
                userAgent,
            });

            return NextResponse.json({
                ok: true,
                message: `Password updated successfully for ${employee.fullName || employee.employeeId}`,
            });
        }

        // ─── Action: Unlock Account ──────────────────────
        if (action === "unlock_account") {
            await db.collection("users").updateOne(
                { _id: id as any },
                {
                    $set: {
                        failedLoginAttempts: 0,
                        lockedUntil: undefined,
                        updatedAt: new Date(),
                    },
                }
            );

            logAudit({
                organizationId: (admin as any).organizationId || adminId,
                userId: adminId,
                userName: admin.fullName || admin.full_name || admin.email,
                userRole: "Admin",
                action: `Unlocked account for ${employee.fullName || employee.employeeId}`,
                actionType: "security" as any,
                module: "team",
                resourceId: id,
                resourceType: "employee",
                severity: "info",
                ipAddress,
                userAgent,
            });

            return NextResponse.json({ ok: true });
        }

        // ─── Action: Terminate All Sessions ──────────────
        if (action === "terminate_sessions") {
            await destroyAllUserSessions(id);

            logAudit({
                organizationId: (admin as any).organizationId || adminId,
                userId: adminId,
                userName: admin.fullName || admin.full_name || admin.email,
                userRole: "Admin",
                action: `Terminated all sessions for ${employee.fullName || employee.employeeId}`,
                actionType: "security" as any,
                module: "team",
                resourceId: id,
                resourceType: "employee",
                severity: "warning",
                ipAddress,
                userAgent,
            });

            return NextResponse.json({ ok: true });
        }

        // ─── Action: Update Permissions ──────────────────
        if (action === "update_permissions") {
            const templateId = body.templateId;
            let newPermissions: PermissionMap;

            // Map template ID to role preset
            const roleKey = templateId as keyof typeof ROLE_PRESETS;
            if (templateId && ROLE_PRESETS[roleKey]) {
                newPermissions = ROLE_PRESETS[roleKey].permissions;
            } else if (body.permissions) {
                newPermissions = body.permissions;
            } else {
                return NextResponse.json({ error: "Permissions or template required" }, { status: 400 });
            }

            const beforePermissions = employee.permissions || EMPTY_PERMISSIONS;

            await db.collection("users").updateOne(
                { _id: id as any },
                {
                    $set: {
                        permissions: newPermissions,
                        permissionTemplateId: templateId || "custom",
                        updatedAt: new Date(),
                    },
                }
            );

            logPermissionChange({
                organizationId: (admin as any).organizationId || adminId,
                userId: adminId,
                userName: admin.fullName || admin.full_name || admin.email,
                targetUserId: id,
                targetUserName: employee.fullName || employee.employeeId || "Staff",
                beforePermissions: beforePermissions as any,
                afterPermissions: newPermissions as any,
                ipAddress,
                userAgent,
            });

            return NextResponse.json({ ok: true, permissions: newPermissions, templateId: templateId || "custom" });
        }

        // ─── Action: Update Profile ──────────────────────
        if (action === "update_profile") {
            const updates: Record<string, any> = { updatedAt: new Date() };

            if (body.fullName !== undefined) {
                updates.fullName = body.fullName.trim();
                updates.full_name = body.fullName.trim();
            }
            if (body.email !== undefined) {
                const newEmail = body.email.trim().toLowerCase();
                // Check uniqueness
                if (newEmail && newEmail !== employee.email) {
                    const existing = await db.collection("users").findOne({ email: newEmail, _id: { $ne: id as any } });
                    if (existing) {
                        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
                    }
                }
                updates.email = newEmail;
            }
            if (body.phone !== undefined) updates.phone = body.phone.trim();
            if (body.department !== undefined) updates.department = body.department.trim();
            if (body.designation !== undefined) updates.designation = body.designation.trim();

            await db.collection("users").updateOne(
                { _id: id as any },
                { $set: updates }
            );

            logAudit({
                organizationId: (admin as any).organizationId || adminId,
                userId: adminId,
                userName: admin.fullName || admin.full_name || admin.email,
                userRole: "Admin",
                action: `Updated profile for ${employee.fullName || employee.employeeId}`,
                actionType: "update",
                module: "team",
                resourceId: id,
                resourceType: "employee",
                beforeState: { fullName: employee.fullName, email: employee.email, phone: employee.phone, department: employee.department, designation: employee.designation },
                afterState: updates,
                severity: "info",
                ipAddress,
                userAgent,
            });

            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        console.error("[Employee Detail] PUT error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ═════════════════════════════════════════════════════════════════
// DELETE: Permanently remove employee (Admin only)
// ═════════════════════════════════════════════════════════════════
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireAdmin();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { id } = await params;
        const admin = result.user!;
        const adminId = admin._id.toString();
        const db = await getDb();

        const employee = await db.collection("users").findOne(
            { _id: id as any, adminId, role: "Staff" }
        );
        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        // Kill all sessions first
        await destroyAllUserSessions(id);

        // Delete the user
        await db.collection("users").deleteOne({ _id: id as any });

        const ipAddress = getClientIp(request);
        const userAgent = request.headers.get("user-agent") || undefined;

        logAudit({
            organizationId: (admin as any).organizationId || adminId,
            userId: adminId,
            userName: admin.fullName || admin.full_name || admin.email,
            userRole: "Admin",
            action: `Permanently deleted employee ${employee.fullName || employee.employeeId}`,
            actionType: "delete",
            module: "team",
            resourceId: id,
            resourceType: "employee",
            severity: "critical",
            ipAddress,
            userAgent,
        });

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("[Employee Detail] DELETE error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
