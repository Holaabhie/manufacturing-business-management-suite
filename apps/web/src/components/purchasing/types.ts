import { Clock, Truck, PackageCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
}

export interface PurchaseOrderItem {
  inventoryItemId: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  items: PurchaseOrderItem[];
  status: "Pending" | "Ordered" | "Received";
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  orderedAt?: string;
  receivedAt?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  purchase_cost_per_unit: number;
  purchaseCostPerUnit?: number;
}

export type TabKey = "orders" | "vendors";

export interface PurchasingStats {
  totalSpent: number;
  pendingCount: number;
  orderedCount: number;
  receivedCount: number;
}

export const STATUS_CONFIG: Record<
  PurchaseOrder["status"],
  { color: "orange" | "blue" | "green"; icon: LucideIcon; label: string }
> = {
  Pending: { color: "orange", icon: Clock, label: "Pending" },
  Ordered: { color: "blue", icon: Truck, label: "Ordered" },
  Received: { color: "green", icon: PackageCheck, label: "Received" },
};

export const PAYMENT_STATUS_CONFIG = {
  pending: { color: "orange" as const, label: "Unpaid" },
  partial: { color: "blue" as const, label: "Partial" },
  paid: { color: "green" as const, label: "Paid" },
};

export interface VendorFormData {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
}

export interface VendorFormErrors {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

export interface POItemDraft {
  inventoryItemId: string;
  materialName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}
