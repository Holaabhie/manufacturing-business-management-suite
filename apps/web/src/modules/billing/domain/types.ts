/**
 * Billing Domain — Types
 */

export type BillStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface BillItem {
    description: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    gstRate: number;
}

export interface Bill {
    id: string;
    userId: string;
    billNumber: string;
    billDate: string;
    dueDate: string;
    clientId: string | null;
    clientName: string;
    clientAddress: string;
    clientGSTIN: string;
    clientPhone: string;
    clientEmail: string;
    items: BillItem[];
    subtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
    amountInWords: string;
    notes: string;
    terms: string;
    status: BillStatus;
    // Tally Prime sync tracking
    tallySynced?: boolean;
    tallyVoucherNumber?: string;
    tallySyncedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBillDTO {
    billNumber: string;
    billDate: string;
    dueDate: string;
    client_id?: string;
    clientName: string;
    clientAddress?: string;
    clientGSTIN?: string;
    clientPhone?: string;
    clientEmail?: string;
    items?: BillItem[];
    subtotal?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    totalAmount?: number;
    amountInWords?: string;
    notes?: string;
    terms?: string;
    status?: BillStatus;
}

export interface UpdateBillDTO {
    billDate?: string;
    dueDate?: string;
    clientName?: string;
    clientAddress?: string;
    items?: BillItem[];
    subtotal?: number;
    totalAmount?: number;
    notes?: string;
    terms?: string;
    status?: BillStatus;
    // Tally Prime sync
    tallySynced?: boolean;
    tallyVoucherNumber?: string;
    tallySyncedAt?: string;
}

export interface IBillingRepository {
    findById(id: string, userId: string): Promise<Bill | null>;
    findAll(userId: string): Promise<Bill[]>;
    findByBillNumber(userId: string, billNumber: string): Promise<Bill | null>;
    countByBillNumberPrefix(userId: string, prefix: string): Promise<number>;
    create(userId: string, data: CreateBillDTO): Promise<Bill>;
    update(id: string, userId: string, data: UpdateBillDTO): Promise<Bill | null>;
    delete(id: string, userId: string): Promise<boolean>;
}
