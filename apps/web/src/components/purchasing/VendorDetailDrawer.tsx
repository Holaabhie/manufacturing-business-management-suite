"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Building2,
  IndianRupee,
  ShoppingCart,
  Wallet,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  springModal,
  variantsBackdrop,
} from "@/lib/motion";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { getPaymentStatus } from "@/modules/purchasing/domain/types";

// ─── Types ──────────────────────────────────────────────────────

interface VendorForDrawer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
}

interface POItem {
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface PurchaseOrderForDrawer {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  items: POItem[];
  status: "Pending" | "Ordered" | "Received";
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  orderedAt?: string;
  receivedAt?: string;
  createdAt: string;
}

interface VendorDetailDrawerProps {
  vendor: VendorForDrawer | null;
  orders: PurchaseOrderForDrawer[];
  onClose: () => void;
}

type FilterType = "all" | "Pending" | "Ordered" | "Received";

// ─── Status Config ──────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { dot: string; color: string; bg: string; label: string }> = {
  Pending: { dot: "#F59E0B", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", label: "Pending" },
  Ordered: { dot: "#3B82F6", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", label: "Ordered" },
  Received: { dot: "#10B981", color: "#10B981", bg: "rgba(16,185,129,0.12)", label: "Received" },
};

const PAYMENT_STATUS_CONFIG: Record<string, { dot: string; color: string; bg: string; label: string }> = {
  pending: { dot: "#F59E0B", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", label: "Unpaid" },
  partial: { dot: "#3B82F6", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", label: "Partial" },
  paid: { dot: "#10B981", color: "#10B981", bg: "rgba(16,185,129,0.12)", label: "Paid" },
};

// ─── Component ──────────────────────────────────────────────────

export function VendorDetailDrawer({ vendor, orders, onClose }: VendorDetailDrawerProps) {
  const [portalMounted, setPortalMounted] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  const isOpen = !!vendor;

  // Reset on new vendor
  useEffect(() => {
    if (vendor) {
      setFilter("all");
      setExpandedId(null);
    }
  }, [vendor?.id]);

  // Close on Escape
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleEscape]);

  useBodyScrollLock(isOpen);

  // Vendor's POs
  const vendorOrders = useMemo(() => {
    if (!vendor) return [];
    return orders.filter((po) => po.vendorId === vendor.id);
  }, [vendor, orders]);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return vendorOrders;
    return vendorOrders.filter((po) => po.status === filter);
  }, [vendorOrders, filter]);

  // Stats
  const totalSpend = useMemo(
    () => vendorOrders.reduce((s, po) => s + po.totalAmount, 0),
    [vendorOrders]
  );
  const totalPaid = useMemo(
    () => vendorOrders.reduce((s, po) => s + (po.paidAmount || 0), 0),
    [vendorOrders]
  );
  const balanceDue = totalSpend - totalPaid;

