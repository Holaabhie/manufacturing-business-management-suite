import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type {
    IVendorBillRepository,
    VendorBill,
    VendorBillPayment,
    VendorBillListSummary,
    BillStatus,
    SupplyType,
    BillPaymentMode,
    VendorSnapshot,
    VendorBillItem,
    TdsDetails,
} from "../domain/types";

function buildIdQuery(id: string, userId: string) {
    if (ObjectId.isValid(id)) {
        return {
            $or: [{ _id: new ObjectId(id), userId }, { _id: id, userId }],
        };
    }
    return { _id: id, userId };
}

function toBillEntity(doc: Record<string, unknown>): VendorBill {
    const rawItems = (doc.items as Record<string, unknown>[]) || [];
    const items: VendorBillItem[] = rawItems.map((item) => ({
        description: String(item.description || ""),
        hsn_sac: String(item.hsn_sac || ""),
        qty: Number(item.qty || 0),
        unit: String(item.unit || "unit"),
        rate: Number(item.rate || 0),
        discount: Number(item.discount || 0),
        gst_rate: Number(item.gst_rate || 0),
        taxable: Number(item.taxable || 0),
        cgst: Number(item.cgst || 0),
        sgst: Number(item.sgst || 0),
        igst: Number(item.igst || 0),
        line_total: Number(item.line_total || 0),
    }));

    const rawVendor = (doc.vendor as Record<string, unknown>) || {};
    const vendor: VendorSnapshot = {
        name: String(rawVendor.name || ""),
        gstin: rawVendor.gstin ? String(rawVendor.gstin) : "",
        address: rawVendor.address ? String(rawVendor.address) : "",
        phone: rawVendor.phone ? String(rawVendor.phone) : "",
        state_code: rawVendor.state_code ? String(rawVendor.state_code) : "",
    };

    let tds: TdsDetails | null = null;
    if (doc.tds && typeof doc.tds === "object") {
        const rawTds = doc.tds as Record<string, unknown>;
        tds = {
            section: String(rawTds.section || ""),
            rate: Number(rawTds.rate || 0),
            base_amount: Number(rawTds.base_amount || 0),
            amount: Number(rawTds.amount || 0),
        };
    }

    const payableAmount = Number(doc.payable_amount || 0);
    const paidTotal = Number(doc.paid_total || 0);
    const paidTotalPaise = Number(doc.paid_total_paise ?? Math.round(paidTotal * 100));
    const payablePaise = Number(doc.payable_paise ?? Math.round(payableAmount * 100));

    return {
        id: String(doc._id),
        userId: String(doc.userId || ""),
        bill_number: String(doc.bill_number || ""),
        financial_year: String(doc.financial_year || ""),
        vendor_id: String(doc.vendor_id || ""),
        vendor,
        purchase_order_id: doc.purchase_order_id ? String(doc.purchase_order_id) : null,
        vendor_invoice_number: String(doc.vendor_invoice_number || ""),
        bill_date: String(doc.bill_date || ""),
        due_date: String(doc.due_date || ""),
        supply_type: (doc.supply_type as SupplyType) || null,
        place_of_supply_state_code: doc.place_of_supply_state_code ? String(doc.place_of_supply_state_code) : null,
        reverse_charge: Boolean(doc.reverse_charge),
        itc_eligible: Boolean(doc.itc_eligible),
        items,
        subtotal: Number(doc.subtotal || 0),
        cgst_total: Number(doc.cgst_total || 0),
        sgst_total: Number(doc.sgst_total || 0),
        igst_total: Number(doc.igst_total || 0),
        total_tax: Number(doc.total_tax || 0),
        grand_total: Number(doc.grand_total || 0),
        tds,
        payable_amount: payableAmount,
        paid_total: paidTotal,
        paid_total_paise: paidTotalPaise,
        payable_paise: payablePaise,
        status: (String(doc.status || "Draft")) as BillStatus,
        dup_key: doc.dup_key ? String(doc.dup_key) : undefined,
        notes: String(doc.notes || ""),
        created_by: String(doc.created_by || ""),
        created_at: doc.created_at instanceof Date ? doc.created_at : new Date(String(doc.created_at || Date.now())),
        updated_at: doc.updated_at instanceof Date ? doc.updated_at : new Date(String(doc.updated_at || Date.now())),
        opened_at: doc.opened_at ? (doc.opened_at instanceof Date ? doc.opened_at : new Date(String(doc.opened_at))) : null,
        voided_at: doc.voided_at ? (doc.voided_at instanceof Date ? doc.voided_at : new Date(String(doc.voided_at))) : null,
        void_reason: doc.void_reason ? String(doc.void_reason) : null,
    };
}

