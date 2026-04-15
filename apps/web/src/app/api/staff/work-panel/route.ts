import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const { getDb } = await import("@/lib/mongodb");
        const db = await getDb();

        const userId = user._id.toString();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // ─── Fetch assigned orders ──────────────────────────────
        // Orders assigned to this staff member or created by them
        const ordersCollection = db.collection("orders");

        const assignedOrders = await ordersCollection
            .find({
                $or: [
                    { assignedTo: userId },
                    { assigned_to: userId },
                    { createdBy: userId },
                    { created_by: userId },
                ],
            })
            .sort({ createdAt: -1, created_at: -1 })
            .limit(10)
            .toArray();

        // ─── Compute stats ──────────────────────────────────────
        const allOrders = await ordersCollection
            .find({
                $or: [
                    { assignedTo: userId },
                    { assigned_to: userId },
                    { createdBy: userId },
                    { created_by: userId },
                ],
            })
            .toArray();

        const pendingOrders = allOrders.filter(
            (o: any) =>
                o.status === "pending" ||
                o.status === "processing" ||
                o.status === "in_progress"
        );
        const completedOrders = allOrders.filter(
            (o: any) => o.status === "completed" || o.status === "dispatched"
        );

        // Today's orders (created or updated today)
        const todaysOrders = allOrders.filter((o: any) => {
            const orderDate = new Date(o.updatedAt || o.updated_at || o.createdAt || o.created_at);
            return orderDate >= today && orderDate < tomorrow;
        });

        // Build tasks from orders for today's view
        const todaysTasks = todaysOrders.slice(0, 8).map((order: any, idx: number) => ({
            id: order._id.toString(),
            title: `${order.order_number || order.orderNumber || `Order #${order._id.toString().slice(-6)}`} — ${order.client_name || order.clientName || "Client"}`,
            type: order.status === "dispatched" ? "packing" : order.status === "processing" || order.status === "in_progress" ? "production" : "order",
            status: order.status === "completed" || order.status === "dispatched" ? "completed" : order.status === "processing" || order.status === "in_progress" ? "in_progress" : "pending",
            priority: order.priority || "medium",
            dueTime: order.due_date || order.dueDate ? new Date(order.due_date || order.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : undefined,
        }));

        const stats = {
            assignedOrders: allOrders.length,
            todaysTasks: todaysOrders.length,
            pendingWork: pendingOrders.length,
            completedTasks: completedOrders.length,
        };

        // Format orders for response
        const formattedOrders = assignedOrders.map((order: any) => ({
            _id: order._id.toString(),
            orderNumber: order.order_number || order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
            clientName: order.client_name || order.clientName || "—",
            status: order.status || "pending",
            priority: order.priority || "medium",
            dueDate: order.due_date || order.dueDate || "",
            items: order.items?.length || order.order_items?.length || 0,
        }));

        return NextResponse.json({
            stats,
            assignedOrders: formattedOrders,
            todaysTasks,
        });
    } catch (error: any) {
        console.error("[staff/work-panel] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch work panel data" },
            { status: 500 }
        );
    }
}