  const formatCurrency = (n: number) =>
    `\u20B9${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "Pending", label: "Pending" },
    { key: "Ordered", label: "Ordered" },
    { key: "Received", label: "Received" },
  ];

  if (!portalMounted) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={variantsBackdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100]"
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)",
            }}
            onPointerDown={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={springModal}
            className="fixed top-0 right-0 z-[100] h-full w-full sm:w-[480px] flex flex-col bg-[var(--background)] border-l border-[var(--border)] shadow-2xl"
            onPointerDown={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[rgba(88,86,214,0.1)] dark:bg-[rgba(88,86,214,0.15)]">
                  <Building2 className="h-[18px] w-[18px] text-[var(--chart-5)]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[17px] font-bold text-[#0F172A] dark:text-white truncate">
                    {vendor?.name}
                  </h2>
                  <p className="text-[13px] text-[#64748B] dark:text-white/50">
                    {vendor?.contactPerson || vendor?.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center hover:bg-[var(--muted)] transition-colors flex-shrink-0 cursor-pointer"
              >
                <X className="h-[18px] w-[18px] text-[#64748B] hover:text-[#0F172A] dark:text-white/60 dark:hover:text-white" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Total Spend",
                    value: formatCurrency(totalSpend),
                    icon: ShoppingCart,
                    colorClass:
                      "text-[#2563EB] dark:text-[#60A5FA]",
                  },
                  {
                    label: "Amount Paid",
                    value: formatCurrency(totalPaid),
                    icon: IndianRupee,
                    colorClass:
                      "text-[#059669] dark:text-[#34D399]",
                  },
                  {
                    label: "Balance Due",
                    value: formatCurrency(Math.max(0, balanceDue)),
                    icon: Wallet,
                    colorClass:
                      balanceDue > 0
                        ? "text-[#D97706] dark:text-[#FBBF24]"
                        : "text-[#059669] dark:text-[#34D399]",
                  },
                  {
                    label: "PO Count",
                    value: vendorOrders.length.toString(),
                    icon: ClipboardList,
                    colorClass:
                      "text-[#7C3AED] dark:text-[#A78BFA]",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl p-3 bg-[rgba(255,255,255,0.72)] dark:bg-[#1a1f2e] border border-[var(--border)] shadow-xs"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <s.icon
                        className={cn("h-3.5 w-3.5", s.colorClass)}
                      />
                      <span className="text-[11px] text-[#64748B] dark:text-white/40 uppercase tracking-wider font-medium">
                        {s.label}
                      </span>
                    </div>
                    <span
                      className="text-[18px] font-bold text-[#0F172A] dark:text-white block"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Filter Chips */}
              <div
                className="flex gap-1.5 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "none" }}
              >
                {filters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all cursor-pointer",
                      filter === f.key
                        ? "text-white"
                        : "bg-[var(--muted)] text-[#64748B] hover:text-[#0F172A] dark:text-white/60 dark:hover:text-white/80"
                    )}
                    style={{
                      background:
                        filter === f.key ? "#1D9E75" : undefined,
                    }}
                  >
                    {f.label}
                    {f.key !== "all" && (
                      <span className="ml-1 opacity-60">
                        {vendorOrders.filter(
                          (po) => po.status === f.key
                        ).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Summary Bar */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[12px] text-[#64748B] dark:text-white/40">
                  {filteredOrders.length} order
                  {filteredOrders.length !== 1 ? "s" : ""}
                </span>
                <span className="text-[12px] text-[#64748B] dark:text-white/40">
                  Total:{" "}
                  <span
                    className="text-[#0F172A] dark:text-white/80 font-semibold"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrency(
                      filteredOrders.reduce(
                        (s, po) => s + po.totalAmount,
                        0
                      )
                    )}
                  </span>
                </span>
              </div>

              {/* Timeline List */}
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-[48px] h-[48px] rounded-[12px] flex items-center justify-center mb-3 bg-[var(--muted)]">
                    <ShoppingCart className="h-5 w-5 text-[#94A3B8] dark:text-white/30" />
                  </div>
                  <p className="text-[15px] font-medium text-[#64748B] dark:text-white/50">
                    No purchase orders found
                  </p>
                  <p className="text-[13px] text-[#94A3B8] dark:text-white/30 mt-1">
                    {filter !== "all"
                      ? "Try a different filter"
                      : "No orders with this vendor yet"}
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical connector line */}
                  <div
                    className="absolute left-[11px] top-[20px] w-[2px] bg-gradient-to-b from-[rgba(15,23,42,0.1)] to-[rgba(15,23,42,0.02)] dark:from-[rgba(255,255,255,0.08)] dark:to-[rgba(255,255,255,0.02)]"
                    style={{
                      height: `calc(100% - 40px)`,
                    }}
                  />

                  <div className="space-y-2">
                    {filteredOrders.map((po, idx) => {
                      const sc =
                        STATUS_CONFIG[po.status] || STATUS_CONFIG.Pending;
                      const ps = getPaymentStatus(
                        po.totalAmount,
                        po.paidAmount
                      );
                      const psc = PAYMENT_STATUS_CONFIG[ps];
                      const isExpanded = expandedId === po.id;
                      const poBalance = po.totalAmount - (po.paidAmount || 0);

                      return (
                        <div
                          key={po.id}
                          className="flex gap-3 relative cursor-pointer"
                          onClick={() =>
                            setExpandedId(
                              isExpanded ? null : po.id
                            )
                          }
                        >
                          {/* Dot */}
                          <div className="flex flex-col items-center flex-shrink-0 z-10 pt-4">
                            <div
                              className="w-[10px] h-[10px] rounded-full"
                              style={{
                                background: sc.dot,
                                boxShadow: `0 0 8px ${sc.dot}40`,
                              }}
                            />
                          </div>

                          {/* Card */}
                          <div
                            className={cn(
                              "flex-1 rounded-xl p-3 transition-all border",
                              isExpanded
                                ? "bg-[rgba(255,255,255,0.88)] dark:bg-[#1e2536] border-[var(--border)] shadow-xs"
                                : "bg-[rgba(255,255,255,0.72)] dark:bg-[#1a1f2e] border-[var(--border)]"
                            )}
                          >
                            {/* Top row */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[14px] font-semibold text-[#0F172A] dark:text-white block truncate">
                                  {po.poNumber}
                                </span>
                                <span className="text-[11px] text-[#64748B] dark:text-white/40 mt-0.5 block">
                                  {new Date(
                                    po.orderedAt || po.createdAt
                                  ).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                  {" · "}
                                  {po.items.length} item
                                  {po.items.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span
                                  className="text-[18px] font-bold text-[#0F172A] dark:text-white block"
                                  style={{
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {formatCurrency(po.totalAmount)}
                                </span>
                                {po.paidAmount > 0 && (
                                  <span className="text-[11px] text-[#64748B] dark:text-white/40">
                                    Paid: {formatCurrency(po.paidAmount)}
                                  </span>
                                )}
                                <div className="flex items-center gap-1 mt-1 justify-end">
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                    style={{
                                      background: sc.bg,
                                      color: sc.color,
                                    }}
                                  >
                                    {sc.label}
                                  </span>
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                    style={{
                                      background: psc.bg,
                                      color: psc.color,
                                    }}
                                  >
                                    {psc.label}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-2.5 h-[4px] rounded-full overflow-hidden bg-[rgba(15,23,42,0.08)] dark:bg-[rgba(255,255,255,0.06)]">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${Math.min(
                                    po.totalAmount > 0
                                      ? ((po.paidAmount || 0) /
                                          po.totalAmount) *
                                        100
                                      : 0,
                                    100
                                  )}%`,
                                }}
                                transition={{
                                  delay: idx * 0.03,
                                  duration: 0.5,
                                  ease: "easeOut",
                                }}
                                className="h-full rounded-full"
                                style={{ background: psc.dot }}
                              />
                            </div>

                            {/* Expanded detail */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{
                                    opacity: 0,
                                    height: 0,
                                  }}
                                  animate={{
                                    opacity: 1,
                                    height: "auto",
                                  }}
                                  exit={{
                                    opacity: 0,
                                    height: 0,
                                  }}
                                  transition={{
                                    duration: 0.2,
                                  }}
                                  className="mt-3 pt-3 space-y-2 border-t border-[var(--border)]"
                                >
                                  {/* Balance Due */}
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">
                                      Balance Due
                                    </span>
                                    <span
                                      className={cn(
                                        "text-[13px] font-semibold",
                                        poBalance > 0
                                          ? "text-amber-600 dark:text-amber-400"
                                          : "text-emerald-600 dark:text-emerald-400"
                                      )}
                                      style={{
                                        fontVariantNumeric:
                                          "tabular-nums",
                                      }}
                                    >
                                      {formatCurrency(
                                        Math.max(0, poBalance)
                                      )}
                                    </span>
                                  </div>

                                  {/* Items list */}
                                  <div className="space-y-1.5">
                                    <span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider block">
                                      Items
                                    </span>
                                    {po.items.map(
                                      (item, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center justify-between text-[13px]"
                                        >
                                          <span className="text-[#0F172A] dark:text-white/70 min-w-0 truncate mr-2">
                                            {item.materialName}
                                          </span>
                                          <span className="text-[#64748B] dark:text-white/40 flex-shrink-0 tabular-nums">
                                            {item.quantity}{" "}
                                            {item.unit}{" "}
                                            ×{" "}
                                            {formatCurrency(
                                              item.unitPrice
                                            )}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>

                                  {/* Tax */}
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">
                                      Tax
                                    </span>
                                    <span className="text-[13px] text-[#0F172A] dark:text-white/70 font-medium tabular-nums">
                                      {formatCurrency(po.taxAmount)}
                                    </span>
                                  </div>

                                  {/* Expand indicator */}
                                  <div className="flex justify-center pt-1">
                                    <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8] dark:text-white/20 rotate-180" />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
