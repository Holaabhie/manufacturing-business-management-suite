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
    const userId = getDataOwnerId(user);

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Use parallel promise execution with efficient queries
    const [
      clientCount,
      newClientsThisWeek,
      activeOrders,
      orderStats,
      lastMonthRevenue,
      prevMonthRevenue,
      paymentStats,
      lowStockCount,
      inventoryValue,
      pendingPayments,
      ordersInProduction,
      ordersReady,
      todaysProduction
    ] = await Promise.all([
      // Total clients count
      db.collection("clients").countDocuments({ userId }),

      // New clients this week
      db.collection("clients").countDocuments({
        userId,
        createdAt: { $gte: oneWeekAgo }
      }),

      // Active orders count (NOT fully completed = NOT(prod done AND pay done) = $or by De Morgan)
      db.collection("orders").countDocuments({
        userId,
        $or: [
          { production_status: { $ne: "completed" } },
          { production_status: { $exists: false } },
          { payment_status: { $ne: "paid" } }
        ]
      }),

      // Total revenue from orders
      db.collection("orders").aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: { $toDouble: "$total_amount" } } } }
      ]).toArray(),

      // Last month revenue
      db.collection("orders").aggregate([
        { $match: { userId, createdAt: { $gte: oneMonthAgo } } },
        { $group: { _id: null, total: { $sum: { $toDouble: "$total_amount" } } } }
      ]).toArray(),

      // Previous month revenue (for growth calculation)
      db.collection("orders").aggregate([
        { $match: { userId, createdAt: { $gte: twoMonthsAgo, $lt: oneMonthAgo } } },
        { $group: { _id: null, total: { $sum: { $toDouble: "$total_amount" } } } }
      ]).toArray(),

      // Total payments collected
      db.collection("payments").aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: { $toDouble: "$amount" } } } }
      ]).toArray(),

      // Low stock items count
      db.collection("inventory").countDocuments({
        userId,
        $expr: { $lte: ["$quantity", "$min_stock_level"] }
      }),

      // Total inventory value
      db.collection("inventory").aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: [
                  { $toDouble: "$quantity" },
                  { $toDouble: "$purchase_cost_per_unit" }
                ]
              }
            }
          }
        }
      ]).toArray(),

      // Pending payments (orders not paid)
      db.collection("orders").countDocuments({
        userId,
        payment_status: { $ne: "paid" }
      }),

      // Orders in production (processing)
      db.collection("orders").countDocuments({
        userId,
        production_status: "processing"
      }),

      // Orders ready for dispatch (production completed)
      db.collection("orders").countDocuments({
        userId,
        production_status: "completed"
      }),

      // Today's production (orders updated today)
      db.collection("orders").countDocuments({
        userId,
        updatedAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      })
    ]);

    const totalRevenue = orderStats[0]?.total || 0;
    const totalCollected = paymentStats[0]?.total || 0;
    const totalOutstanding = totalRevenue - totalCollected;
    const totalStockValue = inventoryValue[0]?.total || 0;

    const lastMonthRev = lastMonthRevenue[0]?.total || 0;
    const prevMonthRev = prevMonthRevenue[0]?.total || 0;
    const revenueGrowth = prevMonthRev > 0
      ? ((lastMonthRev - prevMonthRev) / prevMonthRev) * 100
      : 0;

    return NextResponse.json({
      totalClients: clientCount,
      newClientsThisWeek,
      activeOrders,
      totalRevenue,
      totalCollected,
      totalOutstanding,
      lowStockItems: lowStockCount,
      totalStockValue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      // New widget metrics
      pendingPayments,
      ordersInProduction,
      ordersReady,
      todaysProduction
    });
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
