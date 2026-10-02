"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
    Package,
    Calendar,
    Clock,
    User,
    Layers,
    ArrowRight,
    ClipboardList,
    AlertCircle,
} from "lucide-react";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { cn } from "@/lib/utils";

export interface StaffOrderData {
    id?: string;
    _id?: string;
    orderNumber?: string;
    productName?: string;
    product_name?: string;
    clientName?: string;
    client?: { name?: string };
    clients?: { name?: string };
    orderDate?: string | Date | null;
    createdAt?: string | Date | null;
    deliveryDate?: string | Date | null;
    delivery_date?: string | Date | null;
    dueDate?: string | Date | null;
    due_date?: string | Date | null;
    quantity?: number;
    unit?: string;
    status?: string;
    productionStatus?: string;
    production_status?: string;
    materials?: Array<{
        itemName?: string;
        name?: string;
        quantityRequired?: number;
        quantity?: number;
        unit?: string;
    }>;
    productionId?: string;
}

interface StaffOrderDetailSheetProps {
    open: boolean;
    onClose: () => void;
    order: StaffOrderData | null;
}

function formatDate(val?: string | Date | null): string {
    if (!val) return "—";
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    } catch {
        return "—";
    }
}

function getReadableOrderNumber(order: StaffOrderData): string {
    if (order.orderNumber && order.orderNumber.trim()) {
        return order.orderNumber;
    }
    const rawId = String(order.id || order._id || "");
    if (rawId.length >= 6) {
        return `ORD-${rawId.slice(-6).toUpperCase()}`;
    }
    return "ORD-—";
}

function getStatusBadgeColor(status?: string): "gray" | "blue" | "green" | "orange" | "red" | "purple" {
    const s = (status || "").toLowerCase().replace(/ /g, "_");
    if (s === "completed" || s === "done") return "green";
    if (s === "processing" || s === "in_progress" || s === "active" || s === "running") return "blue";
    if (s === "pending") return "orange";
    if (s === "cancelled") return "red";
    if (s === "dispatched" || s === "on_hold") return "purple";
    return "gray";
}

