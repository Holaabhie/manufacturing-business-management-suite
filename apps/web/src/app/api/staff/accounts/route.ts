import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId, type UserDoc } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";

/**
 * GET /api/staff/accounts
 * 
 * Feature 7: Staff Account Master Control
 * Admin can list all staff accounts under their organization.
 */
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user.role !== "Admin" && user.role !== "Owner") {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        const adminId = getDataOwnerId(user);
        const db = await getDb();

        const staffAccounts = await db
            .collection<UserDoc>("users")
            .find(
                { adminId },
                {
                    projection: {
                        passwordHash: 0,
                    },
                }
            )
            .sort({ createdAt: -1 })
            .toArray();

        const formatted = staffAccounts.map((s) => ({
            id: s._id.toString(),
            fullName: s.fullName || s.full_name || "",
            email: s.email || "",
            role: s.role,
            status: s.status || "active",
            employeeId: s.employeeId || "",
            department: s.department || "",
            phone: s.phone || s.phone_number || "",
            lastActiveAt: s.lastActiveAt || null,
            createdAt: s.createdAt || null,
            permissions: s.permissions || null,
        }));

        return NextResponse.json(formatted);
    } catch (error: unknown) {
        console.error("Error fetching staff accounts:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/staff/accounts
 * 
 * Admin creates a new staff account.
 * Body: { fullName, email, password, department?, employeeId?, permissions? }
 */
export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user.role !== "Admin" && user.role !== "Owner") {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const db = await getDb();
        const adminId = getDataOwnerId(user);

        // Validation
        if (!body.fullName || !body.email || !body.password) {
            return NextResponse.json(
                { error: "fullName, email, and password are required" },
                { status: 400 }
            );
        }

        if (body.password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        // Check email uniqueness
        const existing = await db
            .collection("users")
            .findOne({ email: body.email.toLowerCase().trim() });

        if (existing) {
            return NextResponse.json(
                { error: "An account with this email already exists" },
                { status: 409 }
            );
        }

        // Hash password (mandatory security)
        const passwordHash = await bcrypt.hash(body.password, 12);

        const now = new Date();
        const newStaff = {
            fullName: body.fullName.trim(),
            full_name: body.fullName.trim(),
            email: body.email.toLowerCase().trim(),
            passwordHash,
            role: "Staff" as const,
            adminId,
            status: "active",
            employeeId: body.employeeId?.trim() || "",
            department: body.department?.trim() || "",
            phone: body.phone?.trim() || "",
            organizationId: user.organizationId || adminId,
            permissions: body.permissions || null,
            firstLoginCompleted: false,
            subscription_tier: "starter" as const,
            createdAt: now,
            updatedAt: now,
        };

        const result = await db.collection("users").insertOne(newStaff);

        return NextResponse.json({
            success: true,
            id: result.insertedId.toString(),
            fullName: newStaff.fullName,
            email: newStaff.email,
            role: newStaff.role,
        });
    } catch (error: unknown) {
        console.error("Error creating staff account:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * PATCH /api/staff/accounts
 * 
 * Admin updates a staff account (status, permissions, etc)
 * Body: { staffId, action: "update" | "deactivate" | "activate" | "resetPassword", updates?, newPassword? }
 */
export async function PATCH(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user.role !== "Admin" && user.role !== "Owner") {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const db = await getDb();
        const adminId = getDataOwnerId(user);

        if (!body.staffId || !body.action) {
            return NextResponse.json(
                { error: "staffId and action are required" },
                { status: 400 }
            );
        }

        // Ensure target is under this admin
        const staff = await db
            .collection("users")
            .findOne({ _id: new ObjectId(body.staffId), adminId });

        if (!staff) {
            return NextResponse.json(
                { error: "Staff account not found" },
                { status: 404 }
            );
        }

        const now = new Date();
        const updates: Record<string, unknown> = { updatedAt: now };

        switch (body.action) {
            case "update":
                if (body.updates) {
                    const allowed = [
                        "fullName",
                        "department",
                        "employeeId",
                        "phone",
                        "permissions",
                    ];
                    for (const key of allowed) {
                        if (body.updates[key] !== undefined) {
                            updates[key] = body.updates[key];
                            if (key === "fullName") {
                                updates.full_name = body.updates[key];
                            }
                        }
                    }
                }
                break;

            case "deactivate":
                updates.status = "inactive";
                break;

            case "activate":
                updates.status = "active";
                break;

            case "resetPassword":
                if (!body.newPassword || body.newPassword.length < 6) {
                    return NextResponse.json(
                        { error: "New password must be at least 6 characters" },
                        { status: 400 }
                    );
                }
                updates.passwordHash = await bcrypt.hash(body.newPassword, 12);
                break;

            default:
                return NextResponse.json(
                    { error: "Invalid action" },
                    { status: 400 }
                );
        }

        const updateResult = await db.collection("users").updateOne(
            { _id: new ObjectId(body.staffId), adminId },
            { $set: updates }
        );

        if (updateResult.matchedCount === 0) {
            return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            action: body.action,
            staffId: body.staffId,
        });
    } catch (error: unknown) {
        console.error("Error updating staff account:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
