import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getDb } from "@/lib/mongodb";
import { PaymentTransaction } from "@/models/PaymentTransaction";
import { SalesOrder } from "@/models/SalesOrder";
import { AuditLog } from "@/models/AuditLog";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getFinancialYear } from "@/lib/utils/financial-year";

// Zod Schema matching 2.4 - Payment Recording API
const recordPaymentSchema = z.object({
    reference_type: z.enum(['SalesOrder', 'PurchaseOrder', 'Invoice', 'Bill', 'Expense', 'Other']),
    reference_id: z.string().min(1, "Reference ID is required"),
    party_type: z.enum(['Customer', 'Supplier', 'Other']),
    party_id: z.string().min(1, "Party ID is required"),
    amount: z.number().positive("Amount must be greater than 0"),
    payment_mode: z.enum(['Cash', 'Bank Transfer', 'NEFT', 'RTGS', 'UPI', 'Cheque', 'Demand Draft', 'Credit Card', 'Debit Card', 'Online', 'Wallet', 'Other']),
    payment_date: z.string().or(z.date()),
    transaction_ref: z.string().optional(),
    tds_applicable: z.boolean().default(false),
    tds_section: z.string().optional(),
    tds_rate: z.number().min(0).default(0),
    notes: z.string().optional(),
});

// ─── Payment Status Computation ─────────────────────────
// Used for SalesOrder (Mongoose model)
function computePaymentStatus(order: any) {
    const { grand_total, total_paid, payment_due_date } = order;
    const today = new Date();

    if (total_paid <= 0) {
        if (payment_due_date && today > new Date(payment_due_date)) {
            return 'Overdue';
        }
        return 'Unpaid';
    }

    if (total_paid > 0 && total_paid < grand_total) {
        if (payment_due_date && today > new Date(payment_due_date)) {
            return 'Partially Overdue';
        }
        return 'Partial';
    }

    if (total_paid >= grand_total) {
        return 'Paid';
    }

    return 'Unpaid';
}

// ─── Legacy Payment Status (for `orders` collection) ────
// Maps to user's required logic:
//   paid_amount == 0       → "pending"
//   0 < paid < total       → "partial"
//   paid >= total           → "paid"
function computeLegacyPaymentStatus(totalPaid: number, totalAmount: number): string {
    if (totalPaid <= 0) return "pending";
    if (totalPaid > 0 && totalPaid < totalAmount) return "partial";
    if (totalPaid >= totalAmount) return "paid";
    return "pending";
}

