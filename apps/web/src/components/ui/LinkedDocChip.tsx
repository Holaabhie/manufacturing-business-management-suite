"use client";

import React from "react";
import Link from "next/link";
import { FileText, ShoppingCart, ReceiptText, ExternalLink, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrderDisplayNumber } from "@/lib/order-utils";

export type LinkedDocType = "order" | "po" | "bill" | "invoice" | "challan" | "quote";

export interface LinkedDocChipProps {
  type: LinkedDocType;
  /**
   * The linked document or document snapshot.
   * If null/undefined and no explicit docNumber is passed, renders a graceful "not available" state.
   */
  doc?: {
    id?: string;
    _id?: string;
    orderNumber?: string;
    order_number?: string;
    orderId?: string;
    poNumber?: string;
    po_number?: string;
    bill_number?: string;
    challan_number?: string;
    quote_number?: string;
    number?: string;
    clientName?: string;
    vendorName?: string;
    supplierName?: string;
    partyName?: string;
    date?: string | Date | null;
    createdAt?: string | Date | null;
    totalAmount?: number | null;
  } | null;

  /** Explicit document number if not available inside doc */
  docNumber?: string | null;
  /** Explicit client / vendor / party name */
  partyName?: string | null;
  /** Optional date to display */
  date?: string | Date | null;
  /** Optional amount to display */
  amount?: number | null;
  /** Custom secondary text string (overrides partyName + date + amount) */
  secondaryText?: string | null;
  /** URL to navigate to when clicked */
  href?: string;
  /** Custom click handler */
  onClick?: () => void;
  /** Custom fallback text if document is missing */
  notFoundText?: string;
  className?: string;
}

export function LinkedDocChip({
  type,
  doc,
  docNumber,
  partyName,
  date,
  amount,
  secondaryText,
  href,
  onClick,
  notFoundText,
  className,
}: LinkedDocChipProps) {
  // Resolve primary document number
  let primaryNumber = docNumber?.trim() || "";

  if (!primaryNumber && doc) {
    if (type === "order") {
      primaryNumber = getOrderDisplayNumber(doc);
    } else if (type === "po") {
      primaryNumber = doc.poNumber || doc.po_number || doc.number || "";
      // If still missing but has raw id, do not output raw id
      if (!primaryNumber && (doc.id || doc._id)) {
        const idStr = String(doc.id || doc._id);
        primaryNumber = `PO-${idStr.slice(-4).toUpperCase()}`;
      }
    } else {
      primaryNumber =
        doc.number ||
        doc.bill_number ||
        doc.challan_number ||
        doc.quote_number ||
        "";
    }
  }

  // Graceful fallback when missing / deleted — NEVER show raw ObjectId
  if (!primaryNumber) {
    const fallbackMessage =
      notFoundText ||
      (type === "order"
        ? "Order not available"
        : type === "po"
        ? "PO not available"
        : `${type.toUpperCase()} not available`);

    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] italic font-normal", className)}>
        <HelpCircle className="w-3.5 h-3.5 opacity-50 shrink-0" />
        <span>{fallbackMessage}</span>
      </span>
    );
  }

  // Resolve secondary text (party name, date, amount)
  const resolvedParty =
    partyName ||
    doc?.partyName ||
    doc?.clientName ||
    doc?.supplierName ||
    doc?.vendorName ||
    "";

  const resolvedDate = date ?? doc?.date ?? doc?.createdAt;
  const resolvedAmount = amount ?? doc?.totalAmount;

  // Format date helper
  let formattedDate: string | null = null;
  if (resolvedDate) {
    try {
      const d = new Date(resolvedDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        });
      }
    } catch {
      // Ignore invalid date
    }
  }

  // Format amount helper
  let formattedAmount: string | null = null;
  if (resolvedAmount != null && !isNaN(Number(resolvedAmount))) {
    formattedAmount = `₹${Number(resolvedAmount).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  }

  // Icon based on type
  const Icon =
    type === "order"
      ? ShoppingCart
      : type === "po"
      ? FileText
      : type === "bill"
      ? ReceiptText
      : FileText;

  // Theme styling based on type
  const colorStyles =
    type === "order"
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25 hover:bg-blue-500/20"
      : type === "po"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
      : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25 hover:bg-purple-500/20";

  const content = (
    <>
      <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
      <span className="font-semibold font-mono shrink-0">{primaryNumber}</span>

      {secondaryText ? (
        <span className="text-[var(--foreground)] truncate max-w-[140px] sm:max-w-none">
          • {secondaryText}
        </span>
      ) : (
        <>
          {resolvedParty && (
            <span className="text-[var(--foreground)] truncate max-w-[120px] sm:max-w-[180px]">
              • {resolvedParty}
            </span>
          )}
          {formattedDate && (
            <span className="text-[var(--muted-foreground)] hidden sm:inline shrink-0">
              • {formattedDate}
            </span>
          )}
          {formattedAmount && (
            <span className="text-[var(--muted-foreground)] hidden sm:inline shrink-0">
              • {formattedAmount}
            </span>
          )}
        </>
      )}

      {(href || onClick) && (
        <ExternalLink className="w-3 h-3 ml-0.5 opacity-60 shrink-0" />
      )}
    </>
  );

  const containerClasses = cn(
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium text-left max-w-full transition-colors",
    colorStyles,
    (href || onClick) && "cursor-pointer active:scale-[0.98]",
    className
  );

  if (href) {
    return (
      <Link href={href} className={containerClasses} onClick={onClick}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={containerClasses}>
        {content}
      </button>
    );
  }

  return <span className={containerClasses}>{content}</span>;
}
