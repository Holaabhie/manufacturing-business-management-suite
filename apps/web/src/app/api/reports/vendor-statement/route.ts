import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import {
    toKolkataDateString,
    getFYDateRange,
    type VendorStatementLine,
    type VendorStatementResult,
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
        const vendorIdParam = searchParams.get("vendor_id") || searchParams.get("vendorId");

        if (!vendorIdParam || !vendorIdParam.trim()) {
            return NextResponse.json({ error: "vendor_id is required" }, { status: 400 });
        }

        const vendorId = vendorIdParam.trim();
        const defaultFY = getFYDateRange("current");
        const from = searchParams.get("from") || defaultFY.from;
        const to = searchParams.get("to") || defaultFY.to;

        const db = await getDb();

        // 1. Vendor verification & lookup (scoped strictly to tenant)
        let vendorQuery: any = { userId: tenantId };
        if (ObjectId.isValid(vendorId)) {
            vendorQuery.$or = [{ _id: new ObjectId(vendorId) }, { _id: vendorId }];
        } else {
            vendorQuery._id = vendorId;
        }

        const vendorDoc = await db.collection("vendors").findOne(vendorQuery);
        if (!vendorDoc) {
            // Must return 404 if vendor not found or belongs to another tenant
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
        }

        const vendorStrId = String(vendorDoc._id);

        // 2. Fetch all bills for this vendor
        const bills = await db
            .collection("vendor_bills")
            .find({
                userId: tenantId,
                vendor_id: vendorStrId,
            })
            .toArray();

        // 3. Fetch all non-voided payments for this vendor
        const payments = await db
            .collection("vendor_bill_payments")
            .find({
                userId: tenantId,
                vendor_id: vendorStrId,
                voided: { $ne: true },
            })
            .toArray();

        // 4. Compute opening balance & period transaction lines
        let openingBalancePaise = 0;

        interface InternalTx {
            date: string;
            type: "Bill" | "Payment";
            particulars: string;
            billNumber?: string;
            vendorInvoiceNumber?: string;
            tdsNote?: string;
            debitPaise: number;
            creditPaise: number;
            refId: string;
            createdAt?: any;
        }

        const periodTransactions: InternalTx[] = [];

        // Process Bills (Exclude Draft and Void)
        for (const bill of bills) {
            if (bill.status === "Draft" || bill.status === "Void") {
                continue;
            }

            const rawAmount = typeof bill.payable_paise === "number"
                ? bill.payable_paise
                : Math.round((bill.payable_amount || 0) * 100);

            const dateStr = toKolkataDateString(bill.bill_date);
            if (!dateStr) continue;

            const billNumber = bill.bill_number || "";
            const vendorInvoiceNumber = bill.vendor_invoice_number || "";
            let tdsNote: string | undefined;
            if (bill.tds && bill.tds.amount > 0) {
                const sec = bill.tds.section ? `Sec ${bill.tds.section}` : "";
                const rate = bill.tds.rate ? ` (${bill.tds.rate}%)` : "";
                tdsNote = `TDS ${sec}${rate}: ₹${bill.tds.amount.toLocaleString("en-IN")}`;
            }

            const particulars = vendorInvoiceNumber
                ? `Bill ${billNumber} (Inv #${vendorInvoiceNumber})`
                : `Bill ${billNumber}`;

            if (dateStr < from) {
                // Bill prior to period start increases the liability (Credit) in opening balance
                openingBalancePaise += rawAmount;
            } else if (dateStr <= to) {
                periodTransactions.push({
                    date: dateStr,
                    type: "Bill",
                    particulars,
                    billNumber,
                    vendorInvoiceNumber,
                    tdsNote,
                    debitPaise: 0,
                    creditPaise: rawAmount,
                    refId: String(bill._id || bill.id),
                    createdAt: bill.created_at || bill.createdAt,
                });
            }
        }

        // Process Payments (non-voided)
        for (const payment of payments) {
            const rawAmount = typeof payment.amount_paise === "number"
                ? payment.amount_paise
                : Math.round((payment.amount || 0) * 100);

            const dateStr = toKolkataDateString(payment.payment_date);
            if (!dateStr) continue;

            const mode = payment.payment_mode || "Payment";
            const ref = payment.reference ? `Ref: ${payment.reference}` : "";
            const notes = payment.notes ? ` - ${payment.notes}` : "";
            const particulars = ref ? `Payment (${mode}, ${ref})${notes}` : `Payment (${mode})${notes}`;

            if (dateStr < from) {
                // Payment prior to period start decreases the liability (Debit) in opening balance
                openingBalancePaise -= rawAmount;
            } else if (dateStr <= to) {
                periodTransactions.push({
                    date: dateStr,
                    type: "Payment",
                    particulars,
                    debitPaise: rawAmount,
                    creditPaise: 0,
                    refId: String(payment._id || payment.id),
                    createdAt: payment.created_at || payment.createdAt,
                });
            }
        }

        // Sort period transactions:
        // 1. Date ASC
        // 2. Same-day: Bills before Payments (Bill first so credit happens before payment debit)
        // 3. Fallback: createdAt ASC or refId
        periodTransactions.sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            if (a.type !== b.type) {
                return a.type === "Bill" ? -1 : 1;
            }
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (timeA !== timeB) return timeA - timeB;
            return a.refId.localeCompare(b.refId);
        });

        // Compute running balances & totals
        let currentRunningPaise = openingBalancePaise;
        let totalDebitPaise = 0;
        let totalCreditPaise = 0;

        const statementLines: VendorStatementLine[] = periodTransactions.map((tx) => {
            totalDebitPaise += tx.debitPaise;
            totalCreditPaise += tx.creditPaise;
            // Running balance = Previous + Credit - Debit
            currentRunningPaise += tx.creditPaise - tx.debitPaise;
            return {
                date: tx.date,
                type: tx.type,
                particulars: tx.particulars,
                billNumber: tx.billNumber,
                vendorInvoiceNumber: tx.vendorInvoiceNumber,
                tdsNote: tx.tdsNote,
                debit: tx.debitPaise / 100,
                credit: tx.creditPaise / 100,
                runningBalance: currentRunningPaise / 100,
                refId: tx.refId,
            };
        });

        const response: VendorStatementResult = {
            vendor: {
                id: vendorStrId,
                name: vendorDoc.name || "Unnamed Vendor",
                phone: vendorDoc.phone || "",
                address: vendorDoc.address || "",
                gstin: vendorDoc.gstin || "",
                stateCode: vendorDoc.state_code || vendorDoc.stateCode || "",
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
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error("Error generating vendor statement:", error);
        return NextResponse.json({ error: "Failed to generate vendor statement" }, { status: 500 });
    }
}