function toPaymentEntity(doc: Record<string, unknown>): VendorBillPayment {
    return {
        id: String(doc._id),
        userId: String(doc.userId || ""),
        vendor_bill_id: String(doc.vendor_bill_id || ""),
        vendor_id: String(doc.vendor_id || ""),
        amount: Number(doc.amount || 0),
        amount_paise: Number(doc.amount_paise || Math.round(Number(doc.amount || 0) * 100)),
        payment_date: String(doc.payment_date || ""),
        payment_mode: (String(doc.payment_mode || "Bank")) as BillPaymentMode,
        reference: String(doc.reference || ""),
        notes: String(doc.notes || ""),
        financial_year: String(doc.financial_year || ""),
        recorded_by: String(doc.recorded_by || ""),
        created_at: doc.created_at instanceof Date ? doc.created_at : new Date(String(doc.created_at || Date.now())),
        voided: Boolean(doc.voided),
        voided_at: doc.voided_at ? (doc.voided_at instanceof Date ? doc.voided_at : new Date(String(doc.voided_at))) : null,
        voided_by: doc.voided_by ? String(doc.voided_by) : null,
        void_reason: doc.void_reason ? String(doc.void_reason) : null,
    };
}

export class MongoVendorBillRepository implements IVendorBillRepository {
    private async billsCol() {
        return (await getDb()).collection<any>("vendor_bills");
    }

    private async paymentsCol() {
        return (await getDb()).collection<any>("vendor_bill_payments");
    }

    async createBill(bill: VendorBill): Promise<VendorBill> {
        const col = await this.billsCol();
        const docToInsert: Record<string, unknown> = {
            ...bill,
            _id: bill.id,
            created_at: bill.created_at || new Date(),
            updated_at: bill.updated_at || new Date(),
        };
        if (!docToInsert.dup_key) {
            delete docToInsert.dup_key;
        }
        await col.insertOne(docToInsert as any);
        return bill;
    }

    async findById(id: string, userId: string): Promise<VendorBill | null> {
        const col = await this.billsCol();
        const doc = await col.findOne(buildIdQuery(id, userId));
        if (!doc) return null;
        return toBillEntity(doc);
    }

    async findAll(
        userId: string,
        filter?: { status?: string; search?: string; vendor_id?: string; from_date?: string; to_date?: string }
    ): Promise<VendorBill[]> {
        const col = await this.billsCol();
        const query: Record<string, unknown> = { userId };

        if (filter?.status && filter.status !== "all") {
            query.status = filter.status;
        }

        if (filter?.vendor_id) {
            query.vendor_id = filter.vendor_id;
        }

        if (filter?.from_date || filter?.to_date) {
            const dateQuery: Record<string, string> = {};
            if (filter.from_date) dateQuery.$gte = filter.from_date;
            if (filter.to_date) dateQuery.$lte = filter.to_date;
            query.bill_date = dateQuery;
        }

        if (filter?.search && filter.search.trim()) {
            const s = filter.search.trim();
            query.$or = [
                { bill_number: { $regex: s, $options: "i" } },
                { "vendor.name": { $regex: s, $options: "i" } },
                { vendor_invoice_number: { $regex: s, $options: "i" } },
            ];
        }

        const docs = await col.find(query).sort({ bill_date: -1, created_at: -1 }).toArray();
        return docs.map(toBillEntity);
    }

    async updateBill(
        id: string,
        userId: string,
        update: Partial<VendorBill>,
        unset?: Record<string, "">
    ): Promise<VendorBill | null> {
        const col = await this.billsCol();
        const updateDoc: Record<string, unknown> = {
            $set: {
                ...update,
                updated_at: new Date(),
            },
        };
        if (unset && Object.keys(unset).length > 0) {
            updateDoc.$unset = unset;
        }

        const result = await col.findOneAndUpdate(
            buildIdQuery(id, userId),
            updateDoc,
            { returnDocument: "after" }
        );
        if (!result) return null;
        return toBillEntity(result);
    }

