import { randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

function makeIdFilter(id: string, userId: string): any {
    if (ObjectId.isValid(id)) {
        return {
            $or: [{ _id: new ObjectId(id), userId }, { _id: id, userId }],
        };
    }
    return { _id: id, userId };
}
import { DEFAULT_CREDIT_DAYS } from "@/lib/reports/receivables";
import { getFinancialYear, getCurrentFinancialYear } from "@/lib/utils/financial-year";
import { ValidationError, NotFoundError, ConflictError } from "@/shared/lib/errors";
import {
    createVendorBillSchema,
    updateVendorBillSchema,
    recordBillPaymentSchema,
    voidBillPaymentSchema,
    billStatusTransitionSchema,
    type CreateVendorBillInput,
    type UpdateVendorBillInput,
    type RecordBillPaymentInput,
} from "../domain/schemas";
import type {
    IVendorBillRepository,
    VendorBill,
    VendorBillPayment,
    VendorBillItem,
    TdsDetails,
    VendorSnapshot,
    SupplyType,
    PaymentStatus,
    VendorBillListSummary,
    PoSummaryResponse,
} from "../domain/types";
import { generateSequentialVendorBillNumber } from "../infrastructure/vendor-bill-sequence";

export function getTodayIST(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function addDaysToKolkataDate(dateStr: string, days: number): string {
    const d = new Date(dateStr + "T00:00:00.000Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split("T")[0];
}

interface RawLineItemInput {
    description: string;
    hsn_sac?: string;
    qty: number;
    unit?: string;
    rate: number;
    discount?: number;
    gst_rate?: number;
}

export class VendorBillService {
    constructor(private readonly repo: IVendorBillRepository) { }

    /**
     * Compute line item amounts in integer paise and round appropriately.
     */
    private calculateLinesAndTotals(
        rawItems: RawLineItemInput[],
        supplyType: SupplyType | null,
        tdsInput?: { section: string; rate: number } | null
    ) {
        let subtotalPaise = 0;
        let cgstTotalPaise = 0;
        let sgstTotalPaise = 0;
        let igstTotalPaise = 0;

        const items: VendorBillItem[] = rawItems.map((raw) => {
            const qty = Number(raw.qty) || 0;
            const rate = Number(raw.rate) || 0;
            const rawDiscount = Number(raw.discount) || 0;
            const gstRate = Number(raw.gst_rate) || 0;

            const grossPaise = Math.round(qty * rate * 100);
            const discountPaise = Math.min(Math.max(0, Math.round(rawDiscount * 100)), grossPaise);
            const taxablePaise = grossPaise - discountPaise;
            const taxPaise = Math.round((taxablePaise * gstRate) / 100);

            let cgstPaise = 0;
            let sgstPaise = 0;
            let igstPaise = 0;

            if (supplyType === "intra") {
                cgstPaise = Math.round(taxPaise / 2);
                sgstPaise = taxPaise - cgstPaise;
                igstPaise = 0;
            } else if (supplyType === "inter") {
                igstPaise = taxPaise;
                cgstPaise = 0;
                sgstPaise = 0;
            }

            const lineTotalPaise = taxablePaise + taxPaise;

            subtotalPaise += taxablePaise;
            cgstTotalPaise += cgstPaise;
            sgstTotalPaise += sgstPaise;
            igstTotalPaise += igstPaise;

            return {
                description: String(raw.description || "").trim(),
                hsn_sac: String(raw.hsn_sac || "").trim(),
                qty,
                unit: String(raw.unit || "unit").trim(),
                rate,
                discount: discountPaise / 100,
                gst_rate: gstRate,
                taxable: taxablePaise / 100,
                cgst: cgstPaise / 100,
                sgst: sgstPaise / 100,
                igst: igstPaise / 100,
                line_total: lineTotalPaise / 100,
            };
        });

        const totalTaxPaise = cgstTotalPaise + sgstTotalPaise + igstTotalPaise;
        const grandTotalPaise = subtotalPaise + totalTaxPaise;

        let tds: TdsDetails | null = null;
        let tdsAmountPaise = 0;
        if (tdsInput && tdsInput.rate > 0) {
            const rate = Number(tdsInput.rate) || 0;
            tdsAmountPaise = Math.round((subtotalPaise * rate) / 100);
            tds = {
                section: String(tdsInput.section || "").trim(),
                rate,
                base_amount: subtotalPaise / 100,
                amount: tdsAmountPaise / 100,
            };
        }

        const payablePaise = Math.max(0, grandTotalPaise - tdsAmountPaise);

        return {
            items,
            subtotalPaise,
            cgstTotalPaise,
            sgstTotalPaise,
            igstTotalPaise,
            totalTaxPaise,
            grandTotalPaise,
            tds,
            tdsAmountPaise,
            payablePaise,
            subtotal: subtotalPaise / 100,
            cgst_total: cgstTotalPaise / 100,
            sgst_total: sgstTotalPaise / 100,
            igst_total: igstTotalPaise / 100,
            total_tax: totalTaxPaise / 100,
            grand_total: grandTotalPaise / 100,
            payable_amount: payablePaise / 100,
        };
    }

    /**
     * Enrich a bill with read-time derived fields.
     */
    enrichBill(bill: VendorBill, payments?: VendorBillPayment[]): VendorBill {
        const todayIST = getTodayIST();
        const nonVoidedPayments = (payments || []).filter((p) => !p.voided);
        const paidTotalFromPayments = nonVoidedPayments.reduce((acc, p) => acc + p.amount, 0);

        const paid = payments ? paidTotalFromPayments : bill.paid_total;
        const balance = Math.max(0, Math.round((bill.payable_amount - paid) * 100) / 100);

        let paymentStatus: PaymentStatus = "Unpaid";
        if (balance <= 0 && bill.payable_amount > 0) {
            paymentStatus = "Paid";
        } else if (paid > 0) {
            paymentStatus = "Partially Paid";
        } else if (bill.payable_amount === 0) {
            paymentStatus = "Paid";
        }

        const isOverdue = bill.status === "Open" && balance > 0 && bill.due_date < todayIST;

        return {
            ...bill,
            paid_total: Math.round(paid * 100) / 100,
            balance,
            payment_status: paymentStatus,
            overdue: isOverdue,
        };
    }

    /**
     * Create a new Vendor Bill (Draft).
     */
    async create(
        tenantId: string,
        createdBy: string,
        rawInput: CreateVendorBillInput
    ): Promise<VendorBill> {
        const parsed = createVendorBillSchema.parse(rawInput);
        const db = await getDb();

        // 1. Read-only vendor lookup
        const vendorDoc = await db.collection("vendors").findOne(makeIdFilter(parsed.vendor_id, tenantId));
        if (!vendorDoc) {
            throw new NotFoundError("Vendor");
        }

        // Snapshot vendor
        const overrideGstin = parsed.vendor?.gstin !== undefined ? parsed.vendor.gstin.trim() : (vendorDoc.gstin || "");
        const overrideStateCode = parsed.vendor?.state_code || (overrideGstin ? overrideGstin.slice(0, 2) : (vendorDoc.state_code || ""));

        const vendorSnapshot: VendorSnapshot = {
            name: vendorDoc.name || parsed.vendor?.name || "Unknown Vendor",
            gstin: overrideGstin,
            address: parsed.vendor?.address !== undefined ? parsed.vendor.address : (vendorDoc.address || ""),
            phone: parsed.vendor?.phone !== undefined ? parsed.vendor.phone : (vendorDoc.phone || ""),
            state_code: overrideStateCode,
        };

        // 2. Read-only PO lookup if linked
        const warnings: string[] = [];
        if (parsed.purchase_order_id) {
            const poDoc = await db.collection("purchase_orders").findOne(makeIdFilter(parsed.purchase_order_id, tenantId));
            if (!poDoc) {
                throw new NotFoundError("Purchase order");
            }
            if (String(poDoc.vendorId) !== String(parsed.vendor_id)) {
                throw new ConflictError("Bill vendor does not match purchase order vendor");
            }

            const alreadyBilled = await this.repo.getBilledSubtotalForPo(parsed.purchase_order_id, tenantId);
            const poSubtotal = Number(poDoc.subtotal || 0);

            // Calculate prospective subtotal
            const calcPreview = this.calculateLinesAndTotals(parsed.items || [], parsed.supply_type || null, parsed.tds);
            if (alreadyBilled + calcPreview.subtotal > poSubtotal) {
                const excess = (alreadyBilled + calcPreview.subtotal) - poSubtotal;
                warnings.push(
                    `Total billed amount (₹${(alreadyBilled + calcPreview.subtotal).toFixed(2)}) exceeds Purchase Order subtotal (₹${poSubtotal.toFixed(2)}) by ₹${excess.toFixed(2)}`
                );
            }
        }

        // 3. Compute calculations
        const calc = this.calculateLinesAndTotals(parsed.items || [], parsed.supply_type || null, parsed.tds);

        // 4. Default dates and FY
        const billDate = parsed.bill_date;
        const dueDate = parsed.due_date || addDaysToKolkataDate(billDate, DEFAULT_CREDIT_DAYS);
        const fy = getFinancialYear(billDate) || getCurrentFinancialYear();

        // 5. Default ITC eligibility (true if GSTIN is present)
        const itcEligible = parsed.itc_eligible !== undefined
            ? parsed.itc_eligible
            : Boolean(overrideGstin && overrideGstin.trim().length > 0);

        // 6. Generate sequential bill number
        const billNumber = await generateSequentialVendorBillNumber(tenantId, billDate);

        // 7. Duplicate prevention key
        const normalizedInvoiceNo = parsed.vendor_invoice_number.trim().toUpperCase();
        const dupKey = normalizedInvoiceNo ? `${parsed.vendor_id}_${normalizedInvoiceNo}` : undefined;

        const newBill: VendorBill = {
            id: randomUUID(),
            userId: tenantId,
            bill_number: billNumber,
            financial_year: fy,
            vendor_id: parsed.vendor_id,
            vendor: vendorSnapshot,
            purchase_order_id: parsed.purchase_order_id || null,
            vendor_invoice_number: parsed.vendor_invoice_number.trim(),
            bill_date: billDate,
            due_date: dueDate,
            supply_type: parsed.supply_type || null,
            place_of_supply_state_code: parsed.place_of_supply_state_code || null,
            reverse_charge: Boolean(parsed.reverse_charge),
            itc_eligible: itcEligible,
            items: calc.items,
            subtotal: calc.subtotal,
            cgst_total: calc.cgst_total,
            sgst_total: calc.sgst_total,
            igst_total: calc.igst_total,
            total_tax: calc.total_tax,
            grand_total: calc.grand_total,
            tds: calc.tds,
            payable_amount: calc.payable_amount,
            paid_total: 0,
            paid_total_paise: 0,
            payable_paise: calc.payablePaise,
            status: "Draft",
            dup_key: dupKey,
            notes: parsed.notes || "",
            created_by: createdBy,
            created_at: new Date(),
            updated_at: new Date(),
        };

        try {
            await this.repo.createBill(newBill);
        } catch (err: any) {
            if (err.code === 11000 || (err.message && err.message.includes("dup key"))) {
                throw new ConflictError(
                    `A bill with invoice number "${parsed.vendor_invoice_number}" already exists for this vendor.`
                );
            }
            throw err;
        }

        const enriched = this.enrichBill(newBill, []);
        if (warnings.length > 0) {
            enriched.warnings = warnings;
        }
        return enriched;
    }

    /**
     * Update an existing bill.
     */
    async update(
        id: string,
        tenantId: string,
        rawInput: UpdateVendorBillInput
    ): Promise<VendorBill> {
        const parsed = updateVendorBillSchema.parse(rawInput);
        const bill = await this.repo.findById(id, tenantId);
        if (!bill) {
            throw new NotFoundError("Vendor bill");
        }

        if (bill.status === "Void") {
            throw new ConflictError("Void bills cannot be edited");
        }

        // Open bill rules: only due_date and notes can be edited
        if (bill.status === "Open") {
            const forbiddenKeys = [
                "vendor_id", "vendor", "purchase_order_id", "vendor_invoice_number",
                "bill_date", "supply_type", "place_of_supply_state_code", "reverse_charge",
                "itc_eligible", "items", "tds"
            ];
            for (const key of forbiddenKeys) {
                if ((parsed as any)[key] !== undefined) {
                    throw new ConflictError(`Cannot edit field "${key}" on an Open bill. Only due_date and notes are editable.`);
                }
            }

            const updates: Partial<VendorBill> = {};
            if (parsed.due_date !== undefined) {
                if (parsed.due_date < bill.bill_date) {
                    throw new ValidationError("Due date cannot be before bill date");
                }
                updates.due_date = parsed.due_date;
            }
            if (parsed.notes !== undefined) {
                updates.notes = parsed.notes;
            }

            const updated = await this.repo.updateBill(id, tenantId, updates);
            if (!updated) throw new NotFoundError("Vendor bill");
            const payments = await this.repo.findPaymentsByBillId(id, tenantId);
            return this.enrichBill(updated, payments);
        }

        // Draft bill rules: full edit
        const db = await getDb();
        const vendorId = parsed.vendor_id || bill.vendor_id;
        const vendorDoc = await db.collection("vendors").findOne(makeIdFilter(vendorId, tenantId));
        if (!vendorDoc) {
            throw new NotFoundError("Vendor");
        }

        const overrideGstin = parsed.vendor?.gstin !== undefined
            ? parsed.vendor.gstin.trim()
            : (bill.vendor.gstin || vendorDoc.gstin || "");
        const overrideStateCode = parsed.vendor?.state_code || (overrideGstin ? overrideGstin.slice(0, 2) : (bill.vendor.state_code || vendorDoc.state_code || ""));

        const vendorSnapshot: VendorSnapshot = {
            name: vendorDoc.name || parsed.vendor?.name || bill.vendor.name,
            gstin: overrideGstin,
            address: parsed.vendor?.address !== undefined ? parsed.vendor.address : (bill.vendor.address || vendorDoc.address || ""),
            phone: parsed.vendor?.phone !== undefined ? parsed.vendor.phone : (bill.vendor.phone || vendorDoc.phone || ""),
            state_code: overrideStateCode,
        };

        const warnings: string[] = [];
        const poId = parsed.purchase_order_id !== undefined ? parsed.purchase_order_id : bill.purchase_order_id;
        if (poId) {
            const poDoc = await db.collection("purchase_orders").findOne(makeIdFilter(poId, tenantId));
            if (!poDoc) {
                throw new NotFoundError("Purchase order");
            }
            if (String(poDoc.vendorId) !== String(vendorId)) {
                throw new ConflictError("Bill vendor does not match purchase order vendor");
            }

            const alreadyBilled = await this.repo.getBilledSubtotalForPo(poId, tenantId, id);
            const poSubtotal = Number(poDoc.subtotal || 0);

            const itemsToCalc = parsed.items !== undefined ? parsed.items : bill.items;
            const supplyToCalc = parsed.supply_type !== undefined ? parsed.supply_type : bill.supply_type;
            const tdsToCalc = parsed.tds !== undefined ? parsed.tds : bill.tds;
            const calcPreview = this.calculateLinesAndTotals(itemsToCalc, supplyToCalc, tdsToCalc);

            if (alreadyBilled + calcPreview.subtotal > poSubtotal) {
                const excess = (alreadyBilled + calcPreview.subtotal) - poSubtotal;
                warnings.push(
                    `Total billed amount (₹${(alreadyBilled + calcPreview.subtotal).toFixed(2)}) exceeds Purchase Order subtotal (₹${poSubtotal.toFixed(2)}) by ₹${excess.toFixed(2)}`
                );
            }
        }

        const items = parsed.items !== undefined ? parsed.items : bill.items;
        const supplyType = parsed.supply_type !== undefined ? parsed.supply_type : bill.supply_type;
        const tds = parsed.tds !== undefined ? parsed.tds : bill.tds;

        const calc = this.calculateLinesAndTotals(items, supplyType, tds);

        const billDate = parsed.bill_date || bill.bill_date;
        const dueDate = parsed.due_date || bill.due_date;
        const fy = getFinancialYear(billDate) || bill.financial_year;

        const invoiceNo = parsed.vendor_invoice_number !== undefined
            ? parsed.vendor_invoice_number.trim()
            : bill.vendor_invoice_number;
        const normalizedInvoiceNo = invoiceNo.trim().toUpperCase();
        const dupKey = normalizedInvoiceNo ? `${vendorId}_${normalizedInvoiceNo}` : undefined;

        const updates: Partial<VendorBill> = {
            vendor_id: vendorId,
            vendor: vendorSnapshot,
            purchase_order_id: poId,
            vendor_invoice_number: invoiceNo,
            bill_date: billDate,
            due_date: dueDate,
            financial_year: fy,
            supply_type: supplyType,
            place_of_supply_state_code: parsed.place_of_supply_state_code !== undefined ? parsed.place_of_supply_state_code : bill.place_of_supply_state_code,
            reverse_charge: parsed.reverse_charge !== undefined ? parsed.reverse_charge : bill.reverse_charge,
            itc_eligible: parsed.itc_eligible !== undefined ? parsed.itc_eligible : bill.itc_eligible,
            items: calc.items,
            subtotal: calc.subtotal,
            cgst_total: calc.cgst_total,
            sgst_total: calc.sgst_total,
            igst_total: calc.igst_total,
            total_tax: calc.total_tax,
            grand_total: calc.grand_total,
            tds: calc.tds,
            payable_amount: calc.payable_amount,
            payable_paise: calc.payablePaise,
            dup_key: dupKey,
            notes: parsed.notes !== undefined ? parsed.notes : bill.notes,
        };

        try {
            const updated = await this.repo.updateBill(id, tenantId, updates);
            if (!updated) throw new NotFoundError("Vendor bill");
            const enriched = this.enrichBill(updated, []);
            if (warnings.length > 0) enriched.warnings = warnings;
            return enriched;
        } catch (err: any) {
            if (err.code === 11000 || (err.message && err.message.includes("dup key"))) {
                throw new ConflictError(
                    `A bill with invoice number "${invoiceNo}" already exists for this vendor.`
                );
            }
            throw err;
        }
    }

    /**
     * Update bill status (Draft → Open, or Open → Void).
     */
    async updateStatus(
        id: string,
        tenantId: string,
        newStatus: "Open" | "Void",
        voidReason?: string
    ): Promise<VendorBill> {
        billStatusTransitionSchema.parse({ status: newStatus, void_reason: voidReason });

        const bill = await this.repo.findById(id, tenantId);
        if (!bill) {
            throw new NotFoundError("Vendor bill");
        }

        if (bill.status === "Void") {
            throw new ConflictError("Void is a terminal status and cannot be changed");
        }

        const todayIST = getTodayIST();

        if (newStatus === "Open") {
            if (bill.status === "Open") return this.enrichBill(bill);

            // Validation rules for Draft → Open
            if (!bill.vendor || !bill.vendor.name) {
                throw new ValidationError("Vendor is required to open bill");
            }
            if (!bill.vendor_invoice_number || !bill.vendor_invoice_number.trim()) {
                throw new ValidationError("Vendor invoice number is required to open bill");
            }
            if (bill.bill_date > todayIST) {
                throw new ValidationError("Bill date cannot be in the future");
            }
            if (bill.due_date < bill.bill_date) {
                throw new ValidationError("Due date cannot be before bill date");
            }
            if (!bill.items || bill.items.length === 0) {
                throw new ValidationError("At least one item is required to open bill");
            }
            if (!bill.supply_type) {
                throw new ValidationError("Supply type (intra/inter) must be chosen before opening bill");
            }
            if (bill.grand_total <= 0) {
                throw new ValidationError("Grand total must be greater than zero to open bill");
            }
            if (bill.payable_amount < 0) {
                throw new ValidationError("Payable amount cannot be negative");
            }

            const updated = await this.repo.updateBill(id, tenantId, {
                status: "Open",
                opened_at: new Date(),
            });
            if (!updated) throw new NotFoundError("Vendor bill");
            return this.enrichBill(updated, []);
        }

        if (newStatus === "Void") {
            const payments = await this.repo.findPaymentsByBillId(id, tenantId);
            const nonVoided = payments.filter((p) => !p.voided);
            if (nonVoided.length > 0) {
                throw new ConflictError(
                    `Cannot void bill with ${nonVoided.length} active payment(s). Void all payments first.`
                );
            }

            if (!voidReason || !voidReason.trim()) {
                throw new ValidationError("Void reason is required");
            }

            // Unset dup_key on Void so invoice # can be re-used if needed
            const updated = await this.repo.updateBill(
                id,
                tenantId,
                {
                    status: "Void",
                    voided_at: new Date(),
                    void_reason: voidReason.trim(),
                },
                { dup_key: "" }
            );
            if (!updated) throw new NotFoundError("Vendor bill");
            return this.enrichBill(updated, payments);
        }

        throw new ValidationError("Invalid status transition");
    }

    /**
     * Duplicate a bill to a new Draft.
     */
    async duplicate(id: string, tenantId: string, createdBy: string): Promise<VendorBill> {
        const bill = await this.repo.findById(id, tenantId);
        if (!bill) {
            throw new NotFoundError("Vendor bill");
        }

        const todayIST = getTodayIST();
        const dueDate = addDaysToKolkataDate(todayIST, DEFAULT_CREDIT_DAYS);
        const fy = getFinancialYear(todayIST) || getCurrentFinancialYear();
        const billNumber = await generateSequentialVendorBillNumber(tenantId, todayIST);

        const newBill: VendorBill = {
            id: randomUUID(),
            userId: tenantId,
            bill_number: billNumber,
            financial_year: fy,
            vendor_id: bill.vendor_id,
            vendor: { ...bill.vendor },
            purchase_order_id: bill.purchase_order_id,
            vendor_invoice_number: "", // Vendor invoice number cleared per specification
            bill_date: todayIST,
            due_date: dueDate,
            supply_type: bill.supply_type,
            place_of_supply_state_code: bill.place_of_supply_state_code,
            reverse_charge: bill.reverse_charge,
            itc_eligible: bill.itc_eligible,
            items: bill.items.map((i) => ({ ...i })),
            subtotal: bill.subtotal,
            cgst_total: bill.cgst_total,
            sgst_total: bill.sgst_total,
            igst_total: bill.igst_total,
            total_tax: bill.total_tax,
            grand_total: bill.grand_total,
            tds: bill.tds ? { ...bill.tds } : null,
            payable_amount: bill.payable_amount,
            paid_total: 0,
            paid_total_paise: 0,
            payable_paise: bill.payable_paise,
            status: "Draft",
            notes: bill.notes,
            created_by: createdBy,
            created_at: new Date(),
            updated_at: new Date(),
        };

        await this.repo.createBill(newBill);
        return this.enrichBill(newBill, []);
    }

    /**
     * Delete Draft bill.
     */
    async deleteDraft(id: string, tenantId: string): Promise<boolean> {
        const bill = await this.repo.findById(id, tenantId);
        if (!bill) {
            throw new NotFoundError("Vendor bill");
        }
        if (bill.status !== "Draft") {
            throw new ConflictError(`Only Draft bills can be deleted (current status: ${bill.status})`);
        }
        return this.repo.deleteDraftBill(id, tenantId);
    }

    /**
     * Record a payment against an Open bill with atomic overpay guard.
     */
    async recordPayment(
        billId: string,
        tenantId: string,
        recordedBy: string,
        rawInput: RecordBillPaymentInput
    ): Promise<{ payment: VendorBillPayment; updatedBill: VendorBill }> {
        const parsed = recordBillPaymentSchema.parse(rawInput);
        const bill = await this.repo.findById(billId, tenantId);
        if (!bill) {
            throw new NotFoundError("Vendor bill");
        }

        if (bill.status !== "Open") {
            throw new ConflictError(`Payments can only be recorded on Open bills (current status: ${bill.status})`);
        }

        const todayIST = getTodayIST();
        if (parsed.payment_date > todayIST) {
            throw new ValidationError("Payment date cannot be in the future");
        }
        if (parsed.payment_date < bill.bill_date) {
            throw new ValidationError("Payment date cannot be before bill date");
        }

        const amountPaise = Math.round(parsed.amount * 100);
        const fy = getFinancialYear(parsed.payment_date) || getCurrentFinancialYear();

        const payment: VendorBillPayment = {
            id: randomUUID(),
            userId: tenantId,
            vendor_bill_id: billId,
            vendor_id: bill.vendor_id,
            amount: Math.round(parsed.amount * 100) / 100,
            amount_paise: amountPaise,
            payment_date: parsed.payment_date,
            payment_mode: parsed.payment_mode,
            reference: parsed.reference || "",
            notes: parsed.notes || "",
            financial_year: fy,
            recorded_by: recordedBy,
            created_at: new Date(),
            voided: false,
        };

        const result = await this.repo.createPaymentWithAtomicGuard(billId, tenantId, payment);
        const payments = await this.repo.findPaymentsByBillId(billId, tenantId);

        return {
            payment: result.payment,
            updatedBill: this.enrichBill(result.updatedBill, payments),
        };
    }

    /**
     * Void a recorded payment with atomic decrement of paid_total.
     */
    async voidPayment(
        billId: string,
        paymentId: string,
        tenantId: string,
        userName: string,
        voidReason: string
    ): Promise<{ payment: VendorBillPayment; updatedBill: VendorBill }> {
        voidBillPaymentSchema.parse({ void_reason: voidReason });

        const result = await this.repo.voidPaymentWithAtomicGuard(
            billId,
            paymentId,
            tenantId,
            userName,
            voidReason.trim()
        );
        const payments = await this.repo.findPaymentsByBillId(billId, tenantId);

        return {
            payment: result.payment,
            updatedBill: this.enrichBill(result.updatedBill, payments),
        };
    }

    /**
     * Find a single bill by ID with payments and derived fields.
     */
    async findById(id: string, tenantId: string): Promise<{ bill: VendorBill; payments: VendorBillPayment[] } | null> {
        const bill = await this.repo.findById(id, tenantId);
        if (!bill) return null;
        const payments = await this.repo.findPaymentsByBillId(id, tenantId);
        return {
            bill: this.enrichBill(bill, payments),
            payments,
        };
    }

    /**
     * Find all bills with optional filtering and summary.
     */
    async findAll(
        tenantId: string,
        filter?: { status?: string; search?: string; vendor_id?: string; from_date?: string; to_date?: string }
    ): Promise<VendorBill[]> {
        const bills = await this.repo.findAll(tenantId, filter);
        const todayIST = getTodayIST();

        return bills.map((b) => {
            const payable = b.payable_amount;
            const paid = b.paid_total;
            const balance = Math.max(0, Math.round((payable - paid) * 100) / 100);

            let paymentStatus: PaymentStatus = "Unpaid";
            if (balance <= 0 && payable > 0) {
                paymentStatus = "Paid";
            } else if (paid > 0) {
                paymentStatus = "Partially Paid";
            } else if (payable === 0) {
                paymentStatus = "Paid";
            }

            const isOverdue = b.status === "Open" && balance > 0 && b.due_date < todayIST;

            return {
                ...b,
                balance,
                payment_status: paymentStatus,
                overdue: isOverdue,
            };
        });
    }

    /**
     * Get list summary (KPI cards).
     */
    async getSummary(tenantId: string): Promise<VendorBillListSummary> {
        const todayIST = getTodayIST();
        return this.repo.getSummary(tenantId, todayIST);
    }

    /**
     * Read-only PO summary for prefilling bill.
     */
    async getPoSummary(poId: string, tenantId: string): Promise<PoSummaryResponse> {
        const db = await getDb();
        const poDoc = await db.collection("purchase_orders").findOne(makeIdFilter(poId, tenantId));
        if (!poDoc) {
            throw new NotFoundError("Purchase order");
        }

        const vendorDoc = await db.collection("vendors").findOne(makeIdFilter(String(poDoc.vendorId), tenantId));

        const vendorSnapshot: VendorSnapshot = {
            name: vendorDoc?.name || poDoc.vendorName || "Unknown Vendor",
            gstin: vendorDoc?.gstin || "",
            address: vendorDoc?.address || "",
            phone: vendorDoc?.phone || "",
            state_code: vendorDoc?.state_code || (vendorDoc?.gstin ? vendorDoc.gstin.slice(0, 2) : ""),
        };

        const subtotal = Number(poDoc.subtotal || 0);
        const taxAmount = Number(poDoc.taxAmount || 0);
        const totalAmount = Number(poDoc.totalAmount || 0);

        const suggestedGstRate = subtotal > 0
            ? Math.round((taxAmount / subtotal) * 100 * 100) / 100
            : 0;

        const rawItems = (poDoc.items as Record<string, unknown>[]) || [];
        const items = rawItems.map((item) => ({
            description: String(item.materialName || item.description || "Material"),
            hsn_sac: String(item.hsn_sac || ""),
            qty: Number(item.quantity || 1),
            unit: String(item.unit || "unit"),
            rate: Number(item.unitPrice || 0),
            discount: 0,
            gst_rate: suggestedGstRate,
        }));

        const alreadyBilled = await this.repo.getBilledSubtotalForPo(poId, tenantId);
        const remaining = Math.max(0, Math.round((subtotal - alreadyBilled) * 100) / 100);

        return {
            purchase_order_id: poId,
            po_number: String(poDoc.poNumber || poDoc.po_number || poId),
            vendor_id: String(poDoc.vendorId),
            vendor: vendorSnapshot,
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            already_billed_subtotal: Math.round(alreadyBilled * 100) / 100,
            remaining,
            suggested_gst_rate: suggestedGstRate,
            items,
        };
    }
}
