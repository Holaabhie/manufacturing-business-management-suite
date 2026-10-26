import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

interface RecentOrderAggResult {
  _id: { toString(): string } | string;
  product_name?: string;
  quantity?: number;
  total_amount?: number;
  status: string;
  createdAt: string | Date;
  client?: {
    name?: string;
    email?: string;
    address?: string;
  } | null;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const userId = getDataOwnerId(user);

    const orders = await db
      .collection("orders")
      .aggregate<RecentOrderAggResult>([
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
    const formatted = orders.map((o) => ({
      id: o._id.toString(),
      product_name: o.product_name,
      quantity: o.quantity,
      total_amount: o.total_amount,
      status: o.status,
      created_at: o.createdAt,
      clients: o.client ? { name: o.client.name, email: o.client.email, address: o.client.address } : null,
    }));

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error("Error fetching recent orders:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
