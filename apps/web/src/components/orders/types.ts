import type { OrderItem } from "@/lib/hooks/use-orders";

export type { OrderItem };

export type OrderStatus =
  | "all"
  | "pending"
  | "processing"
  | "active"
  | "awaiting_payment"
  | "completed"
  | "cancelled"
  | "on_hold";

export interface MonthGroupedOrders {
  key: string;
  label: string;
  orderCount: number;
  totalValue: number;
  orders: OrderItem[];
}

export interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  revenue: number;
  pendingPayment: number;
}

export interface OrderModalsState {
  paymentOrder: OrderItem | null;
  isPaymentOpen: boolean;
  deleteOrderId: string | null;
  isDeleteOpen: boolean;
  completionOrder: OrderItem | null;
  isCompletionOpen: boolean;
  invoicePreviewOrder: OrderItem | null;
  isInvoicePreviewOpen: boolean;
  longPressedOrder: OrderItem | null;
  isActionSheetOpen: boolean;
  staffSelectedOrder: OrderItem | null;
  isStaffDetailOpen: boolean;
}

export type OrderModalAction =
  | { type: "OPEN_PAYMENT"; order: OrderItem }
  | { type: "CLOSE_PAYMENT" }
  | { type: "OPEN_DELETE"; orderId: string }
  | { type: "CLOSE_DELETE" }
  | { type: "OPEN_COMPLETION"; order: OrderItem }
  | { type: "CLOSE_COMPLETION" }
  | { type: "OPEN_INVOICE_PREVIEW"; order: OrderItem }
  | { type: "CLOSE_INVOICE_PREVIEW" }
  | { type: "OPEN_ACTION_SHEET"; order: OrderItem }
  | { type: "CLOSE_ACTION_SHEET" }
  | { type: "OPEN_STAFF_DETAIL"; order: OrderItem }
  | { type: "CLOSE_STAFF_DETAIL" };

export interface InvoicePreviewItem {
  description: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gstRate?: number;
}

export interface InvoicePreviewCompany {
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  gstin?: string;
  pan?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  upiId?: string;
}

export interface InvoicePreviewClient {
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
  email?: string;
}

export interface InvoicePreviewData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  client?: InvoicePreviewClient;
  items?: InvoicePreviewItem[];
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount?: number;
  totalAmount: number;
  notes?: string;
  terms?: string;
  company?: InvoicePreviewCompany;
}

export interface InvoiceEditData {
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  gstRate?: number;
}
