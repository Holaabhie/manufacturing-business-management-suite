import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import {
    toKolkataDateString,
    getFYDateRange,
    type StatementLine,
    type StatementResult,
} from "@/lib/reports/receivables";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function GET(request: NextRequest) {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const user = result.user;
        const tenantId = getDataOwnerId(user);

        const { searchParams } = new URL(request.url);
        const clientIdParam = searchParams.get("client_id");

        if (!clientIdParam || !clientIdParam.trim()) {
            return NextResponse.json({ error: "client_id is required" }, { status: 400 });
        }

        const clientId = clientIdParam.trim();
        const defaultFY = getFYDateRange("current");
        const from = searchParams.get("from") || defaultFY.from;
        const to = searchParams.get("to") || defaultFY.to;

        const db = await getDb();

        // 1. Client verification & lookup (scoped to tenant)
        let clientQuery: Record<string, unknown> = { userId: tenantId };
        if (ObjectId.isValid(clientId)) {
            clientQuery.$or = [{ _id: new ObjectId(clientId) }, { _id: clientId }];
        } else {
            clientQuery._id = clientId;
        }

        const clientDoc = await db.collection("clients").findOne(clientQuery);
        if (!clientDoc) {
            // Must return 404 if client not found or belongs to another tenant
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        const clientStrId = String(clientDoc._id);
        const clientObjId = ObjectId.isValid(clientStrId) ? new ObjectId(clientStrId) : null;

        // 2. Fetch all tenant orders matching this client
        const clientMatchConditions: Record<string, unknown>[] = [
            { client_id: clientStrId },
            { clientId: clientStrId },
            { customer_id: clientStrId },
        ];
        if (clientObjId) {
            clientMatchConditions.push({ client_id: clientObjId });
            clientMatchConditions.push({ clientId: clientObjId });
            clientMatchConditions.push({ customer_id: clientObjId });
        }

        const orders = await db
            .collection("orders")
            .find({
                userId: tenantId,
                $or: clientMatchConditions,
            })
            .toArray();

        // 3. Fetch all tenant payments matching this client (legacy payments collection ONLY)
        const paymentMatchConditions: Record<string, unknown>[] = [
            { client_id: clientStrId },
            { clientId: clientStrId },
        ];
        if (clientObjId) {
            paymentMatchConditions.push({ client_id: clientObjId });
            paymentMatchConditions.push({ clientId: clientObjId });
        }

        // Also include payments with order_id matching any of this client's orders
        const orderIds = orders.map((o) => String(o._id));
        const orderObjIds = orders
            .map((o) => (ObjectId.isValid(String(o._id)) ? new ObjectId(String(o._id)) : null))
            .filter(Boolean);

        if (orderIds.length > 0) {
            paymentMatchConditions.push({ order_id: { $in: orderIds } });
            paymentMatchConditions.push({ orderId: { $in: orderIds } });
            if (orderObjIds.length > 0) {
                paymentMatchConditions.push({ order_id: { $in: orderObjIds } });
                paymentMatchConditions.push({ orderId: { $in: orderObjIds } });
            }
        }

        const payments = await db
            .collection("payments")
            .find({
                userId: tenantId,
                $or: paymentMatchConditions,
            })
            .toArray();

        // Map order particulars by order ID
        const orderParticularsMap = new Map<string, string>();
        for (const o of orders) {
            if (o.is_sample === true) continue;
            const id = String(o._id);
            const prod = o.product_name ?? o.productName ?? "Order";
            const badge = o.order_number ?? o.orderNumber ?? (String(o._id ?? o.id ?? "")).slice(0, 8).toUpperCase();
            const particulars = prod && badge && prod !== badge ? `${prod} (${badge})` : (prod || badge || "Order");
            orderParticularsMap.set(id, particulars);
        }

        // 4. Compute opening balance & period transaction lines
        let openingBalancePaise = 0;
        let excludedSampleCount = 0;
        const sampleOrderIds = new Set<string>();

        interface InternalTx {
            date: string;
            type: "Order" | "Payment";
            particulars: string;
            debitPaise: number;
            creditPaise: number;
            refId: string;
            createdAt?: unknown;
        }

        const periodTransactions: InternalTx[] = [];

        // Process Orders
        for (const order of orders) {
            // Exclude sample orders
            if (order.is_sample === true) {
                excludedSampleCount++;
                sampleOrderIds.add(String(order._id));
                continue;
            }

            // Exclude cancelled / canceled
            const status = (order.status || "").toLowerCase().trim();
            if (status === "cancelled" || status === "canceled") {
                continue;
            }

            // Skip and count non-finite amounts
            const rawAmount = order.total_amount ?? order.totalAmount;
            if (typeof rawAmount !== "number" || isNaN(rawAmount) || !isFinite(rawAmount)) {
                continue;
            }

            const amountPaise = Math.round(rawAmount * 100);
            const rawDate =
                order.order_date ?? order.orderDate ?? order.createdAt ?? order.created_at;
            const dateStr = toKolkataDateString(rawDate);
            if (!dateStr) continue;

            const prod = order.product_name ?? order.productName ?? "Order";
            const badge = order.order_number ?? order.orderNumber ?? (String(order._id ?? order.id ?? "")).slice(0, 8).toUpperCase();
            const particulars = prod && badge && prod !== badge ? `${prod} (${badge})` : (prod || badge || "Order");

            if (dateStr < from) {
                // Order prior to statement start period is a Debit to opening balance
                openingBalancePaise += amountPaise;
            } else if (dateStr <= to) {
                periodTransactions.push({
                    date: dateStr,
                    type: "Order",
                    particulars,
                    debitPaise: amountPaise,
                    creditPaise: 0,
                    refId: String(order._id),
                    createdAt: order.createdAt,
                });
            }
        }

        // Process Payments (deduplicated by _id)
        const seenPaymentIds = new Set<string>();
        for (const payment of payments) {
            const pid = String(payment._id);
            if (seenPaymentIds.has(pid)) continue;
            seenPaymentIds.add(pid);

            // Exclude sample payments or payments for sample orders
            if (payment.is_sample === true) {
                continue;
            }

            const rawAmount = payment.amount;
            if (typeof rawAmount !== "number" || isNaN(rawAmount) || !isFinite(rawAmount)) {
                continue;
            }

            const amountPaise = Math.round(rawAmount * 100);
            const rawDate =
                payment.payment_date ??
                payment.paymentDate ??
                payment.createdAt ??
                payment.created_at;
            const dateStr = toKolkataDateString(rawDate);
            if (!dateStr) continue;

            const orderId = payment.order_id ? String(payment.order_id) : (payment.orderId ? String(payment.orderId) : null);
            if (orderId && sampleOrderIds.has(orderId)) {
                continue;
            }

            let particulars: string;
            if (orderId && orderParticularsMap.has(orderId)) {
                particulars = `Payment - ${orderParticularsMap.get(orderId)}`;
            } else if (orderId) {
                particulars = payment.notes ? `Payment (${payment.notes})` : (payment.payment_method ? `Payment - ${payment.payment_method}` : "Payment");
            } else {
                particulars = "On account";
            }

            if (dateStr < from) {
                // Payment prior to statement start period is a Credit, reducing opening balance
                openingBalancePaise -= amountPaise;
            } else if (dateStr <= to) {
                periodTransactions.push({
                    date: dateStr,
                    type: "Payment",
                    particulars,
                    debitPaise: 0,
                    creditPaise: amountPaise,
                    refId: pid,
                    createdAt: payment.createdAt,
                });
            }
        }

        // Sort period transactions:
        // 1. Date ASC
        // 2. Same-day: Orders before Payments (Order = 0, Payment = 1)
        // 3. Fallback: createdAt ASC or refId
        periodTransactions.sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            if (a.type !== b.type) {
                return a.type === "Order" ? -1 : 1;
            }
            const timeA = a.createdAt ? new Date(a.createdAt as string | number | Date).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt as string | number | Date).getTime() : 0;
            if (timeA !== timeB) return timeA - timeB;
            return a.refId.localeCompare(b.refId);
        });

        // Compute running balances & totals
        let currentRunningPaise = openingBalancePaise;
        let totalDebitPaise = 0;
        let totalCreditPaise = 0;

        const statementLines: StatementLine[] = periodTransactions.map((tx) => {
            totalDebitPaise += tx.debitPaise;
            totalCreditPaise += tx.creditPaise;
            currentRunningPaise += tx.debitPaise - tx.creditPaise;
            return {
                date: tx.date,
                type: tx.type,
                particulars: tx.particulars,
                debit: tx.debitPaise / 100,
                credit: tx.creditPaise / 100,
                runningBalance: currentRunningPaise / 100,
                refId: tx.refId,
            };
        });

        const response: StatementResult = {
            client: {
                id: clientStrId,
                name: clientDoc.name || "Unnamed Client",
                company: clientDoc.company || "",
                email: clientDoc.email || "",
                phone: clientDoc.phone || "",
                address: clientDoc.address || "",
                gstin: clientDoc.gstin || "",
            },
            dateRange: {
                from,
                to,
            },
            openingBalance: openingBalancePaise / 100,
            totalDebit: totalDebitPaise / 100,
            totalCredit: totalCreditPaise / 100,
            closingBalance: currentRunningPaise / 100,
            lines: statementLines,
            meta: {
                excludedSampleCount,
            },
        };

        return NextResponse.json(response);
    } catch (error: unknown) {
        console.error("Error generating client statement:", error);
        return NextResponse.json({ error: "Failed to generate statement of account" }, { status: 500 });
    }
}
