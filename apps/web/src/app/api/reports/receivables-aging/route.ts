import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import {
    toKolkataDateString,
    addDaysToKolkataDateString,
    differenceInDays,
    DEFAULT_CREDIT_DAYS,
    type AgingClientRow,
    type ReceivablesAgingResult,
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
        const asOfParam = searchParams.get("as_of");
        const asOf = asOfParam || toKolkataDateString(new Date()) || "2026-09-29";

        const db = await getDb();

        // 1. Fetch all tenant clients
        const clients = await db
            .collection("clients")
            .find({ userId: tenantId })
            .toArray();

        const clientMap = new Map<string, { name: string; company: string; phone: string }>();
        const sampleClientIds = new Set<string>();
        for (const c of clients) {
            const id = String(c._id);
            if (c.is_sample === true) {
                sampleClientIds.add(id);
                continue;
            }
            clientMap.set(id, {
                name: c.name || "Unnamed Client",
                company: c.company || "",
                phone: c.phone || "",
            });
        }

        // 2. Fetch all tenant orders (receivables documents = orders collection ONLY)
        const rawOrders = await db
            .collection("orders")
            .find({ userId: tenantId })
            .toArray();

        // 3. Fetch all tenant payments (legacy payments collection ONLY; NEVER paymenttransactions)
        const rawPayments = await db
            .collection("payments")
            .find({ userId: tenantId })
            .toArray();

        let skippedOrdersCount = 0;
        let excludedOrdersCount = 0;
        let excludedSampleCount = 0;
        const sampleOrderIds = new Set<string>();

        interface OrderEntry {
            id: string;
            clientId: string | null;
            amountPaise: number;
            paymentsAppliedPaise: number;
            outstandingPaise: number;
            orderDateStr: string;
            dueDateStr: string;
        }

        const validOrdersMap = new Map<string, OrderEntry>();

        for (const order of rawOrders) {
            const clientId = order.client_id
                ? String(order.client_id)
                : order.clientId
                ? String(order.clientId)
                : order.customer_id
                ? String(order.customer_id)
                : null;

            // Exclude sample orders or orders belonging to sample clients
            if (order.is_sample === true || (clientId && sampleClientIds.has(clientId))) {
                excludedSampleCount++;
                sampleOrderIds.add(String(order._id));
                continue;
            }

            // Exclude cancelled / canceled
            const status = (order.status || "").toLowerCase().trim();
            if (status === "cancelled" || status === "canceled") {
                excludedOrdersCount++;
                continue;
            }

            // Skip and count orders whose amount is absent/non-finite
            const rawAmount = order.total_amount ?? order.totalAmount;
            if (typeof rawAmount !== "number" || isNaN(rawAmount) || !isFinite(rawAmount)) {
                skippedOrdersCount++;
                continue;
            }

            const amountPaise = Math.round(rawAmount * 100);
            const rawDate =
                order.order_date ?? order.orderDate ?? order.createdAt ?? order.created_at;
            const parsedOrderDateStr = toKolkataDateString(rawDate);
            if (parsedOrderDateStr && parsedOrderDateStr > asOf) {
                continue;
            }
            const orderDateStr = parsedOrderDateStr || asOf;

            // Due date: order.payment_due_date if present, else order date + DEFAULT_CREDIT_DAYS (30)
            const rawDueDate = order.payment_due_date ?? order.paymentDueDate;
            const dueDateStr =
                toKolkataDateString(rawDueDate) ||
                addDaysToKolkataDateString(orderDateStr, DEFAULT_CREDIT_DAYS);

            const orderId = String(order._id);
            validOrdersMap.set(orderId, {
                id: orderId,
                clientId,
                amountPaise,
                paymentsAppliedPaise: 0,
                outstandingPaise: 0,
                orderDateStr,
                dueDateStr,
            });
        }

        // Unallocated credit in paise per client (key = clientId or "unassigned")
        const unallocatedCreditPaiseMap = new Map<string, number>();

        // 4. Apply payments
        const seenPaymentIds = new Set<string>();
        for (const payment of rawPayments) {
            const pid = String(payment._id);
            if (seenPaymentIds.has(pid)) continue;
            seenPaymentIds.add(pid);

            // Exclude sample payments or payments tied to sample orders / sample clients
            if (payment.is_sample === true) {
                continue;
            }
            const orderId = payment.order_id
                ? String(payment.order_id)
                : payment.orderId
                ? String(payment.orderId)
                : null;
            if (orderId && sampleOrderIds.has(orderId)) {
                continue;
            }
            const cId = payment.client_id
                ? String(payment.client_id)
                : payment.clientId
                ? String(payment.clientId)
                : null;
            if (cId && sampleClientIds.has(cId)) {
                continue;
            }

            const rawAmount = payment.amount;
            if (typeof rawAmount !== "number" || isNaN(rawAmount) || !isFinite(rawAmount)) {
                continue;
            }

            // Exclude payments recorded strictly after asOf
            const rawPaymentDate =
                payment.payment_date ?? payment.paymentDate ?? payment.date ?? payment.createdAt ?? payment.created_at;
            const parsedPaymentDateStr = toKolkataDateString(rawPaymentDate);
            if (parsedPaymentDateStr && parsedPaymentDateStr > asOf) {
                continue;
            }
            const paymentAmountPaise = Math.round(rawAmount * 100);

            if (orderId && validOrdersMap.has(orderId)) {
                // Payment applies directly to this order
                const ord = validOrdersMap.get(orderId)!;
                ord.paymentsAppliedPaise += paymentAmountPaise;
            } else {
                // Unallocated payment (advance/on-account)
                const cId = payment.client_id
                    ? String(payment.client_id)
                    : payment.clientId
                    ? String(payment.clientId)
                    : "unassigned";
                const cur = unallocatedCreditPaiseMap.get(cId) || 0;
                unallocatedCreditPaiseMap.set(cId, cur + paymentAmountPaise);
            }
        }

        // 5. Calculate outstanding per order & add excess payments to unallocated credit
        for (const ord of validOrdersMap.values()) {
            const cId = ord.clientId || "unassigned";
            if (ord.paymentsAppliedPaise > ord.amountPaise) {
                // Excess payment is added to that client's unallocated credit
                const excess = ord.paymentsAppliedPaise - ord.amountPaise;
                const cur = unallocatedCreditPaiseMap.get(cId) || 0;
                unallocatedCreditPaiseMap.set(cId, cur + excess);
                ord.outstandingPaise = 0;
            } else {
                ord.outstandingPaise = ord.amountPaise - ord.paymentsAppliedPaise;
            }
        }

        // 6. Aggregate aging buckets per client
        interface Accumulator {
            notDuePaise: number;
            days1_30Paise: number;
            days31_60Paise: number;
            days61_90Paise: number;
            days90PlusPaise: number;
            totalOutstandingPaise: number;
        }

        const clientAccumulator = new Map<string, Accumulator>();

        const getAccumulator = (cId: string): Accumulator => {
            let acc = clientAccumulator.get(cId);
            if (!acc) {
                acc = {
                    notDuePaise: 0,
                    days1_30Paise: 0,
                    days31_60Paise: 0,
                    days61_90Paise: 0,
                    days90PlusPaise: 0,
                    totalOutstandingPaise: 0,
                };
                clientAccumulator.set(cId, acc);
            }
            return acc;
        };

        // Distribute order outstanding into buckets
        for (const ord of validOrdersMap.values()) {
            if (ord.outstandingPaise <= 0) continue;

            const cId = ord.clientId || "unassigned";
            const acc = getAccumulator(cId);
            acc.totalOutstandingPaise += ord.outstandingPaise;

            const daysPastDue = differenceInDays(asOf, ord.dueDateStr);

            if (daysPastDue <= 0) {
                acc.notDuePaise += ord.outstandingPaise;
            } else if (daysPastDue <= 30) {
                acc.days1_30Paise += ord.outstandingPaise;
            } else if (daysPastDue <= 60) {
                acc.days31_60Paise += ord.outstandingPaise;
            } else if (daysPastDue <= 90) {
                acc.days61_90Paise += ord.outstandingPaise;
            } else {
                acc.days90PlusPaise += ord.outstandingPaise;
            }
        }

        // Collect all client IDs that have either orders or unallocated credit
        const allClientKeys = new Set<string>([
            ...clientAccumulator.keys(),
            ...unallocatedCreditPaiseMap.keys(),
        ]);

        const rows: AgingClientRow[] = [];

        for (const cId of allClientKeys) {
            const acc = clientAccumulator.get(cId) || {
                notDuePaise: 0,
                days1_30Paise: 0,
                days31_60Paise: 0,
                days61_90Paise: 0,
                days90PlusPaise: 0,
                totalOutstandingPaise: 0,
            };

            const unallocatedCreditPaise = unallocatedCreditPaiseMap.get(cId) || 0;
            const netReceivablePaise = acc.totalOutstandingPaise - unallocatedCreditPaise;

            // "Clients with zero outstanding and zero credit are omitted."
            if (acc.totalOutstandingPaise === 0 && unallocatedCreditPaise === 0) {
                continue;
            }

            let clientName: string;
            let clientCompany = "";
            let clientPhone = "";

            if (cId === "unassigned") {
                clientName = "No client assigned";
            } else {
                const info = clientMap.get(cId);
                clientName = info ? info.name : "Unknown Client";
                clientCompany = info ? info.company : "";
                clientPhone = info ? info.phone : "";
            }

            rows.push({
                clientId: cId,
                clientName,
                clientCompany,
                clientPhone,
                notDue: acc.notDuePaise / 100,
                days1_30: acc.days1_30Paise / 100,
                days31_60: acc.days31_60Paise / 100,
                days61_90: acc.days61_90Paise / 100,
                days90Plus: acc.days90PlusPaise / 100,
                totalOutstanding: acc.totalOutstandingPaise / 100,
                unallocatedCredit: unallocatedCreditPaise / 100,
                netReceivable: netReceivablePaise / 100,
            });
        }

        // Sort rows by netReceivable DESC (or by name)
        rows.sort((a, b) => b.netReceivable - a.netReceivable);

        // 7. Compute totals
        const totalsPaise = {
            notDue: 0,
            days1_30: 0,
            days31_60: 0,
            days61_90: 0,
            days90Plus: 0,
            totalOutstanding: 0,
            unallocatedCredit: 0,
            netReceivable: 0,
        };

        for (const row of rows) {
            totalsPaise.notDue += Math.round(row.notDue * 100);
            totalsPaise.days1_30 += Math.round(row.days1_30 * 100);
            totalsPaise.days31_60 += Math.round(row.days31_60 * 100);
            totalsPaise.days61_90 += Math.round(row.days61_90 * 100);
            totalsPaise.days90Plus += Math.round(row.days90Plus * 100);
            totalsPaise.totalOutstanding += Math.round(row.totalOutstanding * 100);
            totalsPaise.unallocatedCredit += Math.round(row.unallocatedCredit * 100);
            totalsPaise.netReceivable += Math.round(row.netReceivable * 100);
        }

        const totals = {
            notDue: totalsPaise.notDue / 100,
            days1_30: totalsPaise.days1_30 / 100,
            days31_60: totalsPaise.days31_60 / 100,
            days61_90: totalsPaise.days61_90 / 100,
            days90Plus: totalsPaise.days90Plus / 100,
            totalOutstanding: totalsPaise.totalOutstanding / 100,
            unallocatedCredit: totalsPaise.unallocatedCredit / 100,
            netReceivable: totalsPaise.netReceivable / 100,
        };

        const overduePaise =
            totalsPaise.days1_30 +
            totalsPaise.days31_60 +
            totalsPaise.days61_90 +
            totalsPaise.days90Plus;

        const kpis = {
            totalOutstanding: totals.totalOutstanding,
            overdue: overduePaise / 100,
            overdue90Plus: totals.days90Plus,
            unallocatedCredit: totals.unallocatedCredit,
            netReceivable: totals.netReceivable,
        };

        const resultResponse: ReceivablesAgingResult = {
            asOf,
            kpis,
            rows,
            totals,
            meta: {
                skippedOrdersCount,
                excludedOrdersCount,
                excludedSampleCount,
                totalClientsWithBalances: rows.length,
            },
        };

        return NextResponse.json(resultResponse);
    } catch (error: unknown) {
        console.error("Error generating receivables aging:", error);
        return NextResponse.json({ error: "Failed to generate receivables aging report" }, { status: 500 });
    }
}
