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

    const [orders, inventory, clients, payments] = await Promise.all([
      db
        .collection("orders")
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray(),
      db
        .collection("inventory")
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray(),
      db
        .collection("clients")
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray(),
      db
        .collection("payments")
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray(),
    ]);

    const activity = [
      ...orders.map((o: any) => ({
        type: "order",
        message: `Order created: ${o.product_name}`,
        createdAt: o.createdAt,
      })),
      ...inventory.map((i: any) => ({
        type: "inventory",
        message: `Inventory updated: ${i.name}`,
        createdAt: i.createdAt,
      })),
      ...clients.map((c: any) => ({
        type: "client",
        message: `Client added: ${c.name}`,
        createdAt: c.createdAt,
      })),
      ...payments.map((p: any) => ({
        type: "payment",
        message: `Payment received: ₹${p.amount}`,
        createdAt: p.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return NextResponse.json(activity);
  } catch (error: any) {
    console.error("Error fetching activity:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
