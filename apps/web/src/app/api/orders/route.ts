import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getFinancialYear } from "@/lib/utils/financial-year";

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
            production_status: 1,
            production_status_manual_override: 1,
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
      productionStatus: o.production_status || undefined,
      productionStatusManualOverride: o.production_status_manual_override || false,
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
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      material_cost = 0,
      labour_cost = 0,
      overhead_cost = 0,
      ...body
    } = await request.json();
    const db = await getDb();
    const ownerId = getDataOwnerId(user);

    // ─── Pre-check material stock BEFORE creating order ─────
    const materialsToDeduct = Array.isArray(body.materials)
      ? body.materials.filter((m: any) => m.inventoryItemId && m.quantityRequired > 0)
      : [];

    if (materialsToDeduct.length > 0) {
      const insufficientStock: Array<{ item: string; available: number; required: number; reason?: string }> = [];

      for (const mat of materialsToDeduct) {
        let invItem;
        try {
          invItem = await db.collection("inventory").findOne({
            _id: new ObjectId(mat.inventoryItemId),
            userId: ownerId,
          });
        } catch {
          insufficientStock.push({ item: mat.itemName || mat.inventoryItemId, available: 0, required: mat.quantityRequired, reason: "invalid id" });
          continue;
        }

        if (!invItem) {
          insufficientStock.push({ item: mat.itemName || mat.inventoryItemId, available: 0, required: mat.quantityRequired, reason: "not found" });
          continue;
        }

        if (Number(invItem.quantity) < Number(mat.quantityRequired)) {
          insufficientStock.push({
            item: mat.itemName || invItem.name || mat.inventoryItemId,
            available: Number(invItem.quantity),
            required: Number(mat.quantityRequired),
          });
        }
      }

      if (insufficientStock.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Insufficient stock for: ${insufficientStock.map((s) => s.item).join(", ")}`,
            details: insufficientStock,
          },
          { status: 409 }
        );
      }
    }

    // ─── Create order ───────────────────────────────────────
    const orderResult = await db.collection("orders").insertOne({
      userId: ownerId,
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
      priority: body.priority || "normal",
      notes: body.notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      financial_year: getFinancialYear(new Date()),
    });

    // ─── Deduct inventory using $inc (atomic) ───────────────
    for (const mat of materialsToDeduct) {
      await db.collection("inventory").updateOne(
        { _id: new ObjectId(mat.inventoryItemId), userId: ownerId },
        {
          $inc: { quantity: -Math.abs(Number(mat.quantityRequired)) },
          $set: { updatedAt: new Date() },
        }
      );

      // Record deduction for audit trail
      await db.collection("order_inventory_items").insertOne({
        order_id: orderResult.insertedId.toString(),
        inventory_id: mat.inventoryItemId,
        item_name: mat.itemName || "",
        quantity_deducted: Number(mat.quantityRequired),
        userId: ownerId,
        createdAt: new Date(),
        financial_year: getFinancialYear(new Date()),
      });
    }

    const order = await db.collection("orders").findOne({ _id: orderResult.insertedId });

    return NextResponse.json({
      id: order!._id.toString(),
      ...order,
    });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
