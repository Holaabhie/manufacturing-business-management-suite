"use client";

import React from "react";
import { Edit2, Send, FileText, Layers, Trash2 } from "lucide-react";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/hooks/useFormatters";
import { deriveOrderStatusFromOrder, getStatusLabel } from "./order-utils";
import type { OrderItem } from "./types";

interface OrderActionSheetProps {
  open: boolean;
  order: OrderItem | null;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: (order: OrderItem) => void;
  onGenerateInvoice: (order: OrderItem) => void;
  onDelete: (orderId: string) => void;
  showToast: (msg: string) => void;
}

export function OrderActionSheet({
  open,
  order,
  isAdmin,
  onClose,
  onEdit,
  onGenerateInvoice,
  onDelete,
  showToast,
}: OrderActionSheetProps) {
  const t = useTranslations("orders");
  const { formatINR } = useFormatters();

  if (!order) return null;

  const derivedStatus = deriveOrderStatusFromOrder(order);

  const getStatusBadgeStyle = () => {
    if (derivedStatus === "completed") {
      return {
        bg: "rgba(48,209,88,0.1)",
        color: "#30D158",
        border: "1px solid rgba(48,209,88,0.2)",
      };
    }
    if (derivedStatus === "processing") {
      return {
        bg: "rgba(255,149,0,0.1)",
        color: "#FF9F0A",
        border: "1px solid rgba(255,149,0,0.2)",
      };
    }
    if (derivedStatus === "awaiting_payment") {
      return {
        bg: "rgba(245,158,11,0.1)",
        color: "#D97706",
        border: "1px solid rgba(245,158,11,0.2)",
      };
    }
    if (derivedStatus === "active") {
      return {
        bg: "rgba(10,132,255,0.1)",
        color: "#0A84FF",
        border: "1px solid rgba(10,132,255,0.2)",
      };
    }
    if (derivedStatus === "cancelled") {
      return {
        bg: "rgba(239,68,68,0.1)",
        color: "#EF4444",
        border: "1px solid rgba(239,68,68,0.2)",
      };
    }
    if (derivedStatus === "on_hold") {
      return {
        bg: "rgba(168,85,247,0.1)",
        color: "#A855F7",
        border: "1px solid rgba(168,85,247,0.2)",
      };
    }
    return {
      bg: "rgba(142,142,147,0.1)",
      color: "#8E8E93",
      border: "1px solid rgba(142,142,147,0.2)",
    };
  };

  const badgeStyle = getStatusBadgeStyle();

  return (
    <MobileSheet open={open} onClose={onClose}>
      {/* Header */}
      <div
        style={{
          padding: "0 16px 16px",
          borderBottom: "1px solid var(--overlay-border, rgba(15,23,42,0.06))",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 4,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--overlay-text-primary, #0F172A)",
              letterSpacing: "-0.5px",
              lineHeight: 1.3,
              margin: 0,
              fontFamily: "Inter, -apple-system, sans-serif",
            }}
          >
            {order.productName ?? order.product_name ?? t("mobile.order")}
          </h2>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: 4,
              textTransform: "uppercase",
              letterSpacing: "1px",
              background: badgeStyle.bg,
              color: badgeStyle.color,
              border: badgeStyle.border,
            }}
          >
            {getStatusLabel(derivedStatus)}
          </span>
        </div>
        <p
          style={{
            fontSize: 14,
            color: "var(--overlay-text-secondary, #64748B)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <span>{formatINR(Number(order.totalAmount ?? 0))}</span>
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "var(--overlay-text-muted, #94A3B8)",
              display: "inline-block",
            }}
          />
          <span>
            {order.quantity ?? 0} {order.unit ?? t("mobile.items")}
          </span>
        </p>
      </div>

      {/* Action Items */}
      <div className="flex flex-col gap-1 py-2">
        <button
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-[var(--foreground)] text-left w-full"
          onClick={() => {
            onClose();
            setTimeout(() => onEdit(order), 400);
          }}
        >
          <Edit2 className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
          {t("mobile.editOrder")}
        </button>

        <button
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-[var(--foreground)] text-left w-full"
          onClick={() => {
            onClose();
            showToast(t("toasts.shareLinkCopied"));
          }}
        >
          <Send className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
          {t("mobile.share")}
        </button>

        <button
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-[var(--foreground)] text-left w-full"
          onClick={() => {
            onClose();
            setTimeout(() => onGenerateInvoice(order), 400);
          }}
        >
          <FileText className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
          {t("mobile.viewInvoice")}
        </button>

        <button
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-[var(--foreground)] text-left w-full"
          onClick={() => {
            onClose();
            showToast(t("toasts.orderDuplicated"));
          }}
        >
          <Layers className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
          {t("mobile.duplicate")}
        </button>

        {/* Delete */}
        {isAdmin && (
          <button
            className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-red-500 text-left w-full"
            onClick={() => {
              onClose();
              onDelete(order.id);
            }}
          >
            <Trash2 className="h-[18px] w-[18px]" />
            {t("mobile.delete")}
          </button>
        )}
      </div>
    </MobileSheet>
  );
}
