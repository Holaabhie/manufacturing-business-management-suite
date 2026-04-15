import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const body = await request.json();
    const db = await getDb();

    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(id), userId: getDataOwnerId(user) },
      {
        $set: {
          client_id: body.client_id,
          product_name: body.product_name,
          quantity: Number(body.quantity),
          rate: Number(body.rate),
          total_amount: Number(body.total_amount),
          delivery_date: body.delivery_date || null,
          status: body.status,
          payment_status: body.payment_status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("orders").deleteOne({
      _id: new ObjectId(id),
      userId: getDataOwnerId(user),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Order not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
