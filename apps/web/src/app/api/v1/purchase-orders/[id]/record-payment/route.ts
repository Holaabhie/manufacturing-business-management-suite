/**
 * Record Vendor Payment — /api/v1/purchase-orders/[id]/record-payment
 * ─────────────────────────────────────────────────────────
 * POST — Record a payment against a purchase order.
 *        Cumulatively adds to paidAmount (never overwrites).
 *        Stores a single last-payment snapshot (no history ledger).
 */

import { NextResponse, NextRequest } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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

        const date = body.date;
        if (!date) {
            return NextResponse.json(
                { error: "Payment date is required" },
                { status: 400 },
            );
        }

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
    } catch (error: any) {
        console.error("Error recording payment:", error);
        const status = error.statusCode || 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}
