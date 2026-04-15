import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "daily";

    const db = await getDb();
    const userId = getDataOwnerId(user);

    const orders = await db.collection("orders").find({ userId }).toArray();

    // Group by time range
    const grouped: Record<string, number> = {};
    const now = new Date();

    orders.forEach((order: any) => {
      const orderDate = new Date(order.createdAt);
      let key: string;

      if (range === "daily") {
        const daysAgo = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        key = `${daysAgo} days ago`;
      } else if (range === "weekly") {
        const weekStart = new Date(orderDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        // monthly
        key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}`;
      }

      grouped[key] = (grouped[key] || 0) + Number(order.total_amount || 0);
    });

    const chartData = Object.entries(grouped)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(chartData);
  } catch (error: any) {
    console.error("Error fetching revenue chart:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
