import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { triggerNotification } from "@/lib/notifications/dispatcher";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const {
      material_cost = 0,
      labour_cost = 0,
      overhead_cost = 0,
      ...body
    } = await request.json();
    const db = await getDb();

    // ── Redirect status writes to production_status ──
    // NOTE: The main edit dialog (useUpdateOrder) calls /api/v1/orders, not this
    // legacy route. body.status is rarely sent here, but if it is, we redirect
    // to production_status to avoid corrupting the legacy status field.
    const statusFields: Record<string, unknown> = {};
    if (body.status) {
      const incomingStatus = body.status;
      if (incomingStatus === "completed") {
        statusFields.production_status = "completed";
        statusFields.production_status_manual_override = true;
        statusFields.completedAt = new Date();
      } else if (incomingStatus === "processing") {
        statusFields.production_status = "processing";
        statusFields.processedAt = new Date();
      } else if (incomingStatus === "cancelled" || incomingStatus === "on_hold" ||
                 incomingStatus === "Cancelled" || incomingStatus === "On Hold") {
        statusFields.status = incomingStatus;
        statusFields.production_status = incomingStatus.toLowerCase().replace(/ /g, "_");
      }
      // Do NOT write body.status to the status field for processing/completed
    }

    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(id), userId: getDataOwnerId(user) },
      {
        $set: {
          client_id: body.client_id,
          product_name: body.product_name,
          quantity: Number(body.quantity),
          rate: Number(body.rate),
          total_amount: Number(body.total_amount),
          material_cost: Number(material_cost) || 0,
          labour_cost: Number(labour_cost) || 0,
          overhead_cost: Number(overhead_cost) || 0,
          delivery_date: body.delivery_date || null,
          // status: body.status — REMOVED: redirected to production_status above
          ...statusFields,
          payment_status: body.payment_status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ── Trigger notification for order status update ──
    if (body.status) {
      const updatedOrder = await db.collection("orders").findOne({ _id: new ObjectId(id) });
      let clientName = "Unknown Client";
      if (updatedOrder?.client_id) {
        try {
          const client = await db.collection("clients").findOne({ _id: new ObjectId(updatedOrder.client_id) });
          if (client) clientName = client.name || clientName;
        } catch { /* client lookup failed, use default */ }
      }
      triggerNotification({
        eventType: "order_status_update",
        payload: {
          orderId: id,
          clientName,
          productName: body.product_name || updatedOrder?.product_name || "Unknown Product",
          newStatus: body.status,
        },
        triggeredBy: getDataOwnerId(user),
      }).catch(() => {}); // fire-and-forget
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("orders").deleteOne({
      _id: new ObjectId(id),
      userId: getDataOwnerId(user),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Order not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
