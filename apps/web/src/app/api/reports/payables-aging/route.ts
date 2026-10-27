import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import {
    toKolkataDateString,
    differenceInDays,
    type AgingBucket,
    type AgingBillDetail,
    type AgingVendorRow,
    type PayablesAgingResult,
} from "@/lib/reports/payables";

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
        const asOfParam = searchParams.get("asOf") || searchParams.get("as_of");
        const asOf = asOfParam || toKolkataDateString(new Date()) || "2026-10-02";

        const db = await getDb();

        // 1. Fetch all tenant vendors
        const vendors = await db
            .collection("vendors")
            .find({ userId: tenantId })
            .toArray();

        const vendorMap = new Map<string, { name: string; phone?: string; gstin?: string; address?: string }>();
        for (const v of vendors) {
            const id = String(v._id);
            vendorMap.set(id, {
                name: v.name || "Unnamed Vendor",
                phone: v.phone || "",
                gstin: v.gstin || "",
                address: v.address || "",
            });
        }

        // 2. Fetch all bills for this tenant
        const allBills = await db
            .collection("vendor_bills")
            .find({ userId: tenantId })
            .toArray();

        let excludedDraftCount = 0;
        let excludedVoidCount = 0;
        const openBills: (Record<string, unknown> & { _id?: unknown; id?: unknown; bill_number?: string; vendor_invoice_number?: string; bill_date?: string | Date; vendor_id?: string; vendor?: Record<string, unknown>; tds?: { amount?: number; section?: string } })[] = [];

        for (const bill of allBills) {
            if (bill.status === "Draft") {
                excludedDraftCount++;
                continue;
            }
            if (bill.status === "Void") {
                excludedVoidCount++;
                continue;
            }
            if (bill.status === "Open") {
                // Only consider bills with bill_date <= asOf
                const billDateStr = toKolkataDateString(bill.bill_date);
                if (billDateStr && billDateStr <= asOf) {
                    openBills.push(bill);
                }
            }
        }

        // 3. Fetch non-voided payments for these bills with payment_date <= asOf
        const openBillIds = openBills.map((b) => String(b._id || b.id));
        const payments = await db
            .collection("vendor_bill_payments")
            .find({
                userId: tenantId,
                vendor_bill_id: { $in: openBillIds },
                voided: { $ne: true },
            })
            .toArray();

        // Group payments by bill ID (only considering payment_date <= asOf)
        const paymentsByBillId = new Map<string, number>();
        for (const p of payments) {
            const pDateStr = toKolkataDateString(p.payment_date);
            if (pDateStr && pDateStr <= asOf) {
                const billId = String(p.vendor_bill_id);
                const amountPaise = typeof p.amount_paise === "number"
                    ? p.amount_paise
                    : Math.round((p.amount || 0) * 100);
                paymentsByBillId.set(billId, (paymentsByBillId.get(billId) || 0) + amountPaise);
            }
        }

        // 4. Calculate balance per bill as of asOf & accumulate into vendor aging buckets
        interface VendorAccumulator {
            vendorId: string;
            vendorName: string;
            vendorPhone?: string;
            vendorGstin?: string;
            vendorAddress?: string;
            notDuePaise: number;
            days1_30Paise: number;
            days31_60Paise: number;
            days61_90Paise: number;
            days90PlusPaise: number;
            totalOutstandingPaise: number;
            bills: AgingBillDetail[];
        }

        const vendorAccumulator = new Map<string, VendorAccumulator>();

        const getAccumulator = (vendorId: string, billVendorSnapshot?: { name?: string; phone?: string; gstin?: string; address?: string }): VendorAccumulator => {
            let acc = vendorAccumulator.get(vendorId);
            if (!acc) {
                const vendorInfo = vendorMap.get(vendorId);
                acc = {
                    vendorId,
                    vendorName: vendorInfo?.name || billVendorSnapshot?.name || "Unknown Vendor",
                    vendorPhone: vendorInfo?.phone || billVendorSnapshot?.phone || "",
                    vendorGstin: vendorInfo?.gstin || billVendorSnapshot?.gstin || "",
                    vendorAddress: vendorInfo?.address || billVendorSnapshot?.address || "",
                    notDuePaise: 0,
                    days1_30Paise: 0,
                    days31_60Paise: 0,
                    days61_90Paise: 0,
                    days90PlusPaise: 0,
                    totalOutstandingPaise: 0,
                    bills: [],
                };
                vendorAccumulator.set(vendorId, acc);
            }
            return acc!;
        };

        let totalOpenBillsCount = 0;

        for (const bill of openBills) {
            const billId = String(bill._id || bill.id);
            const payablePaise = typeof bill.payable_paise === "number"
                ? bill.payable_paise
                : Math.round((Number(bill.payable_amount) || 0) * 100);

            const paidPaise = paymentsByBillId.get(billId) || 0;
            const balancePaise = payablePaise - paidPaise;

            // If balance <= 0 as of asOf, bill was fully paid as of asOf
            if (balancePaise <= 0) {
                continue;
            }

            totalOpenBillsCount++;

            const dueDateStr = toKolkataDateString(bill.due_date as string | Date) || toKolkataDateString(bill.bill_date as string | Date) || asOf;
            const daysPastDue = differenceInDays(asOf, dueDateStr);

            let bucket: AgingBucket;
            if (daysPastDue <= 0) {
                bucket = "notDue";
            } else if (daysPastDue <= 30) {
                bucket = "days1_30";
            } else if (daysPastDue <= 60) {
                bucket = "days31_60";
            } else if (daysPastDue <= 90) {
                bucket = "days61_90";
            } else {
                bucket = "days90Plus";
            }

            const vendorId = String(bill.vendor_id || "unassigned");
            const acc = getAccumulator(vendorId, bill.vendor);

            acc.totalOutstandingPaise += balancePaise;
            if (bucket === "notDue") acc.notDuePaise += balancePaise;
            else if (bucket === "days1_30") acc.days1_30Paise += balancePaise;
            else if (bucket === "days31_60") acc.days31_60Paise += balancePaise;
            else if (bucket === "days61_90") acc.days61_90Paise += balancePaise;
            else acc.days90PlusPaise += balancePaise;

            acc.bills.push({
                billId,
                billNumber: bill.bill_number || "",
                vendorInvoiceNumber: bill.vendor_invoice_number || "",
                billDate: toKolkataDateString(bill.bill_date) || "",
                dueDate: dueDateStr,
                payableAmount: payablePaise / 100,
                paidAmount: paidPaise / 100,
                balance: balancePaise / 100,
                daysPastDue,
                bucket,
                tdsAmount: bill.tds?.amount,
                tdsSection: bill.tds?.section,
            });
        }

        // 5. Build vendor rows
        const rows: AgingVendorRow[] = [];
        for (const acc of vendorAccumulator.values()) {
            if (acc.totalOutstandingPaise <= 0) continue;

            // Sort vendor's bills by dueDate ASC
            acc.bills.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

            rows.push({
                vendorId: acc.vendorId,
                vendorName: acc.vendorName,
                vendorPhone: acc.vendorPhone,
                vendorGstin: acc.vendorGstin,
                vendorAddress: acc.vendorAddress,
                notDue: acc.notDuePaise / 100,
                days1_30: acc.days1_30Paise / 100,
                days31_60: acc.days31_60Paise / 100,
                days61_90: acc.days61_90Paise / 100,
                days90Plus: acc.days90PlusPaise / 100,
                totalOutstanding: acc.totalOutstandingPaise / 100,
                billsCount: acc.bills.length,
                bills: acc.bills,
            });
        }

        // Sort rows by totalOutstanding DESC
        rows.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

        // 6. Compute grand totals in paise
        const totalsPaise = {
            notDue: 0,
            days1_30: 0,
            days31_60: 0,
            days61_90: 0,
            days90Plus: 0,
            totalOutstanding: 0,
        };

        for (const row of rows) {
            totalsPaise.notDue += Math.round(row.notDue * 100);
            totalsPaise.days1_30 += Math.round(row.days1_30 * 100);
            totalsPaise.days31_60 += Math.round(row.days31_60 * 100);
            totalsPaise.days61_90 += Math.round(row.days61_90 * 100);
            totalsPaise.days90Plus += Math.round(row.days90Plus * 100);
            totalsPaise.totalOutstanding += Math.round(row.totalOutstanding * 100);
        }

        const totals = {
            notDue: totalsPaise.notDue / 100,
            days1_30: totalsPaise.days1_30 / 100,
            days31_60: totalsPaise.days31_60 / 100,
            days61_90: totalsPaise.days61_90 / 100,
            days90Plus: totalsPaise.days90Plus / 100,
            totalOutstanding: totalsPaise.totalOutstanding / 100,
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
            notDue: totals.notDue,
        };

        const response: PayablesAgingResult = {
            asOf,
            kpis,
            rows,
            totals,
            meta: {
                totalVendorsWithBalances: rows.length,
                totalOpenBillsCount,
                excludedDraftCount,
                excludedVoidCount,
            },
        };

        return NextResponse.json(response);
    } catch (error: unknown) {
        console.error("Error generating payables aging:", error);
        return NextResponse.json({ error: "Failed to generate payables aging report" }, { status: 500 });
    }
}
