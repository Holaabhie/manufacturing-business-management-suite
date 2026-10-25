import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
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
    const order = await db.collection("orders").findOne({
      _id: new ObjectId(id),
      userId: getDataOwnerId(user),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const materials = await db
      .collection("client_materials")
      .find({
        client_id: order.client_id,
        userId: getDataOwnerId(user),
      })
      .toArray();

    const formatted = materials.map((m: Record<string, unknown>) => ({
      id: String(m._id),
      name: m.name,
      type: m.type,
      default_rate: m.default_rate,
    }));

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error("Error fetching client materials:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
