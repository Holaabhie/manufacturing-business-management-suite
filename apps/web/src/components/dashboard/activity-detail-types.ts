/**
 * Activity Detail Popup — Shared Types
 */

export interface ActivityItem {
  id: string;
  type: "order" | "production" | "inventory" | "payment" | "client";
  title: string;
  description: string;
  time: string;
  status: "success" | "warning" | "info" | "pending";
  entityId: string;
  entityType: string;
}

export interface OrderDetail {
  id: string;
  product_name?: string;
  quantity?: number;
  unit?: string;
  status?: string;
  total_amount?: number;
  payment_status?: string;
  due_date?: string;
  createdAt?: string;
  updatedAt?: string;
  clients?: { name?: string; _id?: string };
  client_name?: string;
  materials?: Array<{ name: string; quantity: number; unit: string }>;
  material_cost?: number;
}

export interface PaymentDetail {
  id: string;
  amount?: number;
  payment_method?: string;
  payment_date?: string;
  createdAt?: string;
  clients?: { name?: string };
  client_name?: string;
  order_id?: string;
  order_ref?: string;
  recorded_by?: string;
  outstanding_balance?: number;
}

export interface InventoryDetail {
  id: string;
  name?: string;
  quantity?: number;
  unit?: string;
  min_stock_level?: number;
  category?: string;
  item_type?: string;
  previous_quantity?: number;
  updated_by?: string;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionDetail {
  id: string;
  job_name?: string;
  product_name?: string;
  order_id?: string;
  order_ref?: string;
  machine_name?: string;
  operator_name?: string;
  status?: string;
  target_quantity?: number;
  completed_quantity?: number;
  rejected_quantity?: number;
  unit?: string;
  start_date?: string;
  completed_date?: string;
  createdAt?: string;
}

export type EntityDetail = OrderDetail | PaymentDetail | InventoryDetail | ProductionDetail;
