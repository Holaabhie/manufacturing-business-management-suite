import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getFinancialYear } from "@/lib/utils/financial-year";
import { assertCanCreate } from "@/lib/entitlements";
import { sanitizeOrderForStaff } from "@/lib/sanitizeOrderForStaff";
import { getQuoteRepository } from "@/modules/quotes";
import { logDataOperation } from "@/lib/audit";
import { ensureQuoteOrderIndexes } from "@/lib/migrations/ensureQuoteOrderIndexes";

let quoteIndexEnsured = false;

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const ownerId = getDataOwnerId(user);
    const matchFilter: Record<string, any> = { userId: ownerId };

    if (user.role === "Staff") {
        const productions = await db
            .collection("productions")
            .find({
                userId: ownerId,
                assignedStaff: String(user._id),
            })
            .project({ orderId: 1 })
            .toArray();

        const orderIds = [
            ...new Set(
                productions
                    .map((p: any) => p.orderId)
                    .filter((id: any) => id != null && String(id).trim() !== "")
            ),
        ];

        if (orderIds.length === 0) {
            return NextResponse.json([]);
        }

        const convertedOrderIds: (ObjectId | string)[] = [];
        for (const id of orderIds) {
            if (typeof id === "string" && ObjectId.isValid(id)) {
                convertedOrderIds.push(new ObjectId(id));
            }
            convertedOrderIds.push(String(id));
        }

        matchFilter._id = { $in: convertedOrderIds };
    }

    const orders = await db
      .collection("orders")
      .aggregate([
        { $match: matchFilter },
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
            is_sample: 1,
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
      is_sample: o.is_sample === true,
      clients: o.client
        ? {
          name: o.client.name,
          email: o.client.email,
          address: o.client.address,
        }
        : null,
    }));

    if (user.role === "Staff") {
      return NextResponse.json(sanitizeOrderForStaff(formatted));
    }

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

    if (user.role === "Staff") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Staff members cannot create orders" },
        { status: 403 }
      );
    }

    const limitError = await assertCanCreate(user, "orders", 1);
    if (limitError) return limitError;

    const {
      material_cost = 0,
      labour_cost = 0,
      overhead_cost = 0,
      quotation_id,
      quotation_line_index,
      ...body
    } = await request.json();
    const db = await getDb();
    const ownerId = getDataOwnerId(user);

    if (!quoteIndexEnsured) {
      ensureQuoteOrderIndexes().catch(() => {});
      quoteIndexEnsured = true;
    }

    const isFromQuote = Boolean(
      quotation_id !== undefined &&
      quotation_id !== null &&
      quotation_id !== "" &&
      quotation_line_index !== undefined &&
      quotation_line_index !== null &&
      quotation_line_index !== ""
    );
    const quotationId = isFromQuote ? String(quotation_id) : "";
    const quotationLineIndex = isFromQuote ? Number(quotation_line_index) : -1;

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

    // ─── Claim Quote Line if from quotation ─────────────────
    let quoteRepo: ReturnType<typeof getQuoteRepository> | null = null;
    if (isFromQuote) {
      quoteRepo = getQuoteRepository();
      const claimedQuote = await quoteRepo.claimLine(quotationId, ownerId, quotationLineIndex);
      if (!claimedQuote) {
        const existingQuote = await quoteRepo.findById(quotationId, ownerId);
        const existingLine = existingQuote?.converted_lines?.find((cl) => cl.line_index === quotationLineIndex);
        return NextResponse.json(
          {
            success: false,
            error: "QUOTE_LINE_ALREADY_CONVERTED_OR_NOT_ELIGIBLE",
            message: "Quote line already converted or not eligible",
            existing_order_id: existingLine?.order_id || null,
          },
          { status: 409 }
        );
      }
    }

    // ─── Create order and deduct inventory ──────────────────
    let orderResult;
    try {
      const orderDoc: Record<string, unknown> = {
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
      };

      if (isFromQuote) {
        orderDoc.quotation_id = quotationId;
      }

      orderResult = await db.collection("orders").insertOne(orderDoc);

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
    } catch (createErr) {
      if (isFromQuote && quoteRepo) {
        await quoteRepo.releaseClaim(quotationId, ownerId, quotationLineIndex);
      }
      throw createErr;
    }

    // ─── Attach order and audit log ─────────────────────────
    if (isFromQuote && quoteRepo && orderResult) {
      const attachRes = await quoteRepo.attachOrder(
        quotationId,
        ownerId,
        quotationLineIndex,
        orderResult.insertedId.toString()
      );

      const userAny = user as any;
      await logDataOperation({
        organizationId: ownerId,
        userId: String(user._id),
        userName: userAny.fullName || userAny.name || user.email || "Unknown User",
        userRole: "Admin",
        action: `Created order ${orderResult.insertedId.toString()} from quotation ${attachRes?.quote.quotation_number || quotationId}, line ${quotationLineIndex}`,
        actionType: "create",
        module: "orders",
        resourceId: orderResult.insertedId.toString(),
        resourceType: "order",
      });

      if (attachRes?.statusChangedToAccepted) {
        await logDataOperation({
          organizationId: ownerId,
          userId: String(user._id),
          userName: userAny.fullName || userAny.name || user.email || "Unknown User",
          userRole: "Admin",
          action: `Quotation ${attachRes.quote.quotation_number} status automatically changed from Sent to Accepted upon order conversion`,
          actionType: "update",
          module: "quotes",
          resourceId: quotationId,
          resourceType: "quotation",
          beforeState: { status: "Sent" },
          afterState: { status: "Accepted" },
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
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