    async deleteDraftBill(id: string, userId: string): Promise<boolean> {
        const col = await this.billsCol();
        const query: Record<string, unknown> = {
            ...buildIdQuery(id, userId),
            status: "Draft",
        };
        const result = await col.deleteOne(query);
        return result.deletedCount === 1;
    }

    async findPaymentsByBillId(billId: string, userId: string): Promise<VendorBillPayment[]> {
        const col = await this.paymentsCol();
        const docs = await col
            .find({ vendor_bill_id: billId, userId })
            .sort({ payment_date: -1, created_at: -1 })
            .toArray();
        return docs.map(toPaymentEntity);
    }

    async createPaymentWithAtomicGuard(
        billId: string,
        userId: string,
        payment: VendorBillPayment
    ): Promise<{ payment: VendorBillPayment; updatedBill: VendorBill }> {
        const billsCol = await this.billsCol();
        const paymentsCol = await this.paymentsCol();

        const amountPaise = payment.amount_paise || Math.round(payment.amount * 100);

        // 1. Atomic overpay guard on vendor_bills:
        // paid_total_paise + amountPaise <= payable_paise
        const updatedBillDoc = await billsCol.findOneAndUpdate(
            {
                ...buildIdQuery(billId, userId),
                status: "Open",
                $expr: {
                    $lte: [
                        { $add: [{ $ifNull: ["$paid_total_paise", 0] }, amountPaise] },
                        "$payable_paise",
                    ],
                },
            },
            {
                $inc: {
                    paid_total_paise: amountPaise,
                    paid_total: payment.amount,
                },
                $set: { updated_at: new Date() },
            },
            { returnDocument: "after" }
        );

        if (!updatedBillDoc) {
            // Check why it failed
            const existingBill = await billsCol.findOne(buildIdQuery(billId, userId));
            if (!existingBill) {
                const err: any = new Error("Vendor bill not found");
                err.statusCode = 404;
                throw err;
            }
            if (existingBill.status !== "Open") {
                const err: any = new Error(`Payments can only be recorded on Open bills (current status: ${existingBill.status})`);
                err.statusCode = 409;
                throw err;
            }

            const currentPaidPaise = Number(existingBill.paid_total_paise ?? Math.round(Number(existingBill.paid_total || 0) * 100));
            const payablePaise = Number(existingBill.payable_paise ?? Math.round(Number(existingBill.payable_amount || 0) * 100));
            const remainingPaise = Math.max(0, payablePaise - currentPaidPaise);
            const remainingRupees = remainingPaise / 100;

            const err: any = new Error(
                `Payment amount (₹${payment.amount.toFixed(2)}) exceeds remaining balance (₹${remainingRupees.toFixed(2)})`
            );
            err.statusCode = 409;
            err.remainingBalance = remainingRupees;
            throw err;
        }

        // 2. Insert payment document
        const paymentDoc = {
            ...payment,
            _id: payment.id,
            amount_paise: amountPaise,
            created_at: payment.created_at || new Date(),
        };

        try {
            await paymentsCol.insertOne(paymentDoc as any);
        } catch (insertErr) {
            // Roll back the atomic increment on the bill
            await billsCol.updateOne(buildIdQuery(billId, userId), {
                $inc: {
                    paid_total_paise: -amountPaise,
                    paid_total: -payment.amount,
                },
            });
            throw insertErr;
        }

        return {
            payment: toPaymentEntity(paymentDoc),
            updatedBill: toBillEntity(updatedBillDoc),
        };
    }

