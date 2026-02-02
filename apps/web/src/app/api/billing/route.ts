import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/require-role";
import { ObjectId } from "mongodb";

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
            .find({ userId: user._id.toString() })
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

export async function POST(request: NextRequest) {
    try {
        // Admin-only: Staff cannot create bills
        const result = await requireAdmin();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const user = result.user;

        const body = await request.json();
        const db = await getDb();

        const billData = {
            userId: user._id.toString(),
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
        };

        const insertResult = await db.collection("bills").insertOne(billData);

        // Log activity
        await db.collection("activity").insertOne({
            userId: user._id.toString(),
            type: "billing",
            message: `Invoice ${billData.billNumber} created for ${billData.clientName}`,
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({
            id: insertResult.insertedId.toString(),
            ...billData,
        });
    } catch (error) {
        console.error("Error creating bill:", error);
        return NextResponse.json({ error: "Failed to create bill" }, { status: 500 });
    }
}
