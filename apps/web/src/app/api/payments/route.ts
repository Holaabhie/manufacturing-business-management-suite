import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { triggerNotification } from "@/lib/notifications/dispatcher";
import { getFinancialYear } from "@/lib/utils/financial-year";

export async function GET() {
  try {
    // Admin-only: Staff cannot view payments
    const authResult = await requireAdmin();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const db = await getDb();
    const payments = await db
      .collection("payments")
      .aggregate([
        { $match: { userId: getDataOwnerId(user!) } },
        { $sort: { createdAt: -1 } },
        // Convert string IDs to ObjectIds for proper lookup
        {
          $addFields: {
            client_oid: {
              $cond: {
                if: { $and: [{ $ne: ["$client_id", null] }, { $ne: ["$client_id", ""] }] },
                then: { $toObjectId: "$client_id" },
                else: null
              }
            },
            order_oid: {
              $cond: {
                if: { $and: [{ $ne: ["$order_id", null] }, { $ne: ["$order_id", ""] }] },
                then: { $toObjectId: "$order_id" },
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
          $lookup: {
            from: "orders",
            localField: "order_oid",
            foreignField: "_id",
            as: "order",
          },
        },
        {
          $project: {
            _id: 1,
            amount: 1,
            payment_date: 1,
            payment_method: 1,
            notes: 1,
            client_id: 1,
            order_id: 1,
            createdAt: 1,
            client: { $arrayElemAt: ["$client", 0] },
            order: { $arrayElemAt: ["$order", 0] },
          },
        },
      ])
      .toArray();

    const formatted = payments.map((p: any) => ({
      id: p._id.toString(),
      amount: p.amount,
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      notes: p.notes,
      client_id: p.client_id,
      order_id: p.order_id,
      created_at: p.createdAt,
      createdAt: p.createdAt,
      clients: p.client ? { name: p.client.name } : null,
      orders: p.order ? { product_name: p.order.product_name } : null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Admin-only: Staff cannot create payments
    const authResult = await requireAdmin();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const body = await request.json();
    const db = await getDb();

    const result = await db.collection("payments").insertOne({
      userId: getDataOwnerId(user!),
      amount: Number(body.amount),
      payment_date: body.payment_date ? new Date(body.payment_date) : new Date(),
      payment_method: body.payment_method || "cash",
      notes: body.notes || "",
      client_id: body.client_id || null,
      order_id: body.order_id || null,
      createdAt: new Date(),
      financial_year: getFinancialYear(body.payment_date ? new Date(body.payment_date) : new Date()),
    });

    const payment = await db.collection("payments").findOne({ _id: result.insertedId });

    // ── Trigger notification for payment received ──
    let clientName = "Unknown Client";
    if (body.client_id) {
      try {
        const client = await db.collection("clients").findOne({ _id: new ObjectId(body.client_id) });
        if (client) clientName = client.name || clientName;
      } catch { /* client lookup failed */ }
    }

    // Calculate outstanding amount if order exists
    let outstandingAmount = 0;
    let dueDate = "";
    if (body.order_id) {
      try {
        const order = await db.collection("orders").findOne({ _id: new ObjectId(body.order_id) });
        if (order) {
          const totalPayments = await db.collection("payments").aggregate([
            { $match: { order_id: body.order_id, userId: getDataOwnerId(user!) } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]).toArray();
          const paid = totalPayments[0]?.total || 0;
          outstandingAmount = Math.max(0, Number(order.total_amount || 0) - paid);
          dueDate = order.delivery_date || "";
        }
      } catch { /* order lookup failed */ }
    }

    triggerNotification({
      eventType: "payment_reminder",
      payload: {
        clientName,
        outstandingAmount,
        dueDate,
      },
      triggeredBy: getDataOwnerId(user!),
    }).catch(() => {}); // fire-and-forget

    return NextResponse.json({
      id: payment!._id.toString(),
      ...payment,
    });
  } catch (error: any) {
    console.error("Error creating payment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