// NOTE: computeOrderStatusFromPayment() was removed as part of the order-status fix.
// Payments no longer write to order.status — production status is tracked independently.

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        // ─── Auth: get real user from session ────────────────
        const sessionUser = await getSessionUser();
        if (!sessionUser) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const userId = sessionUser._id.toString();
        const organizationId = getDataOwnerId(sessionUser);

        const body = await req.json();
        const data = recordPaymentSchema.parse(body);

        // 2. Compute TDS
        let tds_amount = 0;
        if (data.tds_applicable && data.tds_rate > 0) {
            tds_amount = Number((data.amount * (data.tds_rate / 100)).toFixed(2));
        }
        const net_amount = data.amount - tds_amount;

        // 3. Generate transaction_number
        const count = await PaymentTransaction.countDocuments({ organizationId });
        const prefix = data.amount > 0 ? "RCT" : "PAY";
        const transaction_number = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        // 4. Create the payment transaction
        const transaction = new PaymentTransaction({
            transaction_number,
            transaction_type: 'Receipt',
            reference_type: data.reference_type,
            reference_id: data.reference_id,
            party_type: data.party_type,
            party_id: data.party_id,
            amount: data.amount,
            amount_in_base: data.amount,
            tds_applicable: data.tds_applicable,
            tds_section: data.tds_section,
            tds_rate: data.tds_rate,
            tds_amount,
            net_amount,
            payment_mode: data.payment_mode,
            payment_date: new Date(data.payment_date),
            transaction_ref: data.transaction_ref,
            status: 'Completed',
            notes: data.notes,
            recorded_by: userId,
            organizationId,
            financial_year: getFinancialYear(new Date(data.payment_date)),
        });

        await transaction.save();

        let orderSummary = null;

        // ═══════════════════════════════════════════════════════
        // 5. AUTO-SYNC: Update the order with payment data
        // ═══════════════════════════════════════════════════════

        if (data.reference_type === 'SalesOrder') {
            // ── 5a. Update SalesOrder model (if the order was created via Mongoose) ──
            const order = await SalesOrder.findOne({ _id: data.reference_id, organizationId });

            if (order) {
                const allPayments = await PaymentTransaction.find({
                    reference_type: 'SalesOrder',
                    reference_id: data.reference_id,
                    status: 'Completed',
                    is_deleted: false,
                });

                const totalPaid = allPayments.reduce((sum, p) => sum + p.net_amount, 0);

                order.total_paid = totalPaid;
                order.balance_due = order.grand_total - order.total_paid;
                order.payment_status = computePaymentStatus({
                    grand_total: order.grand_total,
                    total_paid: order.total_paid,
                    payment_due_date: order.payment_due_date,
                });
                order.last_payment_date = new Date(data.payment_date);
                order.is_overdue = (order.balance_due > 0 && order.payment_due_date < new Date());

                await order.save();

                orderSummary = {
                    order_id: order._id,
                    order_number: order.order_number,
                    order_total: order.grand_total,
                    total_paid: order.total_paid,
                    total_tds: tds_amount,
                    balance_due: order.balance_due,
                    payment_status: order.payment_status,
                    payment_percentage: (order.total_paid / order.grand_total) * 100,
                    is_overdue: order.is_overdue,
                };
            }

            // ── 5b. Update legacy `orders` collection (always do this) ──────
            const db = await getDb();
            const ordersCol = db.collection("orders");
            const paymentsCol = db.collection("payments");

            // Try to find the order in the legacy collection
            let legacyOrder: any = null;
            try {
                if (ObjectId.isValid(data.reference_id)) {
                    legacyOrder = await ordersCol.findOne({ _id: new ObjectId(data.reference_id) });
                }
            } catch { /* not found via ObjectId */ }

            if (legacyOrder) {
                const totalAmount = Number(legacyOrder.total_amount || legacyOrder.grand_total || 0);

                // Sum all payments for this order from the legacy `payments` collection
                const legacyPayments = await paymentsCol
                    .find({ order_id: data.reference_id })
                    .toArray();

                const legacyTotalPaid = legacyPayments.reduce(
                    (sum: number, p: any) => sum + Number(p.amount || 0),
                    0,
                );

                // Add the current payment amount (it was saved to PaymentTransaction, also
                // save to the legacy payments collection to keep them in sync)
                const totalPaidNow = legacyTotalPaid + data.amount;

                // Also insert into legacy payments collection so future lookups see it
                await paymentsCol.insertOne({
                    userId: legacyOrder.userId || userId,
                    amount: data.amount,
                    payment_date: new Date(data.payment_date),
                    payment_method: data.payment_mode.toLowerCase().replace(/ /g, "_"),
                    notes: data.notes || "",
                    client_id: legacyOrder.client_id || data.party_id || null,
                    order_id: data.reference_id,
                    transaction_ref: data.transaction_ref || null,
                    createdAt: new Date(),
                    financial_year: getFinancialYear(new Date(data.payment_date)),
                });

                // Compute payment status (production status is managed separately — NOT touched here)
                const newPaymentStatus = computeLegacyPaymentStatus(totalPaidNow, totalAmount);

                // Update the legacy order with payment-related fields only
                await ordersCol.updateOne(
                    { _id: new ObjectId(data.reference_id) },
                    {
                        $set: {
                            payment_status: newPaymentStatus,
                            total_paid: totalPaidNow,
                            balance_due: Math.max(0, totalAmount - totalPaidNow),
                            // status intentionally NOT touched — derived from production_status + payment_status
                            last_payment_date: new Date(data.payment_date),
                            updatedAt: new Date(),
                        },
                    },
                );

                // Build order summary from legacy data if not already set via SalesOrder
                if (!orderSummary) {
                    orderSummary = {
                        order_id: data.reference_id,
                        order_total: totalAmount,
                        total_paid: totalPaidNow,
                        total_tds: tds_amount,
                        balance_due: Math.max(0, totalAmount - totalPaidNow),
                        payment_status: newPaymentStatus,
                        payment_percentage: totalAmount > 0 ? (totalPaidNow / totalAmount) * 100 : 0,
                    };
                } else {
                    // Augment existing summary with legacy sync info
                    orderSummary.payment_status = newPaymentStatus;
                    orderSummary.total_paid = totalPaidNow;
                    orderSummary.balance_due = Math.max(0, totalAmount - totalPaidNow);
                }
            }
        }

        // 6. Activity Logging
        try {
            await AuditLog.create({
                organizationId,
                userId,
                userName: sessionUser?.fullName || sessionUser?.email || "System User",
                userRole: sessionUser?.role || "Staff",
                action: `Recorded \u20B9${data.amount} receipt for Order #${data.reference_id}`,
                actionType: 'create',
                module: 'payments',
                resourceId: transaction._id.toString(),
                resourceType: 'PaymentTransaction',
            });
        } catch (auditErr) {
            console.error("[payments/record] Audit log error:", auditErr);
        }

        return NextResponse.json({
            success: true,
            transaction: {
                transaction_number: transaction.transaction_number,
                amount: transaction.amount,
                tds_amount: transaction.tds_amount,
                net_amount: transaction.net_amount,
                payment_mode: transaction.payment_mode,
                payment_date: transaction.payment_date,
            },
            order_summary: orderSummary,
        });

    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: e.errors }, { status: 400 });
        }
        console.error("[payments/record] Error:", e);
        return NextResponse.json({ success: false, error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