    async voidPaymentWithAtomicGuard(
        billId: string,
        paymentId: string,
        userId: string,
        userName: string,
        voidReason: string
    ): Promise<{ payment: VendorBillPayment; updatedBill: VendorBill }> {
        const billsCol = await this.billsCol();
        const paymentsCol = await this.paymentsCol();

        const paymentQuery: Record<string, unknown> = {
            ...buildIdQuery(paymentId, userId),
            vendor_bill_id: billId,
            voided: { $ne: true },
        };

        // 1. Mark payment voided
        const updatedPaymentDoc = await paymentsCol.findOneAndUpdate(
            paymentQuery,
            {
                $set: {
                    voided: true,
                    voided_at: new Date(),
                    voided_by: userName,
                    void_reason: voidReason,
                },
            },
            { returnDocument: "after" }
        );

        if (!updatedPaymentDoc) {
            const existingPayment = await paymentsCol.findOne({
                ...buildIdQuery(paymentId, userId),
                vendor_bill_id: billId,
            });
            if (!existingPayment) {
                const err: any = new Error("Payment record not found");
                err.statusCode = 404;
                throw err;
            }
            const err: any = new Error("Payment is already voided");
            err.statusCode = 409;
            throw err;
        }

        const amountPaise = Number(updatedPaymentDoc.amount_paise ?? Math.round(Number(updatedPaymentDoc.amount || 0) * 100));
        const amountRupees = Number(updatedPaymentDoc.amount || 0);

        // 2. Decrement paid_total on vendor_bills
        const updatedBillDoc = await billsCol.findOneAndUpdate(
            buildIdQuery(billId, userId),
            {
                $inc: {
                    paid_total_paise: -amountPaise,
                    paid_total: -amountRupees,
                },
                $set: { updated_at: new Date() },
            },
            { returnDocument: "after" }
        );

        if (!updatedBillDoc) {
            const err: any = new Error("Vendor bill not found");
            err.statusCode = 404;
            throw err;
        }

        return {
            payment: toPaymentEntity(updatedPaymentDoc),
            updatedBill: toBillEntity(updatedBillDoc),
        };
    }

    async getBilledSubtotalForPo(poId: string, userId: string, excludeBillId?: string): Promise<number> {
        const col = await this.billsCol();
        const query: Record<string, unknown> = {
            purchase_order_id: poId,
            userId,
            status: { $ne: "Void" },
        };

        if (excludeBillId) {
            if (ObjectId.isValid(excludeBillId)) {
                query._id = { $nin: [new ObjectId(excludeBillId), excludeBillId] };
            } else {
                query._id = { $ne: excludeBillId };
            }
        }

        const bills = await col.find(query, { projection: { subtotal: 1 } }).toArray();
        return bills.reduce((sum, b) => sum + Number(b.subtotal || 0), 0);
    }

    async getSummary(userId: string, todayIST: string): Promise<VendorBillListSummary> {
        const col = await this.billsCol();

        // 7 days ahead in YYYY-MM-DD
        const d = new Date(todayIST + "T00:00:00.000Z");
        d.setUTCDate(d.getUTCDate() + 7);
        const next7DaysIST = d.toISOString().split("T")[0];

        // Fetch all non-Void bills
        const bills = await col
            .find({ userId, status: { $ne: "Void" } }, {
                projection: {
                    status: 1,
                    payable_amount: 1,
                    paid_total: 1,
                    due_date: 1,
                },
            })
            .toArray();

        let draftCount = 0;
        let openPayable = 0;
        let overdue = 0;
        let dueIn7Days = 0;

        for (const bill of bills) {
            if (bill.status === "Draft") {
                draftCount++;
                continue;
            }

            if (bill.status === "Open") {
                const payable = Number(bill.payable_amount || 0);
                const paid = Number(bill.paid_total || 0);
                const balance = Math.max(0, Math.round((payable - paid) * 100) / 100);

                if (balance > 0) {
                    openPayable += balance;
                    const dueDate = String(bill.due_date || "");
                    if (dueDate && dueDate < todayIST) {
                        overdue += balance;
                    } else if (dueDate && dueDate >= todayIST && dueDate <= next7DaysIST) {
                        dueIn7Days += balance;
                    }
                }
            }
        }

        return {
            open_payable: Math.round(openPayable * 100) / 100,
            overdue: Math.round(overdue * 100) / 100,
            due_in_7_days: Math.round(dueIn7Days * 100) / 100,
            draft_count: draftCount,
        };
    }
}

let _repo: MongoVendorBillRepository | null = null;
export function getVendorBillRepository(): MongoVendorBillRepository {
    if (!_repo) _repo = new MongoVendorBillRepository();
    return _repo;
}
