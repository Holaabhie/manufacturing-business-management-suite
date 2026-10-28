"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IOSCard, IOSBadge } from "@/components/ui/ios";
import { TableEmptyState } from "@/components/ui/TableEmptyState";
import { TablePagination } from "@/components/ui/TablePagination";
import {
  MoreVertical,
  Edit2,
  Trash2,
  IndianRupee,
  Download,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/hooks/useFormatters";
import { cn } from "@/lib/utils";
import type { OrderItem, MonthGroupedOrders } from "./types";
import {
  deriveOrderStatusFromOrder,
  getStatusBadgeColor,
  getStatusDotColor,
  getPaymentBadgeColor,
} from "./order-utils";

interface OrdersTableProps {
  orders: OrderItem[];
  monthGroupedOrders: MonthGroupedOrders[];
  ordersLoading: boolean;
  searchQuery: string;
  isStaff: boolean;
  isAdmin: boolean;
  canRecordPayment: boolean;
  updatingOrderId: string | null;
  onAddNewOrder: () => void;
  onEditOrder: (order: OrderItem) => void;
  onRecordPayment: (order: OrderItem) => void;
  onDeleteOrder: (orderId: string) => void;
  onDownloadInvoice: (order: OrderItem) => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function OrdersTable({
  orders,
  monthGroupedOrders,
  ordersLoading,
  searchQuery,
  isStaff,
  isAdmin,
  canRecordPayment,
  updatingOrderId,
  onAddNewOrder,
  onEditOrder,
  onRecordPayment,
  onDeleteOrder,
  onDownloadInvoice,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: OrdersTableProps) {
  const t = useTranslations("orders");
  const { formatINR } = useFormatters();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const getStatusLabel = (status: string): string => {
    if (status === "completed") return t("statuses.completed");
    if (status === "processing") return t("statuses.inProduction");
    if (status === "awaiting_payment") return t("statuses.awaitingPayment");
    if (status === "active") return t("statuses.active");
    if (status === "cancelled") return t("statuses.cancelled");
    if (status === "on_hold") return t("statuses.onHold");
    return t("statuses.pending");
  };

  return (
    <div className="space-y-4">
      <IOSCard
        variant="elevated"
        padding="none"
        className="hidden md:block overflow-hidden glass-premium !rounded-[20px]"
      >
        <div ref={tableContainerRef} className="max-h-[calc(100vh-320px)] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="glass-table-header hover:bg-transparent border-b border-white/[0.07] dark:border-white/[0.07] sticky top-0 z-10 bg-white/90 dark:bg-[#0F1117]/90 backdrop-blur-sm">
                <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide pl-5">
                  {t("table.order")}
                </TableHead>
                {!isStaff && (
                  <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                    {t("table.financials")}
                  </TableHead>
                )}
                <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                  {t("table.timelineStatus")}
                </TableHead>
                <TableHead className="w-[120px] py-3 pr-5 text-right font-semibold text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                  {t("table.action")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-5">
                      <div className="h-16 w-full rounded-[10px] bg-[var(--muted)] shimmer" />
                    </TableCell>
                    <TableCell>
                      <div className="h-16 w-full rounded-[10px] bg-[var(--muted)] shimmer" />
                    </TableCell>
                    <TableCell>
                      <div className="h-16 w-full rounded-[10px] bg-[var(--muted)] shimmer" />
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="h-10 w-10 rounded-full bg-[var(--muted)] shimmer ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isStaff ? 3 : 4} className="text-center">
                    <TableEmptyState
                      variant={searchQuery ? "no-results" : "no-data"}
                      title={searchQuery ? t("empty.noSearchMatch") : t("empty.noActive")}
                      subtitle={searchQuery ? t("empty.adjustSearch") : t("empty.createFirst")}
                      action={!searchQuery ? { label: t("empty.newOrderBtn"), onClick: onAddNewOrder } : undefined}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                monthGroupedOrders.map((group) => (
                  <React.Fragment key={group.key}>
                    <tr>
                      <td colSpan={isStaff ? 3 : 4} className="px-0 pt-6 pb-2" style={{ background: "transparent", border: "none" }}>
                        <div className="flex items-center justify-between px-5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
                              {group.label}
                            </span>
                            <span className="text-[10px] font-medium text-[var(--muted-foreground)]/60 tabular-nums">
                              {group.orderCount} {group.orderCount === 1 ? t("table.orderSingle") : t("table.ordersPlural")}
                            </span>
                          </div>
                          {!isStaff && (
                            <span className="text-[11px] font-semibold text-[var(--primary)] tabular-nums">
                              {formatINR(group.totalValue)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 h-px bg-[var(--border)]" />
                      </td>
                    </tr>
                    {group.orders.map((order, index) => {
                      const derived = deriveOrderStatusFromOrder(order);
                      return (
                        <motion.tr
                          key={order.id ?? index}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="group glass-table-row hover:bg-[var(--muted)] border-b border-[var(--border)] transition-colors"
                        >
                          <TableCell className="pl-5 py-4">
                            <div className="flex flex-col">
                              <span className="text-[17px] font-bold text-[var(--foreground)] leading-[22px]">
                                {order.productName ?? order.product_name ?? "—"}
                              </span>
                              <span className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
                                {t("table.client")}: {order.client?.name ?? order.clients?.name ?? "—"}
                              </span>
                              <div className="flex items-center gap-2 mt-1.5">
                                <IOSBadge color="gray" variant="tinted" size="small">
                                  {order.quantity ?? 0} {order.unit ?? "kg"}
                                </IOSBadge>
                                <span className="text-[11px] text-[var(--muted-foreground)] font-mono uppercase">
                                  {(order.id ?? "").slice(0, 8)}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          {!isStaff && (
                            <TableCell className="py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-[20px] font-bold text-[var(--primary)]">
                                  {formatINR(Number(order.totalAmount ?? order.total_amount ?? 0))}
                                </span>
                                {(order.totalPaid ?? 0) > 0 && (
                                  <span className="text-[13px] text-[var(--erp-success)] font-semibold">
                                    {t("table.paid")}: {formatINR(Number(order.totalPaid ?? 0))}
                                  </span>
                                )}
                                {(order.paymentStatus !== "Paid" && order.paymentStatus !== "paid") && (
                                  <span className="text-[13px] text-[var(--erp-warning)] font-semibold">
                                    {t("table.due")}: {formatINR(Number((order.totalAmount ?? order.total_amount ?? 0) - (order.totalPaid || 0)))}
                                  </span>
                                )}
                                <IOSBadge color={getPaymentBadgeColor(order.paymentStatus)} variant="tinted" size="small">
                                  {order.paymentStatus || "Unpaid"}
                                </IOSBadge>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5">
                                {updatingOrderId === order.id ? (
                                  <Loader2 className="h-[14px] w-[14px] animate-spin text-[var(--primary)]" />
                                ) : (
                                  <div
                                    className={cn(
                                      "h-[8px] w-[8px] rounded-full",
                                      getStatusDotColor(derived)
                                    )}
                                  />
                                )}
                                <IOSBadge color={getStatusBadgeColor(derived)} variant="tinted" size="small">
                                  {getStatusLabel(derived)}
                                </IOSBadge>
                              </div>
                              {order.deliveryDate && (
                                <span className="text-[11px] bg-[var(--muted)] w-fit px-2 py-0.5 rounded-[6px] font-medium text-[var(--muted-foreground)] mt-1.5 ml-1 block">
                                  {t("table.due")}: {new Date(order.deliveryDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="pr-5 text-right py-4">
                            <div className="flex items-center justify-end gap-1">
                              {!isStaff && (
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
                                  onClick={() => onDownloadInvoice(order)}
                                >
                                  <Download className="h-4 w-4" />
                                </motion.button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center hover:bg-[var(--muted)] transition-colors cursor-pointer"
                                  >
                                    <MoreVertical className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                                  </motion.button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 rounded-[12px]">
                                  {!isStaff && (
                                    <DropdownMenuItem onClick={() => onEditOrder(order)} className="rounded-[8px]">
                                      <Edit2 className="mr-2 h-4 w-4" /> {t("table.editOrder")}
                                    </DropdownMenuItem>
                                  )}
                                  {canRecordPayment && (
                                    <DropdownMenuItem onClick={() => onRecordPayment(order)} className="rounded-[8px]">
                                      <IndianRupee className="mr-2 h-4 w-4 text-[var(--erp-success)]" /> {t("table.recordPayment")}
                                    </DropdownMenuItem>
                                  )}
                                  {isAdmin && (
                                    <DropdownMenuItem className="text-[var(--destructive)] rounded-[8px]" onClick={() => onDeleteOrder(order.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" /> {t("table.deleteOrder")}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </IOSCard>

      {/* Pagination Footer */}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
