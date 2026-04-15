import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const items = await db
      .collection("inventory")
      .find({ userId: getDataOwnerId(user) })
      .sort({ name: 1 })
      .toArray();

    const formatted = items.map((item: any) => ({
      id: item._id.toString(),
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      min_stock_level: item.min_stock_level,
      supplier_whatsapp: item.supplier_whatsapp,
      purchase_cost_per_unit: item.purchase_cost_per_unit,
      createdAt: item.createdAt,
      created_at: item.createdAt,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const db = await getDb();

    const result = await db.collection("inventory").insertOne({
      userId: getDataOwnerId(user),
      name: body.name,
      quantity: Number(body.quantity) || 0,
      unit: body.unit || "kg",
      min_stock_level: Number(body.min_stock_level) || 10,
      supplier_whatsapp: body.supplier_whatsapp || "",
      purchase_cost_per_unit: Number(body.purchase_cost_per_unit) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const item = await db.collection("inventory").findOne({ _id: result.insertedId });

    return NextResponse.json({
      id: item!._id.toString(),
      ...item,
    });
  } catch (error: any) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
