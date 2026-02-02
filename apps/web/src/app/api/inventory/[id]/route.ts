import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
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

    const body = await request.json();
    const db = await getDb();

    const result = await db.collection("inventory").updateOne(
      { _id: new ObjectId(id), userId: user._id.toString() },
      {
        $set: {
          name: body.name,
          quantity: Number(body.quantity) || 0,
          unit: body.unit || "kg",
          min_stock_level: Number(body.min_stock_level) || 10,
          supplier_whatsapp: body.supplier_whatsapp || "",
          purchase_cost_per_unit: Number(body.purchase_cost_per_unit) || 0,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating inventory:", error);
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

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("inventory").deleteOne({
      _id: new ObjectId(id),
      userId: user._id.toString(),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Item not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting inventory:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