export function StaffOrderDetailSheet({
    open,
    onClose,
    order,
}: StaffOrderDetailSheetProps) {
    const router = useRouter();

    if (!order) return null;

    const orderNumber = getReadableOrderNumber(order);
    const orderName = order.productName || order.product_name || "Order Details";
    const customerName = order.clientName || order.client?.name || order.clients?.name || "—";
    const orderDate = order.orderDate || order.createdAt;
    const deliveryDate = order.deliveryDate || order.delivery_date || order.dueDate || order.due_date;
    const targetQuantity = `${order.quantity ?? 0} ${order.unit || "kg"}`;
    const orderStatus = order.status || "pending";
    const rawProdStatus = order.productionStatus || order.production_status || "";
    const productionStatus = rawProdStatus.trim();

    // Case-insensitive comparison with normalized underscores/spaces
    const normOrder = orderStatus.toLowerCase().replace(/[-_\s]+/g, " ").trim();
    const normProd = productionStatus.toLowerCase().replace(/[-_\s]+/g, " ").trim();
    const isDifferent = Boolean(
        productionStatus &&
        normProd !== "" &&
        normProd !== normOrder
    );
    const materials = Array.isArray(order.materials) ? order.materials : [];

    const handleGoToProduction = () => {
        onClose();
        if (order.productionId) {
            router.push(`/dashboard/production/${order.productionId}`);
        } else {
            router.push("/dashboard/production/my-productions");
        }
    };

    return (
        <MobileSheet
            open={open}
            onClose={onClose}
            maxHeight="86dvh"
            maxWidth="480px"
            showHandle={true}
        >
            <div className="flex flex-col h-full text-[var(--foreground)]">
                {/* ─── Header ─── */}
                <div className="px-5 pt-3 pb-4 border-b border-[var(--border)] shrink-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[12px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-[6px] bg-[var(--muted)] text-[var(--muted-foreground)]">
                            {orderNumber}
                        </span>
                        {!isDifferent ? (
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium text-[var(--muted-foreground)]">Status</span>
                                <IOSBadge
                                    color={getStatusBadgeColor(orderStatus)}
                                    variant="tinted"
                                    size="small"
                                    className="capitalize"
                                >
                                    {orderStatus.replace(/_/g, " ")}
                                </IOSBadge>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-medium text-[var(--muted-foreground)]">Order</span>
                                    <IOSBadge
                                        color={getStatusBadgeColor(orderStatus)}
                                        variant="tinted"
                                        size="small"
                                        className="capitalize"
                                    >
                                        {orderStatus.replace(/_/g, " ")}
                                    </IOSBadge>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-medium text-[var(--muted-foreground)]">Production</span>
                                    <IOSBadge
                                        color={getStatusBadgeColor(productionStatus)}
                                        variant="tinted"
                                        size="small"
                                        className="capitalize"
                                    >
                                        {productionStatus.replace(/_/g, " ")}
                                    </IOSBadge>
                                </div>
                            </div>
                        )}
                    </div>
                    <h2
                        className="text-[20px] font-bold text-[var(--foreground)] leading-[26px] tracking-tight truncate"
                        title={orderName}
                    >
                        {orderName}
                    </h2>
                </div>

                {/* ─── Scrollable Content ─── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 overscroll-contain">
                    {/* Customer & Target Overview */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Customer */}
                        <div className="p-3 rounded-[12px] bg-[var(--muted)]/50 border border-[var(--border)]">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                                <User className="h-3 w-3" />
                                <span>Customer</span>
                            </div>
                            <p className="text-[14px] font-medium text-[var(--foreground)] truncate" title={customerName}>
                                {customerName}
                            </p>
                        </div>

                        {/* Target Quantity */}
                        <div className="p-3 rounded-[12px] bg-[var(--muted)]/50 border border-[var(--border)]">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                                <Package className="h-3 w-3" />
                                <span>Target Qty</span>
                            </div>
                            <p className="text-[14px] font-bold text-[var(--foreground)] truncate">
                                {targetQuantity}
                            </p>
                        </div>
                    </div>

                    {/* Timeline / Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Order Date */}
                        <div className="p-3 rounded-[12px] bg-[var(--muted)]/50 border border-[var(--border)]">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                                <Calendar className="h-3 w-3" />
                                <span>Order Date</span>
                            </div>
                            <p className="text-[13px] font-medium text-[var(--foreground)]">
                                {formatDate(orderDate)}
                            </p>
                        </div>

                        {/* Delivery Date */}
                        <div className="p-3 rounded-[12px] bg-[var(--muted)]/50 border border-[var(--border)]">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                                <Clock className="h-3 w-3" />
                                <span>Delivery Date</span>
                            </div>
                            <p className="text-[13px] font-medium text-[var(--foreground)]">
                                {formatDate(deliveryDate)}
                            </p>
                        </div>
                    </div>

                    {/* Materials List */}
                    <div className="p-4 rounded-[16px] bg-[var(--muted)]/40 border border-[var(--border)] space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-[var(--primary)]" />
                                <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--foreground)]">
                                    Materials Required
                                </span>
                            </div>
                            <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
                                {materials.length} {materials.length === 1 ? "item" : "items"}
                            </span>
                        </div>

                        {materials.length === 0 ? (
                            <div className="py-4 text-center text-[13px] text-[var(--muted-foreground)]">
                                No materials specified for this order
                            </div>
                        ) : (
                            <div className="space-y-1.5 pt-1">
                                {materials.map((m, idx) => {
                                    const name = m.itemName || m.name || "Material";
                                    const qty = m.quantityRequired ?? m.quantity ?? 0;
                                    const unit = m.unit || "kg";
                                    return (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2.5 rounded-[10px] bg-[var(--card)] border border-[var(--border)] text-[13px]"
                                        >
                                            <span className="font-medium text-[var(--foreground)] truncate pr-2" title={name}>
                                                {name}
                                            </span>
                                            <span className="font-semibold text-[var(--foreground)] shrink-0 font-mono">
                                                {qty} {unit}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Pinned Footer Action ─── */}
                <div className="p-4 border-t border-[var(--border)] bg-[var(--card)] shrink-0">
                    <button
                        type="button"
                        onClick={handleGoToProduction}
                        className="w-full flex items-center justify-center gap-2 h-11 px-4 rounded-[12px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.35)] transition-all duration-200 active:scale-[0.98] cursor-pointer"
                    >
                        <span>Go to Production</span>
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </MobileSheet>
    );
}
