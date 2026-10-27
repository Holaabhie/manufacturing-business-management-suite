"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  X,
  Edit2,
  Copy,
  Send,
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  Loader2,
  Building,
  ShoppingCart,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LinkedDocChip } from "@/components/ui/LinkedDocChip";
import { getOrderDisplayNumber } from "@/lib/order-utils";
import type { Quotation, QuoteStatus } from "@/modules/quotes/domain/types";
import { ConvertLinePickerModal } from "./ConvertLinePickerModal";

interface QuoteDetailModalProps {
  open: boolean;
  onClose: () => void;
  quote: Quotation | null;
  onEdit: (quote: Quotation) => void;
  onDuplicate: (quote: Quotation) => void;
  onStatusChange: (id: string, newStatus: QuoteStatus) => void;
  onDelete: (quote: Quotation) => void;
  companyInfo?: any;
}

export function QuoteDetailModal({
  open,
  onClose,
  quote,
  onEdit,
  onDuplicate,
  onStatusChange,
  onDelete,
  companyInfo,
}: QuoteDetailModalProps) {
  const t = useTranslations("quotes");
  const router = useRouter();
  const tCommon = useTranslations("common");

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [linePickerOpen, setLinePickerOpen] = useState(false);

  // SSR-safe portal mount guard
  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => setPortalMounted(true), []);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !portalMounted || !quote) return null;

  const totalLines = quote.items?.length || 0;
  const convertedLines = (quote.converted_lines || []).filter((cl) => cl.order_id !== null);
  const convertedCount = convertedLines.length;
  const isFullyConverted = totalLines > 0 && convertedCount === totalLines;
  const isPartiallyConverted = convertedCount > 0 && convertedCount < totalLines;
  const convertedIndices = new Set(convertedLines.map((cl) => cl.line_index));
  const eligibleLines = (quote.items || []).filter(
    (item, idx) => !convertedIndices.has(idx) && (item.discount || 0) < item.qty * item.rate
  );
  const eligibleCount = eligibleLines.length;
  const canConvert = (quote.status === "Sent" || quote.status === "Accepted") && eligibleCount > 0;

  const handleConvertClick = () => {
    if (totalLines > 1) {
      setLinePickerOpen(true);
    } else {
      const eligibleIndex = (quote.items || []).findIndex(
        (item, idx) => !convertedIndices.has(idx) && (item.discount || 0) < item.qty * item.rate
      );
      if (eligibleIndex === -1) {
        toast.error(t("cannotConvertDiscountTooHigh") || "Cannot convert line where discount equals or exceeds line amount");
        return;
      }
      onClose();
      router.push(`/dashboard/orders/create?source=quote&quote_id=${quote.id}&line=${eligibleIndex}`);
    }
  };

  const handleSelectLineToConvert = (lineIndex: number) => {
    setLinePickerOpen(false);
    onClose();
    router.push(`/dashboard/orders/create?source=quote&quote_id=${quote.id}&line=${lineIndex}`);
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/generate-pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");

      const isFallback = res.headers.get("X-Fallback") === "html";
      if (isFallback) {
        const html = await res.text();
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      } else {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Quotation_${quote.quotation_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      toast.success(t("toastPdfGenerated"));
    } catch (err: any) {
      toast.error(err.message || t("toastPdfFailed"));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleStatusTransition = async (newStatus: QuoteStatus) => {
    setUpdatingStatus(true);
    try {
      await onStatusChange(quote.id, newStatus);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const statusStyles: Record<QuoteStatus, string> = {
    Draft: "bg-slate-500/15 text-slate-500 border-slate-500/30",
    Sent: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    Accepted: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    Rejected: "bg-rose-500/15 text-rose-500 border-rose-500/30",
    Expired: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-[var(--background)] border-t sm:border border-[var(--border)] rounded-none sm:rounded-[20px] shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--card)] flex flex-col gap-2.5">
            {/* Row 1: Left = Icon + Quote Number + Status, Right = Fixed Close (X) button */}
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-[var(--foreground)] truncate">
                      {quote.quotation_number}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider shrink-0",
                        statusStyles[quote.status]
                      )}
                    >
                      {t(`status${quote.status}` as any) || quote.status}
                    </span>
                    {isFullyConverted && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 shrink-0">
                        {t("badgeConverted")}
                      </span>
                    )}
                    {isPartiallyConverted && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 shrink-0">
                        {t("badgePartiallyConverted", { converted: convertedCount, total: totalLines })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">
                    {t("detailTitle")}
                  </p>
                </div>
              </div>

              {/* Close (X) button: Fixed at top-right, 40px tap target, shrink-0 */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors shrink-0 -mr-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Row 2: Action Buttons (Convert, Download, Duplicate, Edit, Delete) - Horizontally scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full py-0.5 shrink-0">
              {canConvert && (
                <button
                  type="button"
                  onClick={handleConvertClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  title={t("actionConvertToOrder")}
                >
                  <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("actionConvertToOrder")}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors shrink-0 whitespace-nowrap"
                title={t("actionDownloadPdf")}
              >
                {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Download className="w-3.5 h-3.5 shrink-0" />}
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDuplicate(quote);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors shrink-0 whitespace-nowrap"
                title={t("actionDuplicate")}
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>{t("actionDuplicate")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(quote);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shrink-0 whitespace-nowrap"
                title={t("actionEdit")}
              >
                <Edit2 className="w-3.5 h-3.5 shrink-0" />
                <span>{t("actionEdit")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(quote);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-colors shrink-0 whitespace-nowrap"
                title={t("actionDelete")}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{t("actionDelete")}</span>
              </button>
            </div>
          </div>

          {/* Status Transition Action Bar */}
          <div className="px-5 py-2.5 bg-[var(--muted)]/40 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <span className="text-xs text-[var(--muted-foreground)]">
              {t("thStatus")}: <strong className="text-[var(--foreground)]">{quote.status}</strong>
            </span>

            <div className="flex items-center gap-2">
              {quote.status === "Draft" && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusTransition("Sent")}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t("actionMarkSent")}
                </button>
              )}

              {(quote.status === "Sent" || quote.status === "Expired") && (
                <>
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleStatusTransition("Accepted")}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t("actionMarkAccepted")}
                  </button>

                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleStatusTransition("Rejected")}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    {t("actionMarkRejected")}
                  </button>
                </>
              )}

              {quote.status !== "Draft" && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusTransition("Draft")}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  Back to Draft
                </button>
              )}
            </div>
          </div>

          {/* Document Content View */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Header info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[var(--border)]">
              <div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block mb-1">
                  {t("billTo")}
                </span>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  {quote.clientName}
                </h3>
                {quote.clientAddress && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {quote.clientAddress}
                  </p>
                )}
                {quote.clientGSTIN && (
                  <p className="text-xs font-mono text-[var(--muted-foreground)] mt-0.5">
                    GSTIN: {quote.clientGSTIN}
                  </p>
                )}
                {quote.clientPhone && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Phone: {quote.clientPhone}
                  </p>
                )}
              </div>

              <div className="sm:text-right space-y-1 text-xs">
                <div>
                  <span className="text-[var(--muted-foreground)]">{t("thDate")}: </span>
                  <strong className="text-[var(--foreground)] tabular-nums">
                    {new Date(quote.quotation_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)]">{t("thValidUntil")}: </span>
                  <strong className="text-[var(--foreground)] tabular-nums">
                    {new Date(quote.valid_until).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)]">GST Mode: </span>
                  <strong className="text-blue-500">
                    {quote.is_igst ? "IGST (Inter-State)" : "CGST + SGST (Intra-State)"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Line items - Mobile Stacked Cards (<640px) */}
            <div className="sm:hidden space-y-3">
              {quote.items.map((item, idx) => {
                const convertedEntry = quote.converted_lines?.find(
                  (cl) => cl.line_index === idx && cl.order_id !== null
                );
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 space-y-2.5 text-xs shadow-sm"
                  >
                    {/* Top row: #1 Item description */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5 min-w-0 flex-1">
                        <span className="text-[var(--muted-foreground)] font-semibold shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[var(--foreground)] break-words leading-snug">
                            {item.description}
                          </p>
                          {convertedEntry?.order_id && (
                            <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                              <LinkedDocChip
                                type="order"
                                docNumber={getOrderDisplayNumber(convertedEntry.order_id)}
                                secondaryText={t("convertedToOrder")}
                                href={`/dashboard/orders/${convertedEntry.order_id}/edit`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Second row: HSN/SAC chip */}
                    {item.hsn_sac ? (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--muted)] text-[11px] font-medium text-[var(--muted-foreground)] border border-[var(--border)]">
                          HSN/SAC: {item.hsn_sac}
                        </span>
                      </div>
                    ) : null}

                    {/* 2-3 col mini grid: Qty · Rate · Disc · GST */}
                    <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 pt-2 border-t border-[var(--border)]/60 text-[11px]">
                      <div>
                        <span className="text-[var(--muted-foreground)] block text-[10px] uppercase font-medium">{t("colQty")}</span>
                        <span className="font-semibold text-[var(--foreground)] tabular-nums">
                          {item.qty} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--muted-foreground)] block text-[10px] uppercase font-medium">{t("colRate")}</span>
                        <span className="font-semibold text-[var(--foreground)] tabular-nums">
                          ₹{item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--muted-foreground)] block text-[10px] uppercase font-medium">{t("colDiscount")}</span>
                        <span className="font-semibold text-amber-500 tabular-nums">
                          {item.discount > 0 ? `₹${item.discount.toLocaleString("en-IN")}` : "₹0"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--muted-foreground)] block text-[10px] uppercase font-medium">GST</span>
                        <span className="font-semibold text-[var(--foreground)] tabular-nums">
                          {item.gst_rate}%
                        </span>
                      </div>
                    </div>

                    {/* Line total right-aligned in bold */}
                    <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                      <span className="text-[var(--muted-foreground)] font-medium">{t("colTotal")}</span>
                      <span className="font-bold text-[var(--foreground)] tabular-nums text-sm">
                        ₹{item.line_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Line items - Desktop Table (>=640px) */}
            <div className="hidden sm:block rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[650px]">
                  <thead className="bg-[var(--muted)]/70 text-[var(--muted-foreground)] border-b border-[var(--border)]">
                    <tr>
                      <th className="py-2.5 pl-3 text-left w-10">#</th>
                      <th className="py-2.5 text-left min-w-[180px]">{t("colItem")}</th>
                      <th className="py-2.5 text-center w-24">{t("colHsn")}</th>
                      <th className="py-2.5 text-center w-24">{t("colQty")}</th>
                      <th className="py-2.5 text-right w-28">{t("colRate")}</th>
                      <th className="py-2.5 text-right w-24">{t("colDiscount")}</th>
                      <th className="py-2.5 text-right w-20">GST</th>
                      <th className="py-2.5 pr-3 text-right w-32">{t("colTotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {quote.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[var(--muted)]/30">
                        <td className="py-2.5 pl-3 text-[var(--muted-foreground)] font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 font-medium text-[var(--foreground)]">
                          <div>
                            <span className="break-words">{item.description}</span>
                            {(() => {
                              const convertedEntry = quote.converted_lines?.find(
                                (cl) => cl.line_index === idx && cl.order_id !== null
                              );
                              if (convertedEntry?.order_id) {
                                return (
                                  <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                                    <LinkedDocChip
                                      type="order"
                                      docNumber={getOrderDisplayNumber(convertedEntry.order_id)}
                                      secondaryText={t("convertedToOrder")}
                                      href={`/dashboard/orders/${convertedEntry.order_id}/edit`}
                                    />
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="py-2.5 text-center text-[var(--muted-foreground)]">
                          {item.hsn_sac || "—"}
                        </td>
                        <td className="py-2.5 text-center tabular-nums">
                          {item.qty} {item.unit}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          ₹{item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-amber-500">
                          {item.discount > 0 ? `₹${item.discount.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-[var(--muted-foreground)]">
                          {item.gst_rate}%
                        </td>
                        <td className="py-2.5 pr-3 text-right font-bold tabular-nums text-[var(--foreground)]">
                          ₹{item.line_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            {(() => {
              const itemSumCgst = quote.items.reduce((acc, it) => acc + (it.cgst || 0), 0);
              const itemSumSgst = quote.items.reduce((acc, it) => acc + (it.sgst || 0), 0);
              const itemSumIgst = quote.items.reduce((acc, it) => acc + (it.igst || 0), 0);
              const displayCgst = quote.cgst_amount > 0 ? quote.cgst_amount : itemSumCgst;
              const displaySgst = quote.sgst_amount > 0 ? quote.sgst_amount : itemSumSgst;
              const displayIgst = quote.igst_amount > 0 ? quote.igst_amount : itemSumIgst;

              return (
                <div className="flex justify-end">
                  <div className="w-full sm:w-80 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[var(--muted-foreground)]">
                      <span>{t("subtotal")}</span>
                      <span className="tabular-nums text-right font-medium text-[var(--foreground)]">
                        ₹{quote.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {quote.total_discount > 0 && (
                      <div className="flex justify-between items-center text-amber-500">
                        <span>{t("totalDiscount")}</span>
                        <span className="tabular-nums text-right font-medium">
                          - ₹{quote.total_discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {quote.is_igst ? (
                      <div className="flex justify-between items-center text-[var(--muted-foreground)]">
                        <span>IGST</span>
                        <span className="tabular-nums text-right font-medium text-[var(--foreground)]">
                          ₹{displayIgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-[var(--muted-foreground)]">
                          <span>CGST</span>
                          <span className="tabular-nums text-right font-medium text-[var(--foreground)]">
                            ₹{displayCgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[var(--muted-foreground)]">
                          <span>SGST</span>
                          <span className="tabular-nums text-right font-medium text-[var(--foreground)]">
                            ₹{displaySgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="pt-2 border-t border-[var(--border)] flex justify-between items-center text-base font-bold text-[var(--foreground)]">
                      <span>{t("grandTotal")}</span>
                      <span className="tabular-nums text-right text-blue-500 font-bold">
                        ₹{quote.grand_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Notes & Terms */}
            {(quote.notes || quote.terms) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)] text-xs">
                {quote.notes && (
                  <div>
                    <span className="font-bold text-[var(--muted-foreground)] uppercase text-[10px] tracking-wider block mb-1">
                      {t("notesLabel")}
                    </span>
                    <p className="text-[var(--foreground)] whitespace-pre-line bg-[var(--muted)]/30 p-3 rounded-lg border border-[var(--border)]">
                      {quote.notes}
                    </p>
                  </div>
                )}
                {quote.terms && (
                  <div>
                    <span className="font-bold text-[var(--muted-foreground)] uppercase text-[10px] tracking-wider block mb-1">
                      {t("termsLabel")}
                    </span>
                    <p className="text-[var(--foreground)] whitespace-pre-line bg-[var(--muted)]/30 p-3 rounded-lg border border-[var(--border)]">
                      {quote.terms}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <ConvertLinePickerModal
        open={linePickerOpen}
        onClose={() => setLinePickerOpen(false)}
        quote={quote}
        onSelectLine={handleSelectLineToConvert}
      />
    </AnimatePresence>,
    document.body
  );
}
