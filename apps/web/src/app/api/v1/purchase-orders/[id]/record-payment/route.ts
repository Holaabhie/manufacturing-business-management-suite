/**
 * Record Vendor Payment — /api/v1/purchase-orders/[id]/record-payment
 * ─────────────────────────────────────────────────────────
 * POST — Record a payment against a purchase order.
 *        Cumulatively adds to paidAmount (never overwrites).
 *        Stores a single last-payment snapshot (no history ledger).
 */

import { NextResponse, NextRequest } from "next/server";
import { getDataOwnerId } from "@/lib/auth-session";
import { requireRole } from "@/lib/require-role";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const authResult = await requireRole(["Owner", "Admin", "Manager", "Accountant"]);
        if (authResult.error || !authResult.user) {
            return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 });
        }
        const user = authResult.user;

        const { id } = await params;
        const userId = getDataOwnerId(user);
        const body = await request.json();

        // Validate required fields
        const amount = Number(body.amount);
        if (!amount || amount <= 0) {
            return NextResponse.json(
                { error: "Amount must be a positive number" },
                { status: 400 },
            );
        }

        const mode = body.mode;
        if (!mode || !["Cash", "UPI", "Bank", "Cheque"].includes(mode)) {
            return NextResponse.json(
                { error: "Invalid payment mode" },
                { status: 400 },
            );
        }

        const rawDate = body.date || body.payment_date;
        if (!rawDate) {
            return NextResponse.json(
                { error: "Payment date is required" },
                { status: 400 },
            );
        }

        // Reject payment date in the future (compared in IST YYYY-MM-DD)
        const parsedDate = new Date(rawDate);
        if (isNaN(parsedDate.getTime())) {
            return NextResponse.json(
                { error: "Invalid payment date" },
                { status: 400 },
            );
        }
        const dateStr = typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(rawDate)
            ? rawDate.slice(0, 10)
            : new Date(parsedDate.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const todayIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
        if (dateStr > todayIST) {
            return NextResponse.json(
                { error: "Payment date cannot be in the future" },
                { status: 400 },
            );
        }
        const date = rawDate;

        // Fetch the PO — scoped to userId for security
        const db = await getDb();
        let objectId: ObjectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const po = await db.collection("purchase_orders").findOne({
            _id: objectId,
            userId,
        });

        if (!po) {
            return NextResponse.json(
                { error: "Purchase order not found" },
                { status: 404 },
            );
        }

        // Cumulative — add to existing paidAmount
        const currentPaid = Number(po.paidAmount) || 0;
        const newPaidAmount = currentPaid + amount;

        // Update the document
        const updateFields: Record<string, unknown> = {
            paidAmount: newPaidAmount,
            lastPaymentMode: mode,
            lastPaymentDate: date,
            lastPaymentReference: body.reference || "",
            lastPaymentNotes: body.notes || "",
            updatedAt: new Date(),
        };

        const result = await db.collection("purchase_orders").findOneAndUpdate(
            { _id: objectId, userId },
            { $set: updateFields },
            { returnDocument: "after" },
        );

        if (!result) {
            return NextResponse.json(
                { error: "Failed to update purchase order" },
                { status: 500 },
            );
        }

        // Return the updated PO in the same envelope format
        return NextResponse.json({
            success: true,
            data: {
                id: result._id.toString(),
                poNumber: result.poNumber,
                vendorId: result.vendorId,
                vendorName: result.vendorName,
                items: result.items,
                status: result.status,
                subtotal: result.subtotal,
                taxAmount: result.taxAmount,
                totalAmount: result.totalAmount,
                paidAmount: result.paidAmount ?? 0,
                notes: result.notes,
                orderedAt: result.orderedAt,
                receivedAt: result.receivedAt,
                lastPaymentMode: result.lastPaymentMode,
                lastPaymentDate: result.lastPaymentDate,
                lastPaymentReference: result.lastPaymentReference,
                lastPaymentNotes: result.lastPaymentNotes,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
            },
        });
    } catch (error: unknown) {
        console.error("Error recording payment:", error);
        const status = (error as { statusCode?: number })?.statusCode || 500;
        return NextResponse.json({ error: (error as Error).message }, { status });
    }
}
