import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

// ─── Sample Data Templates ─────────────────────────────

const SAMPLE_CLIENTS = [
  { name: "Sharma Textiles Pvt Ltd", email: "orders@sharmatextiles.in", phone: "+919876543210", address: "Plot 42, GIDC Industrial Estate, Ahmedabad, Gujarat" },
  { name: "Patel Engineering Works", email: "info@pateleng.com", phone: "+919812345678", address: "Sector 5, Bhiwadi Industrial Area, Rajasthan" },
  { name: "Gupta Packaging Solutions", email: "purchase@guptapack.co.in", phone: "+919988776655", address: "A-12, Okhla Phase II, New Delhi" },
];

const SAMPLE_INVENTORY = [
  { name: "Aluminium Sheet 3mm", quantity: 250, unit: "kg", min_stock_level: 50, supplier_whatsapp: "+919876543210", purchase_cost_per_unit: 180, hsn_code: "7606", tax_rate: 18, item_type: "Goods", track_inventory: true, track_batches: false },
  { name: "Steel Rod 12mm", quantity: 120, unit: "kg", min_stock_level: 30, supplier_whatsapp: "+919812345678", purchase_cost_per_unit: 65, hsn_code: "7214", tax_rate: 18, item_type: "Goods", track_inventory: true, track_batches: false },
  { name: "Industrial Adhesive", quantity: 15, unit: "litres", min_stock_level: 20, supplier_whatsapp: "+919988776655", purchase_cost_per_unit: 450, hsn_code: "3506", tax_rate: 18, item_type: "Goods", track_inventory: true, track_batches: false },
  { name: "Copper Wire 2.5mm", quantity: 80, unit: "metres", min_stock_level: 25, supplier_whatsapp: "+919876543210", purchase_cost_per_unit: 95, hsn_code: "7408", tax_rate: 18, item_type: "Goods", track_inventory: true, track_batches: false },
];

function getSampleOrders(clientIds: string[]) {
  const now = new Date();
  const pastDate = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000);
  const futureDate = (daysAhead: number) => new Date(now.getTime() + daysAhead * 86400000);

  return [
    { clientId: clientIds[0], productName: "Custom Aluminium Panel", quantity: 500, unit: "pcs", rate: 150, totalAmount: 75000, status: "completed", paymentStatus: "paid", deliveryDate: pastDate(5), is_sample: true },
    { clientId: clientIds[0], productName: "Precision Drill Bit Set", quantity: 200, unit: "sets", rate: 350, totalAmount: 70000, status: "processing", paymentStatus: "pending", deliveryDate: futureDate(3), is_sample: true },
    { clientId: clientIds[1], productName: "Steel Frame Assembly", quantity: 50, unit: "pcs", rate: 2200, totalAmount: 110000, status: "processing", paymentStatus: "pending", deliveryDate: pastDate(2), is_sample: true },
    { clientId: clientIds[1], productName: "Brass Fitting Type A", quantity: 1000, unit: "pcs", rate: 45, totalAmount: 45000, status: "pending", paymentStatus: "pending", deliveryDate: futureDate(10), is_sample: true },
    { clientId: clientIds[2], productName: "Packaging Die Cut", quantity: 10000, unit: "pcs", rate: 3, totalAmount: 30000, status: "completed", paymentStatus: "paid", deliveryDate: pastDate(15), is_sample: true },
  ];
}

// ─── POST: Insert Sample Data ───────────────────────────

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const ownerId = getDataOwnerId(user);

    // Check if sample data already exists
    const existingSample = await db.collection("clients").findOne({ userId: ownerId, is_sample: true });
    if (existingSample) {
      return NextResponse.json({ error: "Sample data already loaded. Remove it first." }, { status: 400 });
    }

    const now = new Date();

    // 1. Insert clients
    const clientDocs = SAMPLE_CLIENTS.map(c => ({
      userId: ownerId,
      ...c,
      is_sample: true,
      createdAt: now,
      updatedAt: now,
    }));
    const clientResult = await db.collection("clients").insertMany(clientDocs);
    const clientIds = Object.values(clientResult.insertedIds).map(id => id.toString());

    // 2. Insert inventory
    const inventoryDocs = SAMPLE_INVENTORY.map(item => ({
      userId: ownerId,
      ...item,
      is_sample: true,
      createdAt: now,
      updatedAt: now,
    }));
    await db.collection("inventory").insertMany(inventoryDocs);

    // 3. Insert orders
    const orderDocs = getSampleOrders(clientIds).map(order => ({
      userId: ownerId,
      ...order,
      is_sample: true,
      createdAt: now,
      updatedAt: now,
    }));
    await db.collection("orders").insertMany(orderDocs);

    return NextResponse.json({
      success: true,
      message: "Sample data loaded",
      counts: {
        clients: clientIds.length,
        inventory: SAMPLE_INVENTORY.length,
        orders: orderDocs.length,
      },
    });
  } catch (error: any) {
    console.error("Error inserting sample data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE: Remove All Sample Data ─────────────────────

export async function DELETE() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const ownerId = getDataOwnerId(user);
    const filter = { userId: ownerId, is_sample: true };

    const [clients, inventory, orders] = await Promise.all([
      db.collection("clients").deleteMany(filter),
      db.collection("inventory").deleteMany(filter),
      db.collection("orders").deleteMany(filter),
    ]);

    return NextResponse.json({
      success: true,
      message: "Sample data removed",
      deleted: {
        clients: clients.deletedCount,
        inventory: inventory.deletedCount,
        orders: orders.deletedCount,
      },
    });
  } catch (error: any) {
    console.error("Error removing sample data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
