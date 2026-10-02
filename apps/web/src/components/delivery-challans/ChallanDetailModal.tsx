"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  X,
  Edit2,
  Copy,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Send,
  Calendar,
  MapPin,
  Building,
  FileText,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { useFormatters } from "@/hooks/useFormatters";
import type { DeliveryChallan, ChallanStatus } from "@/modules/delivery-challans/domain/types";

interface ChallanDetailModalProps {
  challan: DeliveryChallan | null;
  open: boolean;
  onClose: () => void;
  onEdit: (challan: DeliveryChallan) => void;
  onDuplicate: (challan: DeliveryChallan) => void;
  onDownloadPdf: (challan: DeliveryChallan) => void;
  onStatusChange: (id: string, status: ChallanStatus) => void;
  onDelete: (challan: DeliveryChallan) => void;
}

export function ChallanDetailModal({
  challan,
  open,
  onClose,
  onEdit,
  onDuplicate,
  onDownloadPdf,
  onStatusChange,
  onDelete,
}: ChallanDetailModalProps) {
  const t = useTranslations("challans");
  const tCommon = useTranslations("common");
  const { formatDate } = useFormatters();
  const [portalMounted, setPortalMounted] = useState(false);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

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

  if (!open || !challan || !portalMounted) return null;

  const getBadgeConfig = (status: ChallanStatus): { color: "blue" | "green" | "red" | "orange" | "purple" | "gray"; variant: "filled" | "tinted" | "outline" } => {
    switch (status) {
      case "Dispatched":
        return { color: "blue", variant: "tinted" };
      case "Delivered":
        return { color: "green", variant: "tinted" };
      case "Returned":
        return { color: "orange", variant: "tinted" };
      case "Cancelled":
        return { color: "red", variant: "tinted" };
      case "Draft":
      default:
        return { color: "gray", variant: "tinted" };
    }
  };

  const badgeConfig = getBadgeConfig(challan.status);

  // Status transition capabilities
  const canMarkDispatched = challan.status === "Draft";
  const canMarkDelivered = challan.status === "Dispatched";
  const canMarkReturned = challan.status === "Dispatched" || challan.status === "Delivered";
  const canCancel = challan.status === "Draft" || challan.status === "Dispatched";
  const canEdit = challan.status === "Draft" || challan.status === "Dispatched";
  const canDelete = challan.status === "Draft" || challan.status === "Cancelled";

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
          className="relative w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-3xl bg-[var(--background)] border-t sm:border border-[var(--border)] rounded-none sm:rounded-[20px] shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--card)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)] tracking-tight">
                    {challan.challan_number}
                  </h2>
                  <IOSBadge color={badgeConfig.color} variant={badgeConfig.variant} size="small">
                    {t(`status${challan.status}` as any) || challan.status}
                  </IOSBadge>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("thPurpose")}: <span className="font-semibold text-[var(--foreground)]">{challan.purpose}</span> | {formatDate(challan.challan_date)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]">
              {canMarkDispatched && (
                <button
                  type="button"
                  onClick={() => onStatusChange(challan.id, "Dispatched")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t("actionMarkDispatched")}
                </button>
              )}

              {canMarkDelivered && (
                <button
                  type="button"
                  onClick={() => onStatusChange(challan.id, "Delivered")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("actionMarkDelivered")}
                </button>
              )}

              {canMarkReturned && (
                <button
                  type="button"
                  onClick={() => onStatusChange(challan.id, "Returned")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t("actionMarkReturned")}
                </button>
              )}

              {canCancel && (
                <button
                  type="button"
                  onClick={() => onStatusChange(challan.id, "Cancelled")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {t("actionCancel")}
                </button>
              )}

              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onDownloadPdf(challan)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card)] border border-[var(--border)] transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  <span>PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDuplicate(challan)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card)] border border-[var(--border)] transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t("actionDuplicate")}</span>
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(challan);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card)] border border-[var(--border)] transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>{t("actionEdit")}</span>
                  </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDelete(challan);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Consignee & Shipping Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  <Building className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t("consigneeDetails")}</span>
                </div>
                <div className="text-sm font-bold text-[var(--foreground)]">
                  {challan.consignee.name}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {challan.consignee.address || "No address specified"}
                </div>
                {challan.consignee.phone && (
                  <div className="text-xs text-[var(--muted-foreground)]">
                    Phone: {challan.consignee.phone}
                  </div>
                )}
                {challan.consignee.gstin && (
                  <div className="text-xs font-mono text-[var(--foreground)] font-medium">
                    GSTIN: {challan.consignee.gstin}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t("shipToAddress")}</span>
                </div>
                <div className="text-xs text-[var(--foreground)] leading-relaxed">
                  {challan.ship_to_address || challan.consignee.address || "-"}
                </div>
                {challan.order_id && (
                  <div className="pt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {t("orderLinked")}: {challan.order_id}
                  </div>
                )}
              </div>
            </div>

            {/* Transport Details Card */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                <Truck className="w-3.5 h-3.5 text-blue-500" />
                <span>{t("transportDetails")}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] block uppercase">
                    {t("transporterName")}
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {challan.transporter_name || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] block uppercase">
                    {t("vehicleNo")}
                  </span>
                  <span className="font-mono font-semibold text-[var(--foreground)] uppercase">
                    {challan.vehicle_no || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] block uppercase">
                    {t("lrNumber")}
                  </span>
                  <span className="font-mono font-semibold text-[var(--foreground)]">
                    {challan.lr_number || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] block uppercase">
                    {t("ewayBillNo")}
                  </span>
                  <span className="font-mono font-semibold text-[var(--foreground)]">
                    {challan.eway_bill_no || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] block uppercase">
                    {t("dispatchDate")}
                  </span>
                  <span className="text-[var(--foreground)]">
                    {challan.dispatch_date ? formatDate(challan.dispatch_date) : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] block uppercase">
                    {t("expectedDeliveryDate")}
                  </span>
                  <span className="text-[var(--foreground)]">
                    {challan.expected_delivery_date ? formatDate(challan.expected_delivery_date) : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] block uppercase">
                    {t("deliveredDate")}
                  </span>
                  <span className="text-[var(--foreground)]">
                    {challan.delivered_date ? formatDate(challan.delivered_date) : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                <span>{t("itemsSummary")} ({challan.items.length})</span>
              </div>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--muted)]/50 text-[var(--muted-foreground)] border-b border-[var(--border)]">
                    <tr>
                      <th className="py-2 px-3 font-semibold w-10">#</th>
                      <th className="py-2 px-3 font-semibold">{t("colItem")}</th>
                      <th className="py-2 px-3 font-semibold text-right w-24">{t("colQty")}</th>
                      <th className="py-2 px-3 font-semibold text-center w-20">{t("colUnit")}</th>
                      <th className="py-2 px-3 font-semibold">{t("colRemarks")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {challan.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[var(--muted)]/20 transition-colors">
                        <td className="py-2 px-3 text-[var(--muted-foreground)] font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-[var(--foreground)]">{item.description}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[var(--foreground)]">{item.qty}</td>
                        <td className="py-2 px-3 text-center text-[var(--muted-foreground)] font-mono">{item.unit}</td>
                        <td className="py-2 px-3 text-[var(--muted-foreground)]">{item.remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {challan.notes && (
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-1">
                <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  {t("notesLabel")}
                </div>
                <p className="text-xs text-[var(--foreground)] whitespace-pre-line leading-relaxed">
                  {challan.notes}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
