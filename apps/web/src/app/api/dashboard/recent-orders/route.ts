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

    const orders = await db
      .collection("orders")
      .aggregate([
        { $match: { userId } },
        { $sort: { createdAt: -1 } },
        { $limit: 6 },
        // Convert string client_id to ObjectId for proper lookup
        {
          $addFields: {
            client_oid: {
              $cond: {
                if: { $and: [{ $ne: ["$client_id", null] }, { $ne: ["$client_id", ""] }] },
                then: { $toObjectId: "$client_id" },
                else: null
              }
            }
          }
        },
        {
          $lookup: {
            from: "clients",
            localField: "client_oid",
            foreignField: "_id",
            as: "client",
          },
        },
        {
          $project: {
            _id: 1,
            product_name: 1,
            quantity: 1,
            total_amount: 1,
            status: 1,
            createdAt: 1,
            client: { $arrayElemAt: ["$client", 0] },
          },
        },
      ])
      .toArray();

    // Transform to match expected format
    const formatted = orders.map((o: any) => ({
      id: o._id.toString(),
      product_name: o.product_name,
      quantity: o.quantity,
      total_amount: o.total_amount,
      status: o.status,
      created_at: o.createdAt,
      clients: o.client ? { name: o.client.name, email: o.client.email, address: o.client.address } : null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching recent orders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
