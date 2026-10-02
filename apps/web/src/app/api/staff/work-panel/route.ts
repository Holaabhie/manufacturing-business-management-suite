import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { sanitizeOrderForStaff } from "@/lib/sanitizeOrderForStaff";

const EXCLUDED_STATUSES = ["delivered", "cancelled", "archived"];

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const { getDb } = await import("@/lib/mongodb");
        const db = await getDb();

        const ownerId = getDataOwnerId(user);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const isStaff = user.role === "Staff";
        let staffOrderFilter: Record<string, any> = {};
        const orderToProdMap = new Map<string, string>();

        if (isStaff) {
            const productions = await db
                .collection("productions")
                .find({
                    userId: ownerId,
                    assignedStaff: String(user._id),
                })
                .project({ orderId: 1 })
                .toArray();

            for (const p of productions) {
                if (p.orderId && p._id) {
                    orderToProdMap.set(String(p.orderId), String(p._id));
                }
            }

            const orderIds = [
                ...new Set(
                    productions
                        .map((p: any) => p.orderId)
                        .filter((id: any) => id != null && String(id).trim() !== "")
                ),
            ];

            if (orderIds.length === 0) {
                return NextResponse.json({
                    stats: {
                        assignedOrders: 0,
                        todaysTasks: 0,
                        pendingWork: 0,
                        completedTasks: 0,
                    },
                    assignedOrders: [],
                    todaysTasks: [],
                });
            }

            const convertedOrderIds: (ObjectId | string)[] = [];
            for (const id of orderIds) {
                if (typeof id === "string" && ObjectId.isValid(id)) {
                    convertedOrderIds.push(new ObjectId(id));
                }
                convertedOrderIds.push(String(id));
            }

            staffOrderFilter = { _id: { $in: convertedOrderIds } };
        }

        // ─── Base filter: org-scoped orders, excluding terminal statuses ─
        const baseFilter = {
            userId: ownerId,
            status: { $nin: EXCLUDED_STATUSES },
            ...staffOrderFilter,
        };

        const ordersCollection = db.collection("orders");

        // ─── Fetch assigned orders (most recent first) ──────────
        const assignedOrders = await ordersCollection
            .find(baseFilter)
            .sort({ createdAt: -1 })
            .limit(25)
            .toArray();

        // ─── Compute stats ──────────────────────────────────────
        const allOrders = await ordersCollection
            .find(baseFilter)
            .limit(25)
            .toArray();

        // Batch lookup client names
        const clientIds = [
            ...new Set(
                allOrders
                    .map((o: any) => o.client_id)
                    .filter((id: any) => id != null && String(id).trim() !== "")
            ),
        ];
        const clientObjectIds: ObjectId[] = [];
        for (const cid of clientIds) {
            if (typeof cid === "string" && ObjectId.isValid(cid)) {
                clientObjectIds.push(new ObjectId(cid));
            } else if (cid instanceof ObjectId) {
                clientObjectIds.push(cid);
            }
        }
        const clientDocs = clientObjectIds.length > 0
            ? await db.collection("clients").find({ _id: { $in: clientObjectIds } }).project({ name: 1 }).toArray()
            : [];
        const clientMap = new Map<string, string>();
        for (const c of clientDocs) {
            clientMap.set(String(c._id), c.name || "");
        }

        const pendingOrders = allOrders.filter(
            (o: any) => {
                const ps = o.production_status || o.status;
                return ps === "pending" || ps === "processing" || ps === "in_progress";
            }
        );
        const completedOrders = allOrders.filter(
            (o: any) => (o.production_status || o.status) === "completed"
        );

        // Today's orders (created or updated today)
        const todaysOrders = allOrders.filter((o: any) => {
            const orderDate = new Date(o.updatedAt || o.updated_at || o.createdAt || o.created_at);
            return orderDate >= today && orderDate < tomorrow;
        });

        // Build tasks from today's orders
        const todaysTasks = todaysOrders.slice(0, 8).map((order: any) => {
            const ps = order.production_status || order.status;
            const orderIdStr = order._id.toString();
            const clientName = (order.client_id && clientMap.get(String(order.client_id))) || order.client_name || order.clientName || "Client";
            const orderNumber = order.order_number || order.orderNumber || `ORD-${orderIdStr.slice(-6)}`;
            const productName = order.product_name || order.productName || "Order";

            return {
                id: orderIdStr,
                orderId: orderIdStr,
                orderNumber,
                productName,
                clientName,
                title: `${orderNumber} — ${clientName}`,
                type: ps === "dispatched" ? "packing" : ps === "processing" || ps === "in_progress" ? "production" : "order",
                status: ps === "completed" || ps === "dispatched" ? "completed" : ps === "processing" || ps === "in_progress" ? "in_progress" : "pending",
                priority: order.priority || "medium",
                dueTime: order.due_date || order.dueDate || order.delivery_date ? new Date(order.due_date || order.dueDate || order.delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : undefined,
                orderDate: order.createdAt || order.created_at || null,
                deliveryDate: order.delivery_date || order.due_date || order.dueDate || null,
                quantity: Number(order.quantity || 0),
                unit: order.unit || "kg",
                productionStatus: ps,
                materials: Array.isArray(order.materials)
                    ? order.materials.map((m: any) => ({
                        itemName: m.itemName || m.name || "",
                        quantityRequired: Number(m.quantityRequired || m.quantity) || 0,
                        unit: m.unit || "kg",
                    }))
                    : [],
                productionId: orderToProdMap.get(orderIdStr) || undefined,
            };
        });

        const stats = {
            assignedOrders: allOrders.length,
            todaysTasks: todaysOrders.length,
            pendingWork: pendingOrders.length,
            completedTasks: completedOrders.length,
        };

        // Format orders for response
        const formattedOrders = assignedOrders.map((order: any) => {
            const orderIdStr = order._id.toString();
            const clientName = (order.client_id && clientMap.get(String(order.client_id))) || order.client_name || order.clientName || "—";
            const ps = order.production_status || order.status || "pending";

            return {
                _id: orderIdStr,
                id: orderIdStr,
                orderNumber: order.order_number || order.orderNumber || `ORD-${orderIdStr.slice(-6)}`,
                productName: order.product_name || order.productName || "",
                clientName,
                status: order.status || "pending",
                productionStatus: ps,
                priority: order.priority || "medium",
                dueDate: order.due_date || order.dueDate || order.delivery_date || "",
                orderDate: order.createdAt || order.created_at || null,
                deliveryDate: order.delivery_date || order.due_date || order.dueDate || null,
                quantity: Number(order.quantity || 0),
                unit: order.unit || "kg",
                items: order.items?.length || order.order_items?.length || 0,
                materials: Array.isArray(order.materials)
                    ? order.materials.map((m: any) => ({
                        itemName: m.itemName || m.name || "",
                        quantityRequired: Number(m.quantityRequired || m.quantity) || 0,
                        unit: m.unit || "kg",
                    }))
                    : [],
                productionId: orderToProdMap.get(orderIdStr) || undefined,
            };
        });

        const sanitizedAssignedOrders = isStaff ? sanitizeOrderForStaff(formattedOrders) : formattedOrders;
        const sanitizedTasks = isStaff ? sanitizeOrderForStaff(todaysTasks) : todaysTasks;

        return NextResponse.json({
            stats,
            assignedOrders: sanitizedAssignedOrders,
            todaysTasks: sanitizedTasks,
        });
    } catch (error: any) {
        console.error("[staff/work-panel] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch work panel data" },
            { status: 500 }
        );
    }
}
