import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const userId = user._id.toString();

    const lowStock = await db
      .collection("inventory")
      .find({
        userId,
        $expr: { $lte: ["$quantity", "$min_stock_level"] },
      })
      .limit(5)
      .toArray();

    const formatted = lowStock.map((item: any) => ({
      id: item._id.toString(),
      name: item.name,
      quantity: item.quantity,
      min_stock_level: item.min_stock_level,
      unit: item.unit,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching low stock:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
