import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { triggerNotification } from "@/lib/notifications/dispatcher";
import { getFinancialYear } from "@/lib/utils/financial-year";

export async function GET() {
    try {
        // Admin-only: Staff cannot view billing
        const result = await requireAdmin();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const user = result.user;

        const db = await getDb();
        const bills = await db
            .collection("bills")
            .find({ userId: getDataOwnerId(user!) })
            .sort({ created_at: -1 })
            .toArray();

        return NextResponse.json(
            bills.map((bill) => ({
                id: bill._id.toString(),
                billNumber: bill.billNumber,
                billDate: bill.billDate,
                dueDate: bill.dueDate,
                client_id: bill.client_id,
                clientName: bill.clientName,
                clientAddress: bill.clientAddress,
                clientGSTIN: bill.clientGSTIN,
                clientPhone: bill.clientPhone,
                clientEmail: bill.clientEmail,
                items: bill.items,
                subtotal: bill.subtotal,
                cgstAmount: bill.cgstAmount,
                sgstAmount: bill.sgstAmount,
                igstAmount: bill.igstAmount,
                totalAmount: bill.totalAmount,
                amountInWords: bill.amountInWords,
                notes: bill.notes,
                terms: bill.terms,
                status: bill.status,
                created_at: bill.created_at,
            }))
        );
    } catch (error) {
        console.error("Error fetching bills:", error);
        return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
    }
}

/**
 * POST /api/billing — Create a new invoice
 * 
 * Protected by:
 *   1. Role check (Admin only)
 *   2. Idempotency key (prevents duplicate submissions)
 *   3. Unique billNumber check (database-level safety net)
 */
export const POST = withIdempotency(async (request: NextRequest) => {
    try {
        // Admin-only: Staff cannot create bills
        const result = await requireAdmin();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const user = result.user;

        const body = await request.json();
        const db = await getDb();

        // ── Layer 3: Safe-save — check for existing billNumber ──
        if (body.billNumber) {
            const existing = await db.collection("bills").findOne({
                billNumber: body.billNumber,
                userId: getDataOwnerId(user!),
            });

            if (existing) {
                console.warn(
                    `[billing] Duplicate billNumber blocked: ${body.billNumber} user=${user!._id}`
                );
                return NextResponse.json(
                    {
                        error: "Duplicate invoice number",
                        message: `Invoice ${body.billNumber} already exists.`,
                        code: "DUPLICATE_BILL_NUMBER",
                        existingId: existing._id.toString(),
                    },
                    { status: 409 },
                );
            }
        }

        const billData = {
            userId: getDataOwnerId(user!),
            billNumber: body.billNumber,
            billDate: body.billDate,
            dueDate: body.dueDate,
            client_id: body.client_id,
            clientName: body.clientName,
            clientAddress: body.clientAddress || "",
            clientGSTIN: body.clientGSTIN || "",
            clientPhone: body.clientPhone || "",
            clientEmail: body.clientEmail || "",
            items: body.items || [],
            subtotal: body.subtotal || 0,
            cgstAmount: body.cgstAmount || 0,
            sgstAmount: body.sgstAmount || 0,
            igstAmount: body.igstAmount || 0,
            totalAmount: body.totalAmount || 0,
            amountInWords: body.amountInWords || "",
            notes: body.notes || "",
            terms: body.terms || "",
            status: body.status || "draft",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            financial_year: getFinancialYear(body.billDate || new Date()),
        };

        const insertResult = await db.collection("bills").insertOne(billData);

        // Log activity
        await db.collection("activity").insertOne({
            userId: getDataOwnerId(user!),
            type: "billing",
            message: `Invoice ${billData.billNumber} created for ${billData.clientName}`,
            createdAt: new Date().toISOString(),
        });

        // ── Trigger notification for invoice generated ──
        triggerNotification({
            eventType: "invoice_generated",
            payload: {
                invoiceId: insertResult.insertedId.toString(),
                clientName: billData.clientName,
                amount: billData.totalAmount,
            },
            triggeredBy: getDataOwnerId(user!),
        }).catch(() => {}); // fire-and-forget

        return NextResponse.json({
            id: insertResult.insertedId.toString(),
            ...billData,
        });
    } catch (error: any) {
        // Handle MongoDB duplicate key error (unique index on billNumber)
        if (error.code === 11000) {
            return NextResponse.json(
                {
                    error: "Duplicate invoice",
                    message: "An invoice with this number already exists.",
                    code: "DUPLICATE_KEY",
                },
                { status: 409 },
            );
        }

        console.error("Error creating bill:", error);
        return NextResponse.json({ error: "Failed to create bill" }, { status: 500 });
    }
});
