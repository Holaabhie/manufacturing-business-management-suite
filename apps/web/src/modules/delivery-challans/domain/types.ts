/**
 * Delivery Challan Domain — Types
 */

export type ChallanStatus = "Draft" | "Dispatched" | "Delivered" | "Returned" | "Cancelled";

export type ChallanPurpose = "Sale" | "Job Work" | "Sample" | "Other";

export interface ChallanItem {
    description: string;
    qty: number;
    unit: string;
    remarks?: string;
}

export interface ConsigneeSnapshot {
    name: string;
    address: string;
    phone: string;
    gstin: string;
}

export interface DeliveryChallan {
    id: string;
    userId: string;
    challan_number: string;
    challan_date: string;
    purpose: ChallanPurpose;
    status: ChallanStatus;
    client_id: string | null;
    consignee: ConsigneeSnapshot;
    ship_to_address: string;
    order_id: string | null;
    items: ChallanItem[];
    transporter_name: string;
    vehicle_no: string;
    lr_number: string;
    eway_bill_no: string;
    dispatch_date: string | null;
    expected_delivery_date: string | null;
    delivered_date: string | null;
    notes: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    financial_year: string;
}

export interface CreateDeliveryChallanDTO {
    challan_number?: string;
    challan_date: string;
    purpose?: ChallanPurpose;
    status?: ChallanStatus;
    client_id?: string | null;
    consignee: ConsigneeSnapshot;
    ship_to_address?: string;
    order_id?: string | null;
    items: ChallanItem[];
    transporter_name?: string;
    vehicle_no?: string;
    lr_number?: string;
    eway_bill_no?: string;
    dispatch_date?: string | null;
    expected_delivery_date?: string | null;
    delivered_date?: string | null;
    notes?: string;
}

export interface UpdateDeliveryChallanDTO {
    challan_date?: string;
    purpose?: ChallanPurpose;
    client_id?: string | null;
    consignee?: ConsigneeSnapshot;
    ship_to_address?: string;
    order_id?: string | null;
    items?: ChallanItem[];
    transporter_name?: string;
    vehicle_no?: string;
    lr_number?: string;
    eway_bill_no?: string;
    dispatch_date?: string | null;
    expected_delivery_date?: string | null;
    delivered_date?: string | null;
    notes?: string;
}

export interface IDeliveryChallanRepository {
    findAll(userId: string): Promise<DeliveryChallan[]>;
    findById(id: string, userId: string): Promise<DeliveryChallan | null>;
    findByNumber(userId: string, challanNumber: string): Promise<DeliveryChallan | null>;
    findByOrderId(userId: string, orderId: string): Promise<DeliveryChallan[]>;
    create(
        userId: string,
        createdBy: string,
        data: CreateDeliveryChallanDTO,
        challanNumber: string,
        fy: string
    ): Promise<DeliveryChallan>;
    update(
        id: string,
        userId: string,
        data: Partial<UpdateDeliveryChallanDTO>
    ): Promise<DeliveryChallan | null>;
    updateStatus(
        id: string,
        userId: string,
        status: ChallanStatus,
        extraUpdates?: Record<string, unknown>
    ): Promise<DeliveryChallan | null>;
    delete(id: string, userId: string): Promise<boolean>;
}
