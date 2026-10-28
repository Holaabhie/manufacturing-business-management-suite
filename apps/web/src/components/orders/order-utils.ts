import { deriveOrderStatusFromOrder } from "@/lib/deriveOrderStatus";
import type { OrderItem, MonthGroupedOrders, OrderStats } from "./types";

export { deriveOrderStatusFromOrder };

export function getStatusBadgeColor(
  status: string
): "green" | "orange" | "gray" | "blue" | "red" | "purple" {
  if (status === "completed") return "green";
  if (status === "processing" || status === "awaiting_payment") return "orange";
  if (status === "active") return "blue";
  if (status === "cancelled") return "red";
  if (status === "on_hold") return "purple";
  return "gray";
}

export function getStatusDotColor(status: string): string {
  if (status === "completed") return "bg-[var(--erp-success)]";
  if (status === "processing") return "bg-[var(--erp-warning)] animate-pulse";
  if (status === "awaiting_payment") return "bg-amber-500 animate-pulse";
  if (status === "active") return "bg-[var(--primary)]";
  if (status === "cancelled") return "bg-red-500";
  if (status === "on_hold") return "bg-purple-500";
  return "bg-[var(--muted-foreground)]";
}

export function getMobileBorderColor(status: string): string {
  if (status === "active") return "#2563EB";
  if (status === "pending" || status === "processing" || status === "awaiting_payment")
    return "#F59E0B";
  if (status === "completed") return "#22C55E";
  if (status === "cancelled") return "#EF4444";
  if (status === "on_hold") return "#A855F7";
  return "#94A3B8";
}

export function getMobileBadgeClasses(status: string): string {
  if (status === "active") return "bg-blue-500/15 text-blue-500 dark:text-blue-400";
  if (status === "pending" || status === "processing")
    return "bg-amber-500/15 text-amber-500 dark:text-amber-400";
  if (status === "awaiting_payment")
    return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  if (status === "completed") return "bg-green-500/15 text-green-500 dark:text-green-400";
  if (status === "cancelled") return "bg-red-500/15 text-red-500 dark:text-red-400";
  if (status === "on_hold") return "bg-purple-500/15 text-purple-500 dark:text-purple-400";
  return "bg-gray-500/15 text-gray-500 dark:text-gray-400";
}

export function computeOrderStats(orders: OrderItem[]): OrderStats {
  if (!Array.isArray(orders)) {
    return {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      revenue: 0,
      pendingPayment: 0,
    };
  }
  return {
    total: orders.length,
    pending: orders.filter((o) => deriveOrderStatusFromOrder(o) === "pending").length,
    processing: orders.filter((o) => deriveOrderStatusFromOrder(o) === "processing").length,
    completed: orders.filter((o) => deriveOrderStatusFromOrder(o) === "completed").length,
    revenue: orders.reduce((acc, o) => acc + Number(o?.totalAmount || o?.total_amount || 0), 0),
    pendingPayment: orders.filter(
      (o) => o?.paymentStatus !== "paid" && o?.paymentStatus !== "Paid"
    ).length,
  };
}

export function groupOrdersByMonth(
  orders: OrderItem[],
  dateLocale: string
): MonthGroupedOrders[] {
  const sorted = [...orders].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  );

  const groups = new Map<string, MonthGroupedOrders>();

  for (const order of sorted) {
    const d = new Date(order.createdAt || Date.now());
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: d
          .toLocaleDateString(dateLocale, { month: "long", year: "numeric" })
          .toUpperCase(),
        orders: [],
        orderCount: 0,
        totalValue: 0,
      });
    }

    const group = groups.get(key)!;
    group.orders.push(order);
    group.orderCount += 1;
    group.totalValue += Number(order.totalAmount ?? order.total_amount ?? 0);
  }

  return Array.from(groups.values());
}

export function getStatusLabel(status: string): string {
  if (status === "completed") return "Completed";
  if (status === "processing") return "In Production";
  if (status === "awaiting_payment") return "Awaiting Payment";
  if (status === "active") return "Active";
  if (status === "cancelled") return "Cancelled";
  if (status === "on_hold") return "On Hold";
  return "Pending";
}

export function getPaymentBadgeColor(paymentStatus?: string): "green" | "orange" | "gray" {
  const s = (paymentStatus || "").toLowerCase();
  if (s === "paid") return "green";
  if (s === "partial" || s === "partially_paid") return "orange";
  return "gray";
}
