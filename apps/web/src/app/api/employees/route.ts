import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/require-role";
import { ROLE_PRESETS, type FlatPermissionMap as PermissionMap } from "@/lib/permissions";
import { logAudit, getClientIp } from "@/lib/audit";

// ─── Generate unique Employee ID ─────────────────────────────────
async function generateEmployeeId(db: any, adminId: string): Promise<string> {
    // Find the highest existing employee number for this admin
    const lastEmployee = await db.collection("users")
        .find({
            $or: [
                { adminId },
                { _id: adminId },
            ],
            employeeId: { $regex: /^EMP-\d+$/ },
        })
        .sort({ employeeId: -1 })
        .limit(1)
        .toArray();

    let nextNum = 1;
    if (lastEmployee.length > 0) {
        const match = lastEmployee[0].employeeId?.match(/^EMP-(\d+)$/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    return `EMP-${String(nextNum).padStart(4, "0")}`;
}



// ═════════════════════════════════════════════════════════════════
// GET: List all employees under the current admin
// ═════════════════════════════════════════════════════════════════
export async function GET() {
    try {
        const result = await requireAdmin();
        if (result.error || !result.user) {
            return NextResponse.json({ success: false, message: result.error || "Unauthorized" }, { status: result.status || 401 });
        }

        const admin = result.user;
        const adminId = admin._id.toString();
        const db = await getDb();

        // Fetch all staff linked to this admin
        const staffUsers = await db.collection("users")
            .find(
                { adminId, role: "Staff" },
                { projection: { passwordHash: 0 } }
            )
            .sort({ createdAt: -1 })
            .toArray();

        const employees = staffUsers.map((user: any) => ({
            id: user._id.toString(),
            employeeId: user.employeeId || "—",
            fullName: user.fullName || user.full_name || "Unnamed",
            email: user.email || "",
            phone: user.phone || user.phone_number || "",
            department: user.department || "General",
            designation: user.designation || "",
            role: user.role,
            status: user.status || "active",
            permissions: user.permissions || null,
            permissionTemplate: user.permissionTemplateId || "custom",
            lastLogin: user.lastLogin || null,
            lastActiveAt: user.lastActiveAt || null,
            createdAt: user.createdAt,
            firstLoginCompleted: user.firstLoginCompleted ?? false,
            avatar_url: user.avatar_url || null,
        }));

        return NextResponse.json({ employees, total: employees.length });
    } catch (error: any) {
        console.error("[Employees API] GET error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// ═════════════════════════════════════════════════════════════════
// POST: Create a new employee (Admin only)
// ═════════════════════════════════════════════════════════════════
export async function POST(request: Request) {
    try {
        const result = await requireAdmin();
        if (result.error || !result.user) {
            return NextResponse.json({ success: false, message: result.error || "Unauthorized" }, { status: result.status || 401 });
        }

        const admin = result.user;
        const adminId = admin._id.toString();
        const body = await request.json();

        // ─── Validation ──────────────────────────────────
        const fullName = String(body.fullName ?? "").trim();
        const email = String(body.email ?? "").trim().toLowerCase();
        const phone = String(body.phone ?? "").trim();
        const department = String(body.department ?? "General").trim();
        const designation = String(body.designation ?? "").trim();
        const permissionTemplate = String(body.permissionTemplate ?? "operations");

        if (!fullName) {
            return NextResponse.json({ success: false, message: "Employee name is required" }, { status: 400 });
        }
        if (fullName.length < 2) {
            return NextResponse.json({ success: false, message: "Employee name must be at least 2 characters" }, { status: 400 });
        }
        if (!email) {
            return NextResponse.json({ success: false, message: "Email is required for staff accounts" }, { status: 400 });
        }

        const password = String(body.password ?? "");
        const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!PASSWORD_REGEX.test(password)) {
            return NextResponse.json(
                { success: false, message: "Password must be at least 8 characters with uppercase, lowercase, and a number" },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Check for duplicate email (if provided)
        if (email) {
            const existing = await db.collection("users").findOne({ email });
            if (existing) {
                return NextResponse.json(
                    { success: false, message: "An account with this email already exists" },
                    { status: 409 }
                );
            }
        }

        // ─── Generate Employee ID & Password Hash ────────
        const employeeId = await generateEmployeeId(db, adminId);
        const passwordHash = await bcrypt.hash(password, 12);
        const userId = crypto.randomUUID();
        const now = new Date();

        // ─── Resolve permissions from role preset ──────────
        let permissions: PermissionMap;
        const templateKey = permissionTemplate as keyof typeof ROLE_PRESETS;
        if (body.customPermissions) {
            permissions = body.customPermissions;
        } else if (ROLE_PRESETS[templateKey]) {
            permissions = ROLE_PRESETS[templateKey].permissions;
        } else {
            permissions = ROLE_PRESETS.Staff.permissions;
        }

        // ─── Create User Document ────────────────────────
        const newEmployee: any = {
            _id: userId,
            email: email || `${employeeId.toLowerCase()}@staff.local`,
            passwordHash,
            role: "Staff",
            subscription_tier: admin.subscription_tier || "starter",
            subscription_status: "active",
            fullName,
            full_name: fullName,
            phone: phone || undefined,
            department,
            designation,
            employeeId,
            adminId,
            organizationId: (admin as any).organizationId || adminId,
            permissions,
            permissionTemplateId: body.customPermissions ? "custom" : permissionTemplate,
            status: "active",
            firstLoginCompleted: false,
            failedLoginAttempts: 0,

            createdAt: now,
            updatedAt: now,
            invitedBy: adminId,
        };

        await db.collection("users").insertOne(newEmployee);

        // ─── Audit Log ───────────────────────────────────
        const ipAddress = getClientIp(request);
        const userAgent = request.headers.get("user-agent") || undefined;

        logAudit({
            organizationId: (admin as any).organizationId || adminId,
            userId: adminId,
            userName: admin.fullName || admin.full_name || admin.email,
            userRole: "Admin",
            action: `Created employee ${fullName} (${employeeId})`,
            actionType: "create",
            module: "team",
            resourceId: userId,
            resourceType: "employee",
            afterState: { employeeId, fullName, department, designation, permissionTemplate },
            ipAddress,
            userAgent,
            severity: "info",
        });

        console.log("[Employees API] Created:", { email, name: fullName, role: "Staff" });

        return NextResponse.json({
            success: true,
            employee: {
                id: userId,
                employeeId,
                fullName,
                email: newEmployee.email,
                phone,
                department,
                designation,
                status: "active",
                permissionTemplate,
                role: "Staff",
                firstLoginCompleted: false,
                createdAt: now.toISOString(),
            },
        });
    } catch (error: any) {
        console.error("[Employees API] POST error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
