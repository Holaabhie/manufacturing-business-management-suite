/**
 * Payments Domain — Types
 */

export interface PaymentClientInfo {
    name: string;
}

export interface PaymentOrderInfo {
    productName: string;
}

export interface Payment {
    id: string;
    userId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    notes: string;
    referenceId: string;
    clientId: string | null;
    orderId: string | null;
    client: PaymentClientInfo | null;
    order: PaymentOrderInfo | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreatePaymentDTO {
    amount: number;
    payment_date?: string | null;
    payment_method?: string;
    notes?: string;
    reference_id?: string;
    client_id?: string | null;
    order_id?: string | null;
}

export interface IPaymentRepository {
    findById(id: string, userId: string): Promise<Payment | null>;
    findAll(userId: string): Promise<Payment[]>;
    create(userId: string, data: CreatePaymentDTO): Promise<Payment>;
    delete(id: string, userId: string): Promise<boolean>;
}
