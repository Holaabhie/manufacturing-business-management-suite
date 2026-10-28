"use client";

import React, { useRef, useCallback } from "react";
import { Factory, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/hooks/useFormatters";
import { cn } from "@/lib/utils";
import type { OrderItem, MonthGroupedOrders } from "./types";
import {
  deriveOrderStatusFromOrder,
  getMobileBorderColor,
  getMobileBadgeClasses,
} from "./order-utils";

interface OrdersMobileListProps {
  orders: OrderItem[];
  monthGroupedOrders: MonthGroupedOrders[];
  ordersLoading: boolean;
  isStaff: boolean;
  dateLocale: string;
  onSelectOrder: (order: OrderItem) => void;
  onLongPressOrder: (order: OrderItem) => void;
  isActionSheetOpen: boolean;
}

export function OrdersMobileList({
  orders,
  monthGroupedOrders,
  ordersLoading,
  isStaff,
  dateLocale,
  onSelectOrder,
  onLongPressOrder,
  isActionSheetOpen,
}: OrdersMobileListProps) {
  const t = useTranslations("orders");
  const { formatINR } = useFormatters();
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(
    (order: OrderItem) => {
      longPressTimerRef.current = setTimeout(() => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50);
        }
        onLongPressOrder(order);
      }, 500);
    },
    [onLongPressOrder]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

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
    <div style={{ padding: "0 2px" }} className="block md:hidden">
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {ordersLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 dark:bg-[#1C2333] rounded-2xl px-4 py-3 border-l-4 border-gray-300 dark:border-gray-600"
            >
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 shimmer" />
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700 shimmer mt-2" />
              <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700 shimmer mt-2" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <div style={{ padding: "64px 0", textAlign: "center" }}>
            <Factory
              style={{
                height: 40,
                width: 40,
                margin: "0 auto 12px",
                color: "#475569",
              }}
            />
            <p
              style={{
                color: "#94a3b8",
                fontSize: 14,
                fontFamily:
                  "-apple-system, 'SF Pro Display', 'Segoe UI', sans-serif",
              }}
            >
              {t("empty.noActive")}
            </p>
          </div>
        ) : (
          monthGroupedOrders.map((group) => (
            <React.Fragment key={group.key}>
              {/* Mobile month header */}
              <div className="flex items-center justify-between px-1 pt-4 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
                    {group.label}
                  </span>
                  <span className="text-[10px] font-medium text-[var(--muted-foreground)]/60 tabular-nums">
                    {group.orderCount}{" "}
                    {group.orderCount === 1
                      ? t("table.orderSingle")
                      : t("table.ordersPlural")}
                  </span>
                </div>
                {!isStaff && (
                  <span className="text-[11px] font-semibold text-[var(--primary)] tabular-nums">
                    {formatINR(group.totalValue)}
                  </span>
                )}
              </div>

              {group.orders.map((order, idx) => {
                const derived = deriveOrderStatusFromOrder(order);
                const borderColor = getMobileBorderColor(derived);
                const badgeClasses = getMobileBadgeClasses(derived);
                const statusLabel = getStatusLabel(derived);
                const paymentRaw = order.paymentStatus;
                const isPaid = paymentRaw === "paid" || paymentRaw === "Paid";
                const clientName = order.client?.name ?? order.clients?.name;
                const productName = order.productName ?? order.product_name;
                const amount = Number(
                  order.totalAmount ?? order.total_amount ?? 0
                );
                const qty = order.quantity;
                const unit = order.unit ?? "kg";
                const createdAt = order.createdAt;

                return (
                  <div
                    key={order.id ?? idx}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (
                        (e.key === "Enter" || e.key === " ") &&
                        !isActionSheetOpen
                      ) {
                        e.preventDefault();
                        onSelectOrder(order);
                      }
                    }}
                    className={cn(
                      "bg-gray-50 dark:bg-[#1C2333] rounded-2xl overflow-hidden",
                      "shadow-[0_2px_12px_rgba(15,23,42,0.06)] active:scale-[0.98]",
                      "transition-transform cursor-pointer select-none",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    )}
                    style={{ borderLeft: `4px solid ${borderColor}` }}
                    onTouchStart={() => handleTouchStart(order)}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    onMouseDown={() => handleTouchStart(order)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onClick={() => {
                      if (!isActionSheetOpen) onSelectOrder(order);
                    }}
                  >
                    <div className="px-4 py-3">
                      {/* Row 1: Product name · status badge */}
                      <div className="flex justify-between items-center min-h-[22px]">
                        <span className="text-gray-900 dark:text-white text-sm font-bold truncate mr-2">
                          {productName || "—"}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap uppercase shrink-0",
                            badgeClasses
                          )}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {/* Row 2: Amount · qty + payment badge */}
                      <div className="flex justify-between items-center mt-1 min-h-[22px]">
                        <span className="text-blue-500 dark:text-blue-400 text-sm font-semibold tabular-nums">
                          {formatINR(amount)}
                        </span>
                        <div className="flex items-center gap-2">
                          {qty != null && (
                            <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                              {qty} {unit}
                            </span>
                          )}
                          {paymentRaw && (
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap uppercase",
                                isPaid
                                  ? "bg-green-500/15 text-green-500 dark:text-green-400"
                                  : "bg-red-500/15 text-red-500 dark:text-red-400"
                              )}
                            >
                              {isPaid ? t("mobile.paid") : t("mobile.unpaid")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Row 3: client · date · chevron */}
                      <div className="flex justify-between items-center mt-1 min-h-[20px]">
                        <span className="text-gray-500 dark:text-gray-400 text-xs truncate mr-2">
                          {clientName || "—"}
                          {createdAt &&
                            ` · ${new Date(createdAt).toLocaleDateString(
                              dateLocale,
                              { day: "numeric", month: "short" }
                            )}`}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}
