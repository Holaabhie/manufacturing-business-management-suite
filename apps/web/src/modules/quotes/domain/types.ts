/**
 * Quotations / Estimates Domain — Types
 */

export type QuoteStatus = "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";

export interface QuoteItem {
    item_id?: string;
    description: string;
    hsn_sac: string;
    qty: number;
    unit: string;
    rate: number;
    discount: number;
    gst_rate: number;
    cgst: number;
    sgst: number;
    igst: number;
    line_total: number;
}

export interface QuoteCustomer {
    id?: string | null;
    name: string;
    address?: string;
    gstin?: string;
    phone?: string;
    email?: string;
}

export interface ConvertedLine {
    line_index: number;
    order_id?: string | null;
    converted_at?: Date | string;
}

export interface Quotation {
    id: string;
    quotation_number: string;
    quotation_date: string;
    valid_until: string;
    customer: QuoteCustomer;
    // Normalized client fields matching Bills pattern for 100% interoperability
    clientId: string | null;
    clientName: string;
    clientAddress: string;
    clientGSTIN: string;
    clientPhone: string;
    clientEmail: string;
    items: QuoteItem[];
    subtotal: number;
    total_discount: number;
    total_tax: number;
    grand_total: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    is_igst: boolean;
    terms: string;
    notes: string;
    status: QuoteStatus;
    converted_order_id: string | null;
    converted_lines: ConvertedLine[];
    created_by: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateQuoteDTO {
    quotation_number?: string;
    quotation_date: string;
    valid_until: string;
    customer?: QuoteCustomer;
    clientId?: string | null;
    clientName?: string;
    clientAddress?: string;
    clientGSTIN?: string;
    clientPhone?: string;
    clientEmail?: string;
    items: QuoteItem[];
    subtotal: number;
    total_discount?: number;
    total_tax: number;
    grand_total: number;
    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    is_igst?: boolean;
    terms?: string;
    notes?: string;
    status?: QuoteStatus;
    converted_order_id?: string | null;
    converted_lines?: ConvertedLine[];
}

export interface UpdateQuoteDTO {
    quotation_date?: string;
    valid_until?: string;
    customer?: QuoteCustomer;
    clientId?: string | null;
    clientName?: string;
    clientAddress?: string;
    clientGSTIN?: string;
    clientPhone?: string;
    clientEmail?: string;
    items?: QuoteItem[];
    subtotal?: number;
    total_discount?: number;
    total_tax?: number;
    grand_total?: number;
    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    is_igst?: boolean;
    terms?: string;
    notes?: string;
    status?: QuoteStatus;
    converted_order_id?: string | null;
    converted_lines?: ConvertedLine[];
}

export interface IQuoteRepository {
    findById(id: string, userId: string): Promise<Quotation | null>;
    findAll(userId: string): Promise<Quotation[]>;
    findByNumber(userId: string, quotationNumber: string): Promise<Quotation | null>;
    create(userId: string, createdBy: string, data: CreateQuoteDTO): Promise<Quotation>;
    update(id: string, userId: string, data: UpdateQuoteDTO): Promise<Quotation | null>;
    delete(id: string, userId: string): Promise<boolean>;
    claimLine(quoteId: string, ownerId: string, lineIndex: number): Promise<Quotation | null>;
    attachOrder(quoteId: string, ownerId: string, lineIndex: number, orderId: string): Promise<{ quote: Quotation; statusChangedToAccepted: boolean } | null>;
    releaseClaim(quoteId: string, ownerId: string, lineIndex: number): Promise<boolean>;
}
