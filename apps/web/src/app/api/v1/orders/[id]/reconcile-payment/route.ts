/**
 * Order Payment Reconciliation — /api/v1/orders/[id]/reconcile-payment
 *
 * After a payment is created or deleted, this endpoint recalculates the
 * order's payment_status, total_paid, and balance_due fields in MongoDB
 * based on the actual sum of all payments linked to the order.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { getDb } from "@/lib/mongodb";
import { getDataOwnerId } from "@/lib/auth-session";
import { ObjectId } from "mongodb";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id: orderId } = await context!.params;
            const userId = getDataOwnerId(user);
            const db = await getDb();

            // 1. Fetch the order — scoped to userId for security
            const order = await db.collection("orders").findOne({
                _id: new ObjectId(orderId),
                userId,
            });

            if (!order) {
                return Response.json({ error: "Order not found" }, { status: 404 });
            }

            // 2. Sum all payments linked to this order
            //    Payment docs store order reference as `order_id` (string)
            const paymentDocs = await db
                .collection("payments")
                .find({ order_id: orderId, userId })
                .toArray();

            const totalPaid = paymentDocs.reduce(
                (sum: number, p: any) => sum + (Number(p.amount) || 0),
                0
            );

            const totalAmount = Number(order.total_amount || order.grand_total || 0);
            const balanceDue = totalAmount - totalPaid;

            // 3. Determine new payment status
            let paymentStatus: string;
            if (totalPaid === 0) {
                paymentStatus = "pending";
            } else if (balanceDue <= 0.01) {
                // 0.01 tolerance for floating-point rounding
                paymentStatus = "paid";
            } else {
                paymentStatus = "partial";
            }

            // 4. Build update — only payment-related fields, never touch production status
            const updateFields: Record<string, any> = {
                payment_status: paymentStatus,
                total_paid: totalPaid,
                balance_due: Math.max(0, balanceDue),
                updatedAt: new Date(),
            };

            // 5. Persist
            await db
                .collection("orders")
                .updateOne(
                    { _id: new ObjectId(orderId), userId },
                    { $set: updateFields }
                );

            // 6. Return updated values
            return Response.json({
                success: true,
                orderId,
                paymentStatus,
                totalPaid,
                balanceDue: Math.max(0, balanceDue),
            });
        }, { role: "Admin" }),
    ),
    { tier: "write" },
);
