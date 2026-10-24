import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getDataOwnerId } from "@/lib/auth-session";
import { requireAdmin } from "@/lib/require-role";
import { ObjectId } from "mongodb";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireAdmin();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const user = result.user!;

        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
        }

        const db = await getDb();
        const bill = await db.collection("bills").findOne({
            _id: new ObjectId(id),
            userId: getDataOwnerId(user)
        });

        if (!bill) {
            return NextResponse.json({ error: "Bill not found" }, { status: 404 });
        }

        return NextResponse.json({
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
        });
    } catch (error) {
        console.error("Error fetching bill:", error);
        return NextResponse.json({ error: "Failed to fetch bill" }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resultAuth = await requireAdmin();
        if (resultAuth.error) {
            return NextResponse.json({ error: resultAuth.error }, { status: resultAuth.status });
        }
        const user = resultAuth.user!;

        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
        }

        const body = await request.json();
        const db = await getDb();
        const ownerId = getDataOwnerId(user);

        const updateData: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        // Allow updating specific fields
        const allowedFields = [
            'billDate', 'dueDate', 'items', 'subtotal', 'cgstAmount',
            'sgstAmount', 'igstAmount', 'totalAmount', 'amountInWords',
            'notes', 'terms', 'status'
        ];

        allowedFields.forEach(field => {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        });

        const result = await db.collection("bills").updateOne(
            { _id: new ObjectId(id), userId: ownerId },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "Bill not found" }, { status: 404 });
        }

        // Log activity for status changes
        if (body.status) {
            const bill = await db.collection("bills").findOne({ _id: new ObjectId(id), userId: ownerId });
            await db.collection("activity").insertOne({
                userId: ownerId,
                type: "billing",
                message: `Invoice ${bill?.billNumber} marked as ${body.status}`,
                createdAt: new Date().toISOString(),
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating bill:", error);
        return NextResponse.json({ error: "Failed to update bill" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resultAuth = await requireAdmin();
        if (resultAuth.error) {
            return NextResponse.json({ error: resultAuth.error }, { status: resultAuth.status });
        }
        const user = resultAuth.user!;

        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
        }

        const db = await getDb();
        const ownerId = getDataOwnerId(user);
        const bill = await db.collection("bills").findOne({
            _id: new ObjectId(id),
            userId: ownerId
        });

        if (!bill) {
            return NextResponse.json({ error: "Bill not found" }, { status: 404 });
        }

        await db.collection("bills").deleteOne({ _id: new ObjectId(id), userId: ownerId });

        // Log activity
        await db.collection("activity").insertOne({
            userId: ownerId,
            type: "billing",
            message: `Invoice ${bill.billNumber} deleted`,
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting bill:", error);
        return NextResponse.json({ error: "Failed to delete bill" }, { status: 500 });
    }
}
