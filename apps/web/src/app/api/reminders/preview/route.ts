import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getReminderService } from "@/modules/reminders";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function POST(request: NextRequest) {
    try {
        const auth = await requireRole(ALLOWED_ROLES);
        if (auth.error || !auth.user) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(request.url);
        let asOf = searchParams.get("asOf") || searchParams.get("as_of") || undefined;

        if (!asOf) {
            try {
                const body = await request.json();
                if (body && typeof body.asOf === "string") {
                    asOf = body.asOf;
                }
            } catch {
                // Body is optional
            }
        }

        const tenantId = getDataOwnerId(auth.user);
        const service = getReminderService();

        const previewResult = await service.previewReminders(tenantId, asOf);

        return NextResponse.json({ success: true, ...previewResult });
    } catch (err: any) {
        console.error("[Reminders API] POST /preview error:", err);
        return NextResponse.json(
            { error: err?.message || "Failed to generate reminder preview" },
            { status: 500 }
        );
    }
}
