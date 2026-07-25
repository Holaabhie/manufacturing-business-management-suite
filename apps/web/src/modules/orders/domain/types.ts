/**
 * Orders Domain — Types
 */

export type OrderStatus = "pending" | "processing" | "in_progress" | "completed" | "cancelled" | "Draft" | "Confirmed" | "In Progress" | "Completed" | "Cancelled" | "On Hold";
export type PaymentStatus = "pending" | "partial" | "paid" | "Unpaid" | "Partial" | "Paid" | "Overdue" | "Partially Overdue" | "Overpaid" | "Refunded";

export interface OrderItem {
    item_id: string; // Ref: Item or Inventory
    item_name: string;
    description?: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;

    discount_type?: 'Percentage' | 'Fixed';
    discount_value: number;
    discount_amount: number;

    taxable_amount: number;
    cgst_rate: number;
    cgst_amount: number;
    sgst_rate: number;
    sgst_amount: number;
    igst_rate: number;
    igst_amount: number;
    cess_rate: number;
    cess_amount: number;

    total_amount: number;
}

/** Legacy inventory deduction item used in the production order form */
export interface LegacyDeductionItem {
    inventory_id: string;
    quantity_deducted: number;
}

/** Material selected during order creation (Step 3 — Materials Required) */
export interface OrderMaterial {
    inventoryItemId: string;
    itemName: string;
    quantityRequired: number;
    unit: string;
}

export interface OrderClientInfo {
    name: string;
    email?: string;
    address?: string;
}

export interface Order {
    id: string;
    userId: string;
    clientId: string | null;

    orderNumber?: string;
    orderDate?: Date;

    orderItems: OrderItem[];

    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    cessAmount: number;
    totalTax: number;
    shippingCharges: number;
    roundOff: number;

    productName: string; // fallback
    quantity: number;    // fallback
    unit?: string;       // fallback unit (e.g., kg, pcs)
    materialSource?: "own" | "client";
    rate: number;        // fallback
    totalAmount: number; // fallback grand total
    materialCost: number;
    labourCost: number;
    overheadCost: number;
    machineryCost: number;
    totalPaid: number;
    balanceDue: number;
    deliveryDate: string | null;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    client: OrderClientInfo | null;
    materials?: OrderMaterial[];
    estimatedMaterialCost?: number;
    estimatedGrossProfit?: number;
    estimatedMargin?: number;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    notes?: string;
    paymentTerms?: string;
    creditDays?: number;
    gstApplicable?: boolean;
    gstPercent?: number;
    createdAt: Date;
    updatedAt: Date;
    processedAt?: Date | null;
    completedAt?: Date | null;
    /** Dedicated production status — decoupled from order.status */
    productionStatus?: string;
    /** When true, an Admin force-completed production via UI — production-sync will not overwrite */
    productionStatusManualOverride?: boolean;
}

export interface CreateOrderDTO {
    order_number?: string;
    client_id?: string;
    order_date?: string;

    order_items?: (OrderItem | LegacyDeductionItem)[];

    subtotal?: number;
    discount_type?: 'Percentage' | 'Fixed';
    discount_value?: number;
    discount_amount?: number;
    taxable_amount?: number;

    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    cess_amount?: number;
    total_tax?: number;

    shipping_charges?: number;
    round_off?: number;
    grand_total?: number;

    delivery_date?: string | null;
    order_status?: OrderStatus;

    // Legacy fallback bindings
    product_name?: string;
    quantity?: number;
    unit?: string;
    material_source?: "own" | "client";
    rate?: number;
    total_amount?: number;
    material_cost?: number;
    labour_cost?: number;
    overhead_cost?: number;
    machinery_cost?: number;
    status?: string;
    payment_status?: string;
    materials?: OrderMaterial[];
    estimated_material_cost?: number;
    estimated_gross_profit?: number;
    estimated_margin?: number;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    notes?: string;
}

export interface UpdateOrderDTO extends Partial<CreateOrderDTO> { }

export interface IOrderRepository {
    findById(id: string, userId: string): Promise<Order | null>;
    findAll(userId: string, filters?: { clientId?: string }): Promise<Order[]>;
    create(userId: string, data: CreateOrderDTO): Promise<Order>;
    update(id: string, userId: string, data: UpdateOrderDTO): Promise<Order | null>;
    updateStatus(id: string, userId: string, status: string): Promise<Order | null>;
    delete(id: string, userId: string): Promise<boolean>;
    deductInventory(userId: string, orderId: string, items: LegacyDeductionItem[]): Promise<void>;
}

