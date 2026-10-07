import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getReminderService, updateReminderRuleSchema } from "@/modules/reminders";
import { logAudit } from "@/lib/audit";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireRole(ALLOWED_ROLES);
        if (auth.error || !auth.user) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { id } = await context.params;
        const tenantId = getDataOwnerId(auth.user);
        const service = getReminderService();

        const existingRule = await service.getRule(tenantId, id);
        if (!existingRule) {
            return NextResponse.json({ error: "Reminder rule not found" }, { status: 404 });
        }

        const body = await request.json();
        const parseResult = updateReminderRuleSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                {
                    error: "Validation failed",
                    details: parseResult.error.flatten(),
                },
                { status: 400 }
            );
        }

        const updatedRule = await service.updateRule(tenantId, id, parseResult.data);
        if (!updatedRule) {
            return NextResponse.json({ error: "Reminder rule not found" }, { status: 404 });
        }

        // Audit log
        await logAudit({
            organizationId: (auth.user as any).organizationId || tenantId,
            userId: String(auth.user._id),
            userName: auth.user.fullName || auth.user.full_name || auth.user.email || "User",
            userRole: auth.user.role === "Admin" ? "Admin" : "Staff",
            userRoleDetail: auth.user.role,
            action: `Updated payment reminder rule "${updatedRule.name}"`,
            actionType: "update",
            module: "reminders",
            resourceId: updatedRule.id,
            resourceType: "reminder_rule",
            beforeState: existingRule as any,
            afterState: updatedRule as any,
            severity: "info",
        });

        return NextResponse.json({ success: true, rule: updatedRule });
    } catch (err: any) {
        console.error("[Reminders API] PATCH /rules/[id] error:", err);
        return NextResponse.json(
            { error: err?.message || "Failed to update reminder rule" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireRole(ALLOWED_ROLES);
        if (auth.error || !auth.user) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { id } = await context.params;
        const tenantId = getDataOwnerId(auth.user);
        const service = getReminderService();

        const existingRule = await service.getRule(tenantId, id);
        if (!existingRule) {
            return NextResponse.json({ error: "Reminder rule not found" }, { status: 404 });
        }

        const success = await service.deleteRule(tenantId, id);
        if (!success) {
            return NextResponse.json({ error: "Failed to delete reminder rule" }, { status: 500 });
        }

        // Audit log
        await logAudit({
            organizationId: (auth.user as any).organizationId || tenantId,
            userId: String(auth.user._id),
            userName: auth.user.fullName || auth.user.full_name || auth.user.email || "User",
            userRole: auth.user.role === "Admin" ? "Admin" : "Staff",
            userRoleDetail: auth.user.role,
            action: `Deleted payment reminder rule "${existingRule.name}"`,
            actionType: "delete",
            module: "reminders",
            resourceId: existingRule.id,
            resourceType: "reminder_rule",
            beforeState: existingRule as any,
            severity: "info",
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[Reminders API] DELETE /rules/[id] error:", err);
        return NextResponse.json(
            { error: err?.message || "Failed to delete reminder rule" },
            { status: 500 }
        );
    }
}
