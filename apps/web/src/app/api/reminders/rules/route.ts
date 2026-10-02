import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getReminderService, createReminderRuleSchema } from "@/modules/reminders";
import { logAudit } from "@/lib/audit";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function GET() {
    try {
        const auth = await requireRole(ALLOWED_ROLES);
        if (auth.error || !auth.user) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const tenantId = getDataOwnerId(auth.user);
        const service = getReminderService();
        const rules = await service.listRules(tenantId);

        return NextResponse.json({ success: true, rules });
    } catch (err: any) {
        console.error("[Reminders API] GET /rules error:", err);
        return NextResponse.json(
            { error: err?.message || "Failed to fetch reminder rules" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireRole(ALLOWED_ROLES);
        if (auth.error || !auth.user) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await request.json();
        const parseResult = createReminderRuleSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                {
                    error: "Validation failed",
                    details: parseResult.error.flatten(),
                },
                { status: 400 }
            );
        }

        const tenantId = getDataOwnerId(auth.user);
        const service = getReminderService();
        const createdBy = auth.user.email || String(auth.user._id);

        const rule = await service.createRule(tenantId, createdBy, parseResult.data);

        // Audit log
        await logAudit({
            organizationId: (auth.user as any).organizationId || tenantId,
            userId: String(auth.user._id),
            userName: auth.user.fullName || auth.user.full_name || auth.user.email || "User",
            userRole: auth.user.role === "Admin" ? "Admin" : "Staff",
            action: `Created payment reminder rule "${rule.name}"`,
            actionType: "create",
            module: "reminders",
            resourceId: rule.id,
            resourceType: "reminder_rule",
            afterState: rule as any,
            severity: "info",
        });

        return NextResponse.json({ success: true, rule }, { status: 201 });
    } catch (err: any) {
        console.error("[Reminders API] POST /rules error:", err);
        return NextResponse.json(
            { error: err?.message || "Failed to create reminder rule" },
            { status: 500 }
        );
    }
}
