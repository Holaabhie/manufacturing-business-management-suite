import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { DashboardWidget } from "@/models/DashboardWidget";
import { getSessionUser } from "@/lib/auth-session";
import { z } from "zod";

const widgetSchema = z.object({
    widget_type: z.string().min(1),
    widget_position: z.number().min(0).max(3),
    is_visible: z.boolean(),
});

const saveLayoutSchema = z.object({
    widgets: z.array(widgetSchema),
});

const DEFAULT_LAYOUT = [
    { widget_type: "Total Revenue", widget_position: 0, is_visible: true },
    { widget_type: "Active Orders", widget_position: 1, is_visible: true },
    { widget_type: "Total Clients", widget_position: 2, is_visible: true },
    { widget_type: "Low Stock Items", widget_position: 3, is_visible: true },
];

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = user._id.toString();

        const widgets = await DashboardWidget.find({ userId })
            .sort({ widget_position: 1 })
            .lean();

        // If no widgets are saved for the user yet, return the default layout
        if (!widgets || widgets.length === 0) {
            return NextResponse.json({ success: true, widgets: DEFAULT_LAYOUT });
        }

        return NextResponse.json({ success: true, widgets });
    } catch (error: any) {
        console.error("Error fetching dashboard widgets:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = user._id.toString();
        const organizationId = user.organizationId?.toString() || "default-org";

        const body = await req.json();
        const { widgets } = saveLayoutSchema.parse(body);

        // Process bulk update/upsert
        const operations = widgets.map((widget) => ({
            updateOne: {
                filter: { userId, widget_position: widget.widget_position },
                update: {
                    $set: {
                        userId,
                        organizationId,
                        widget_type: widget.widget_type,
                        widget_position: widget.widget_position,
                        is_visible: widget.is_visible,
                    },
                },
                upsert: true,
            },
        }));

        if (operations.length > 0) {
            await DashboardWidget.bulkWrite(operations);
        }

        return NextResponse.json({ success: true, message: "Widget layout saved successfully" });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation failed - invalid widget layout data" }, { status: 400 });
        }
        console.error("Error saving dashboard widgets:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
