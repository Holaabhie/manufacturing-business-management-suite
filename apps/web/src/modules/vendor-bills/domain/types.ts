/**
 * Vendor Bills Domain — Types
 * ──────────────────────────────────────────────────────────
 * Vendor Bills (purchase invoices) and vendor disbursements.
 * Completely decoupled from existing purchasing/PO payments.
 */

export type BillStatus = "Draft" | "Open" | "Void";
export type PaymentStatus = "Unpaid" | "Partially Paid" | "Paid";
export type SupplyType = "intra" | "inter";
export type BillPaymentMode = "Cash" | "Bank" | "UPI" | "Cheque" | "Other";

export interface VendorSnapshot {
    name: string;
    gstin?: string;
    address?: string;
    phone?: string;
    state_code?: string;
}

export interface VendorBillItem {
    description: string;
    hsn_sac: string;
    qty: number;
    unit: string;
    rate: number;          // in rupees
    discount: number;      // discount amount in rupees
    gst_rate: number;      // percentage, e.g. 18
    taxable: number;       // computed taxable in rupees (paise / 100)
    cgst: number;          // computed CGST in rupees
    sgst: number;          // computed SGST in rupees
    igst: number;          // computed IGST in rupees
    line_total: number;    // computed line total in rupees
}

export interface TdsDetails {
    section: string;       // e.g. "194C"
    rate: number;          // percentage, e.g. 1 or 2
    base_amount: number;   // taxable subtotal (excluding GST) in rupees
    amount: number;        // computed TDS deduction in rupees
}

export interface VendorBill {
    id: string;
    userId: string;
    bill_number: string;                    // VB-2026-27-0001
    financial_year: string;                 // 2026-27
    vendor_id: string;
    vendor: VendorSnapshot;
    purchase_order_id: string | null;
    vendor_invoice_number: string;          // vendor's original invoice #
    bill_date: string;                      // YYYY-MM-DD
    due_date: string;                       // YYYY-MM-DD
    supply_type: SupplyType | null;         // intra | inter | null until chosen
    place_of_supply_state_code: string | null;
    reverse_charge: boolean;
    itc_eligible: boolean;
    items: VendorBillItem[];
    subtotal: number;                       // sum(taxable) in rupees
    cgst_total: number;
    sgst_total: number;
    igst_total: number;
    total_tax: number;
    grand_total: number;
    tds: TdsDetails | null;
    payable_amount: number;                 // grand_total - (tds?.amount || 0)
    paid_total: number;                     // sum of non-voided payments in rupees
    paid_total_paise: number;               // integer paise counter for atomic operations
    payable_paise: number;                  // integer paise for atomic operations
    status: BillStatus;
    dup_key?: string;                       // sparse unique key: vendor_id_INVOICE#
    notes: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    opened_at?: Date | null;
    voided_at?: Date | null;
    void_reason?: string | null;

    // Derived at read time
    balance?: number;                       // payable_amount - paid_total
    payment_status?: PaymentStatus;
    overdue?: boolean;                      // status === 'Open' && balance > 0 && due_date < today_IST
    warnings?: string[];                    // e.g. PO over-billing warning
}

export interface VendorBillPayment {
    id: string;
    userId: string;
    vendor_bill_id: string;
    vendor_id: string;
    amount: number;                         // in rupees
    amount_paise: number;                   // in paise
    payment_date: string;                   // YYYY-MM-DD
    payment_mode: BillPaymentMode;
    reference: string;
    notes: string;
    financial_year: string;
    recorded_by: string;
    created_at: Date;
    voided: boolean;
    voided_at?: Date | null;
    voided_by?: string | null;
    void_reason?: string | null;
}

export interface CreateVendorBillDTO {
    vendor_id: string;
    vendor?: Partial<VendorSnapshot>;
    purchase_order_id?: string | null;
    vendor_invoice_number: string;
    bill_date: string;
    due_date?: string;
    supply_type?: SupplyType | null;
    place_of_supply_state_code?: string | null;
    reverse_charge?: boolean;
    itc_eligible?: boolean;
    items: Array<{
        description: string;
        hsn_sac?: string;
        qty: number;
        unit?: string;
        rate: number;
        discount?: number;
        gst_rate?: number;
    }>;
    tds?: {
        section: string;
        rate: number;
    } | null;
    notes?: string;
}

export interface UpdateVendorBillDTO {
    vendor_id?: string;
    vendor?: Partial<VendorSnapshot>;
    purchase_order_id?: string | null;
    vendor_invoice_number?: string;
    bill_date?: string;
    due_date?: string;
    supply_type?: SupplyType | null;
    place_of_supply_state_code?: string | null;
    reverse_charge?: boolean;
    itc_eligible?: boolean;
    items?: Array<{
        description: string;
        hsn_sac?: string;
        qty: number;
        unit?: string;
        rate: number;
        discount?: number;
        gst_rate?: number;
    }>;
    tds?: {
        section: string;
        rate: number;
    } | null;
    notes?: string;
}

export interface RecordBillPaymentDTO {
    amount: number;
    payment_date: string;
    payment_mode: BillPaymentMode;
    reference?: string;
    notes?: string;
}

export interface VoidBillPaymentDTO {
    void_reason: string;
}

export interface VendorBillListSummary {
    open_payable: number;      // sum of balance for all Open bills
    overdue: number;           // sum of balance for overdue Open bills
    due_in_7_days: number;     // sum of balance for Open bills due in next 7 days
    draft_count: number;       // total Draft bills
}

export interface PoSummaryResponse {
    purchase_order_id: string;
    po_number: string;
    vendor_id: string;
    vendor: VendorSnapshot;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    already_billed_subtotal: number;
    remaining: number;
    suggested_gst_rate: number;
    items: Array<{
        description: string;
        hsn_sac: string;
        qty: number;
        unit: string;
        rate: number;
        discount: number;
        gst_rate: number;
    }>;
}

export interface IVendorBillRepository {
    createBill(bill: VendorBill): Promise<VendorBill>;
    findById(id: string, userId: string): Promise<VendorBill | null>;
    findAll(userId: string, filter?: { status?: string; search?: string; vendor_id?: string }): Promise<VendorBill[]>;
    updateBill(id: string, userId: string, update: Partial<VendorBill>, unset?: Record<string, "">): Promise<VendorBill | null>;
    deleteDraftBill(id: string, userId: string): Promise<boolean>;
    findPaymentsByBillId(billId: string, userId: string): Promise<VendorBillPayment[]>;
    createPaymentWithAtomicGuard(
        billId: string,
        userId: string,
        payment: VendorBillPayment
    ): Promise<{ payment: VendorBillPayment; updatedBill: VendorBill }>;
    voidPaymentWithAtomicGuard(
        billId: string,
        paymentId: string,
        userId: string,
        userName: string,
        voidReason: string
    ): Promise<{ payment: VendorBillPayment; updatedBill: VendorBill }>;
    getBilledSubtotalForPo(poId: string, userId: string, excludeBillId?: string): Promise<number>;
    getSummary(userId: string, todayIST: string): Promise<VendorBillListSummary>;
}
