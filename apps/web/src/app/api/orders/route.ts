import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
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
        { $match: { userId: getDataOwnerId(user) } },
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
            unit: 1,
            material_source: 1,
            rate: 1,
            total_amount: 1,
            delivery_date: 1,
            status: 1,
            payment_status: 1,
            client_id: 1,
            material_cost: 1,
            labour_cost: 1,
            overhead_cost: 1,
            materials: 1,
            estimated_material_cost: 1,
            estimated_gross_profit: 1,
            estimated_margin: 1,
            priority: 1,
            notes: 1,
            createdAt: 1,
            processedAt: 1,
            completedAt: 1,
            client: { $arrayElemAt: ["$client", 0] },
          },
        },
      ])
      .toArray();

    const formatted = orders.map((o: any) => ({
      id: o._id.toString(),
      product_name: o.product_name,
      quantity: o.quantity,
      unit: o.unit || "kg",
      materialSource: o.material_source || "own",
      rate: o.rate,
      total_amount: o.total_amount,
      delivery_date: o.delivery_date,
      status: o.status,
      payment_status: o.payment_status,
      client_id: o.client_id,
      material_cost: o.material_cost || 0,
      labour_cost: o.labour_cost || 0,
      overhead_cost: o.overhead_cost || 0,
      materials: Array.isArray(o.materials) ? o.materials : [],
      estimated_material_cost: o.estimated_material_cost || 0,
      estimated_gross_profit: o.estimated_gross_profit || 0,
      estimated_margin: o.estimated_margin || 0,
      priority: o.priority || 'normal',
      notes: o.notes || '',
      created_at: o.createdAt,
      createdAt: o.createdAt,
      processedAt: o.processedAt || null,
      completedAt: o.completedAt || null,
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

    const {
      material_cost = 0,
      labour_cost = 0,
      overhead_cost = 0,
      ...body
    } = await request.json();
    const db = await getDb();

    // Create order
    const orderResult = await db.collection("orders").insertOne({
      userId: getDataOwnerId(user),
      client_id: body.client_id,
      product_name: body.product_name,
      quantity: Number(body.quantity),
      unit: body.unit || "kg",
      material_source: body.material_source || "own",
      rate: Number(body.rate),
      total_amount: Number(body.total_amount),
      material_cost: Number(material_cost) || 0,
      labour_cost: Number(labour_cost) || 0,
      overhead_cost: Number(overhead_cost) || 0,
      delivery_date: body.delivery_date || null,
      status: body.status || "pending",
      payment_status: body.payment_status || "pending",
      materials: Array.isArray(body.materials) ? body.materials : [],
      estimated_material_cost: Number(body.estimated_material_cost) || 0,
      estimated_gross_profit: Number(body.estimated_gross_profit) || 0,
      estimated_margin: Number(body.estimated_margin) || 0,
      priority: body.priority || 'normal',
      notes: body.notes || '',
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
          userId: getDataOwnerId(user),
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
