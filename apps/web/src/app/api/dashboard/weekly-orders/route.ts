import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/**
 * Returns orders grouped by day for the current ISO week (Monday to Sunday).
 * Response: { data: [{ day: "Mon", value: 3 }, { day: "Tue", value: 0 }, ...] }
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const userId = getDataOwnerId(user);

    // Calculate current ISO week boundaries (Monday 00:00 to Sunday 23:59:59.999)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    // Convert to ISO day offset: Monday = 0, Sunday = 6
    const isoOffset = currentDay === 0 ? 6 : currentDay - 1;

    const monday = new Date(now);
    monday.setDate(now.getDate() - isoOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Query orders within this ISO week
    const orders = await db
      .collection("orders")
      .find({
        userId,
        createdAt: {
          $gte: monday.toISOString(),
          $lte: sunday.toISOString(),
        },
      })
      .project({ createdAt: 1 })
      .toArray();

    // Also try with Date objects in case createdAt is stored as Date
    let ordersFromDates: any[] = [];
    if (orders.length === 0) {
      ordersFromDates = await db
        .collection("orders")
        .find({
          userId,
          createdAt: {
            $gte: monday,
            $lte: sunday,
          },
        })
        .project({ createdAt: 1 })
        .toArray();
    }

    const allOrders = orders.length > 0 ? orders : ordersFromDates;

    // Initialize counts for Mon–Sun (ISO order)
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayCounts: Record<string, number> = {};
    dayNames.forEach((d) => (dayCounts[d] = 0));

    // Count orders per day
    allOrders.forEach((order: any) => {
      const orderDate = new Date(order.createdAt);
      const jsDay = orderDate.getDay(); // 0 = Sunday
      // Map JS day to ISO day name
      const isoIndex = jsDay === 0 ? 6 : jsDay - 1;
      const dayName = dayNames[isoIndex];
      if (dayName) dayCounts[dayName] += 1;
    });

    const data = dayNames.map((d) => ({ day: d, value: dayCounts[d] || 0 }));

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error fetching weekly orders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
