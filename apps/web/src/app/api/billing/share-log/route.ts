/**
 * Billing Share Log — /api/billing/share-log
 *
 * Logs invoice share actions and triggers a notification
 * so the notification page updates immediately.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { triggerNotification } from "@/lib/notifications/dispatcher";

export async function POST(request: Request) {
    try {
        const result = await requireAdmin();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const user = result.user;
        const userId = getDataOwnerId(user!);

        const { billId, billNumber, clientName, totalAmount, channel } = await request.json();

        if (!billId || !channel) {
            return NextResponse.json(
                { error: "billId and channel are required" },
                { status: 400 },
            );
        }

        const db = await getDb();

        // Log activity (same pattern as invoice creation L126-131)
        await db.collection("activity").insertOne({
            userId,
            type: "invoice_shared",
            message: `Invoice ${billNumber || billId} shared via ${channel} to ${clientName || "client"}`,
            channel,
            billId,
            createdAt: new Date().toISOString(),
        });

        // Trigger notification so notification page updates
        triggerNotification({
            eventType: "invoice_generated",
            payload: {
                invoiceId: billId,
                clientName: clientName || "Client",
                amount: totalAmount || 0,
                action: "shared",
                channel,
            },
            triggeredBy: userId,
        }).catch(() => {}); // fire-and-forget

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error logging share:", error);
        return NextResponse.json({ error: "Failed to log share" }, { status: 500 });
    }
}
