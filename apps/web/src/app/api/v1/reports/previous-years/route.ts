import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

/**
 * GET /api/v1/reports/previous-years?fy=2024-25&section=orders
 *
 * Returns data for a specific financial year, scoped to the current user.
 * Optional `section` param filters to one section (orders|productions|bills|payments|inventory).
 * If no section specified, returns all sections.
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const fy = searchParams.get("fy");
        const section = searchParams.get("section");

        if (!fy || !/^\d{4}-\d{2}$/.test(fy)) {
            return NextResponse.json(
                { error: "Valid financial year parameter required (e.g. ?fy=2024-25)" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const ownerId = getDataOwnerId(user);
        const filter = { userId: ownerId, financial_year: fy };

        const result: Record<string, any> = { financialYear: fy };

        // ─── Orders ─────────────────────────────────────────
        if (!section || section === "orders") {
            const orders = await db.collection("orders")
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();

            result.orders = orders.map((o: any) => ({
                id: o._id.toString(),
                product_name: o.product_name,
                quantity: o.quantity,
                unit: o.unit || "kg",
                rate: o.rate,
                total_amount: o.total_amount,
                delivery_date: o.delivery_date,
                status: o.status,
                production_status: o.production_status || undefined,
                payment_status: o.payment_status,
                priority: o.priority || "normal",
                createdAt: o.createdAt,
            }));
        }

        // ─── Productions ────────────────────────────────────
        if (!section || section === "productions") {
            const productions = await db.collection("productions")
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();

            result.productions = productions.map((p: any) => ({
                id: p._id.toString(),
                batchNumber: p.batchNumber,
                orderProductName: p.orderProductName,
                orderQuantity: p.orderQuantity,
                clientName: p.clientName,
                status: p.status,
                producedQuantity: p.producedQuantity || 0,
                rejectQuantity: p.rejectQuantity || 0,
                progressPercent: p.progressPercent || 0,
                createdAt: p.createdAt,
                completedAt: p.completedAt,
            }));
        }

        // ─── Bills / Invoices ───────────────────────────────
        if (!section || section === "bills") {
            const bills = await db.collection("bills")
                .find(filter)
                .sort({ created_at: -1 })
                .toArray();

            result.bills = bills.map((b: any) => ({
                id: b._id.toString(),
                billNumber: b.billNumber,
                billDate: b.billDate,
                clientName: b.clientName,
                totalAmount: b.totalAmount,
                status: b.status,
                created_at: b.created_at,
            }));
        }

        // ─── Payments ───────────────────────────────────────
        if (!section || section === "payments") {
            const payments = await db.collection("payments")
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();

            result.payments = payments.map((p: any) => ({
                id: p._id.toString(),
                amount: p.amount,
                payment_date: p.payment_date,
                payment_method: p.payment_method,
                notes: p.notes,
                createdAt: p.createdAt,
            }));
        }

        // ─── Inventory Usage (order_inventory_items = canonical ledger) ──
        if (!section || section === "inventory") {
            const usageRecords = await db.collection("order_inventory_items")
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();

            result.inventoryUsage = usageRecords.map((u: any) => ({
                id: u._id.toString(),
                order_id: u.order_id,
                inventory_id: u.inventory_id,
                item_name: u.item_name,
                quantity_deducted: u.quantity_deducted,
                createdAt: u.createdAt,
            }));

            // Batch traceability — secondary view
            const batchUsage = await db.collection("production_material_usage")
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();

            result.batchTraceability = batchUsage.map((m: any) => ({
                id: m._id.toString(),
                productionJobId: m.productionJobId,
                inventoryItemId: m.inventoryItemId,
                itemName: m.itemName,
                quantityUsed: m.quantityUsed,
                unit: m.unit,
                createdAt: m.createdAt,
            }));
        }

        // ─── Summary stats ──────────────────────────────────
        result.summary = {
            totalOrders: result.orders?.length ?? 0,
            totalProductions: result.productions?.length ?? 0,
            totalBills: result.bills?.length ?? 0,
            totalPayments: result.payments?.length ?? 0,
            totalRevenue: (result.orders || []).reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0),
            totalBilled: (result.bills || []).reduce((sum: number, b: any) => sum + Number(b.totalAmount || 0), 0),
            totalPaid: (result.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
            totalMaterialDeducted: (result.inventoryUsage || []).reduce((sum: number, u: any) => sum + Number(u.quantity_deducted || 0), 0),
        };

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("[reports/previous-years] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
