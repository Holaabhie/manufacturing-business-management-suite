import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const orders = await db
      .collection("orders")
      .aggregate([
        { $match: { userId: user._id.toString() } },
        { $sort: { createdAt: -1 } },
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
            rate: 1,
            total_amount: 1,
            delivery_date: 1,
            status: 1,
            payment_status: 1,
            client_id: 1,
            createdAt: 1,
            client: { $arrayElemAt: ["$client", 0] },
          },
        },
      ])
      .toArray();

    const formatted = orders.map((o: any) => ({
      id: o._id.toString(),
      product_name: o.product_name,
      quantity: o.quantity,
      rate: o.rate,
      total_amount: o.total_amount,
      delivery_date: o.delivery_date,
      status: o.status,
      payment_status: o.payment_status,
      client_id: o.client_id,
      created_at: o.createdAt,
      createdAt: o.createdAt,
      clients: o.client
        ? {
          name: o.client.name,
          email: o.client.email,
          address: o.client.address,
        }
        : null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching orders:", error);
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

    // Create order
    const orderResult = await db.collection("orders").insertOne({
      userId: user._id.toString(),
      client_id: body.client_id,
      product_name: body.product_name,
      quantity: Number(body.quantity),
      rate: Number(body.rate),
      total_amount: Number(body.total_amount),
      delivery_date: body.delivery_date || null,
      status: body.status || "pending",
      payment_status: body.payment_status || "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Deduct inventory if order_items provided
    if (body.order_items && Array.isArray(body.order_items)) {
      for (const item of body.order_items) {
        const invItem = await db
          .collection("inventory")
          .findOne({ _id: new ObjectId(item.inventory_id) });

        if (!invItem) continue;

        const newQty = Number(invItem.quantity) - Number(item.quantity_deducted);
        await db.collection("inventory").updateOne(
          { _id: new ObjectId(item.inventory_id) },
          { $set: { quantity: newQty, updatedAt: new Date() } }
        );

        // Record deduction
        await db.collection("order_inventory_items").insertOne({
          order_id: orderResult.insertedId.toString(),
          inventory_id: item.inventory_id,
          quantity_deducted: Number(item.quantity_deducted),
          userId: user._id.toString(),
          createdAt: new Date(),
        });
      }
    }

    const order = await db.collection("orders").findOne({ _id: orderResult.insertedId });

    return NextResponse.json({
      id: order!._id.toString(),
      ...order,
    });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
