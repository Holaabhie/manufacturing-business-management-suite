import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

interface OrderActivityDoc {
  _id: { toString(): string } | string;
  product_name?: string;
  clients?: { name?: string };
  total_amount?: number;
  createdAt: string | Date;
}

interface InventoryActivityDoc {
  _id: { toString(): string } | string;
  name?: string;
  createdAt: string | Date;
}

interface ClientActivityDoc {
  _id: { toString(): string } | string;
  name?: string;
  createdAt: string | Date;
}

interface PaymentActivityDoc {
  _id: { toString(): string } | string;
  clients?: { name?: string };
  client_name?: string;
  amount?: number;
  createdAt: string | Date;
}

interface ProductionActivityDoc {
  _id: { toString(): string } | string;
  job_name?: string;
  product_name?: string;
  createdAt: string | Date;
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const userId = getDataOwnerId(user);

    // Support query params for the full Activity Log page
    const url = new URL(req.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "10", 10);
    const limit = Math.min(Math.max(limitParam, 1), 100); // clamp 1–100
    const typeFilter = url.searchParams.get("type"); // "order" | "inventory" | "client" | "payment" | "production" | null

    // Per-collection limit: fetch more per collection when total limit is high
    const perCollection = Math.max(Math.ceil(limit / 3), 5);

    const [orders, inventory, clients, payments, production] = await Promise.all([
      (!typeFilter || typeFilter === "order")
        ? db
            .collection<OrderActivityDoc>("orders")
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(perCollection)
            .toArray()
        : Promise.resolve([]),
      (!typeFilter || typeFilter === "inventory")
        ? db
            .collection<InventoryActivityDoc>("inventory")
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(perCollection)
            .toArray()
        : Promise.resolve([]),
      (!typeFilter || typeFilter === "client")
        ? db
            .collection<ClientActivityDoc>("clients")
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(perCollection)
            .toArray()
        : Promise.resolve([]),
      (!typeFilter || typeFilter === "payment")
        ? db
            .collection<PaymentActivityDoc>("payments")
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(perCollection)
            .toArray()
        : Promise.resolve([]),
      (!typeFilter || typeFilter === "production")
        ? db
            .collection<ProductionActivityDoc>("production_jobs")
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(perCollection)
            .toArray()
            .catch(() => [] as ProductionActivityDoc[]) // Collection may not exist
        : Promise.resolve([]),
    ]);

    const activity = [
      ...orders.map((o) => ({
        type: "order",
        title: "Order created",
        subtitle: o.product_name || o.clients?.name || "",
        amount: o.total_amount || null,
        message: `Order created: ${o.product_name || ""}`,
        entityId: String(o._id),
        href: "/dashboard/orders",
        createdAt: o.createdAt,
      })),
      ...inventory.map((i) => ({
        type: "inventory",
        title: "Inventory updated",
        subtitle: i.name || "",
        amount: null,
        message: `Inventory updated: ${i.name || ""}`,
        entityId: String(i._id),
        href: "/dashboard/inventory",
        createdAt: i.createdAt,
      })),
      ...clients.map((c) => ({
        type: "client",
        title: "Client added",
        subtitle: c.name || "",
        amount: null,
        message: `Client added: ${c.name || ""}`,
        entityId: String(c._id),
        href: "/dashboard/clients",
        createdAt: c.createdAt,
      })),
      ...payments.map((p) => ({
        type: "payment",
        title: "Payment received",
        subtitle: p.clients?.name || p.client_name || "",
        amount: p.amount || null,
        message: `Payment received: \u20B9${p.amount || 0}`,
        entityId: String(p._id),
        href: "/dashboard/payments",
        createdAt: p.createdAt,
      })),
      ...production.map((j) => ({
        type: "production",
        title: "Production job",
        subtitle: j.job_name || j.product_name || "",
        amount: null,
        message: `Production job: ${j.job_name || j.product_name || ""}`,
        entityId: String(j._id),
        href: "/dashboard/production",
        createdAt: j.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json(activity);
  } catch (error: unknown) {
    console.error("Error fetching activity:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
