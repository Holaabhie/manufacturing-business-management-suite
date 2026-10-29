"use client";

import { useTranslations } from "next-intl";
import {
  FileText,
  Eye,
  Download,
  Printer,
  Share2,
  Send,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { cn } from "@/lib/utils";
import type { Bill } from "./types";

interface BillingMobileCardsProps {
  bills: Bill[];
  loading: boolean;
  dateLocale: string;
  onPreview: (bill: Bill) => void;
  onDownloadPdf: (bill: Bill) => void;
  onPrint: (bill: Bill) => void;
  onWhatsAppShare: (bill: Bill) => void;
  onUpdateStatus: (id: string, status: Bill["status"]) => void;
  onOpenDelete: (id: string) => void;
  longPressedBill: Bill | null;
  isBillSheetOpen: boolean;
  onCloseBillSheet: () => void;
  longPressTriggeredRef: React.MutableRefObject<boolean>;
  onLongPressStart: (bill: Bill, e: React.TouchEvent) => void;
  onLongPressMove: (e: React.TouchEvent) => void;
  onLongPressEnd: () => void;
}

export function BillingMobileCards({
  bills,
  loading,
  dateLocale,
  onPreview,
  onDownloadPdf,
  onPrint,
  onWhatsAppShare,
  onUpdateStatus,
  onOpenDelete,
  longPressedBill,
  isBillSheetOpen,
  onCloseBillSheet,
  longPressTriggeredRef,
  onLongPressStart,
  onLongPressMove,
  onLongPressEnd,
}: BillingMobileCardsProps) {
  const t = useTranslations("billing");

  return (
    <>
      <div className="block md:hidden px-3 py-2 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#1a1f2e] rounded-xl px-4 py-3 border-l-4 border-gray-600"
            >
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-5 w-full rounded mt-2" />
              <Skeleton className="h-3 w-32 rounded mt-2" />
            </div>
          ))
        ) : bills.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{t("noInvoicesFound")}</p>
          </div>
        ) : (
          bills.map((bill) => (
            <div
              key={bill.id}
              className={cn(
                "bg-[#1a1f2e] rounded-xl px-4 py-3 border-l-4 select-none",
                bill.status === "paid"
                  ? "border-green-500"
                  : bill.status === "sent"
                    ? "border-blue-500"
                    : bill.status === "overdue"
                      ? "border-red-500"
                      : "border-gray-500"
              )}
              onClick={() => {
                if (longPressTriggeredRef.current) {
                  longPressTriggeredRef.current = false;
                  return; // Suppress click after long press
                }
                onPreview(bill);
              }}
              onTouchStart={(e) => onLongPressStart(bill, e)}
              onTouchMove={onLongPressMove}
              onTouchEnd={onLongPressEnd}
              onTouchCancel={onLongPressEnd}
            >
              {/* Row 1: Invoice number + Status badge */}
              <div className="flex justify-between items-center">
                <span className="text-blue-400 text-xs font-mono">{bill.billNumber}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    bill.status === "paid"
                      ? "bg-green-500/20 text-green-400"
                      : bill.status === "sent"
                        ? "bg-blue-500/20 text-blue-400"
                        : bill.status === "overdue"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-muted text-muted-foreground"
                  )}
                >
                  {(bill.status === "paid"
                    ? t("statusPaid")
                    : bill.status === "sent"
                      ? t("statusSent")
                      : bill.status === "overdue"
                        ? t("statusOverdue")
                        : t("statusDraft")
                  ).toUpperCase()}
                </span>
              </div>
              {/* Row 2: Client name + Amount */}
              <div className="flex justify-between items-center mt-1">
                <span className="text-white text-sm font-semibold truncate mr-2">
                  {bill.clientName}
                </span>
                <span className="text-white text-sm font-bold whitespace-nowrap">
                  {"\u20B9"}{bill.totalAmount.toLocaleString(dateLocale)}
                </span>
              </div>
              {/* Row 3: Dates */}
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground text-xs">
                  {new Date(bill.billDate).toLocaleDateString(dateLocale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t("dueLabel", {
                    date: new Date(bill.dueDate).toLocaleDateString(dateLocale, {
                      day: "numeric",
                      month: "short",
                    }),
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Mobile Bottom Sheet ─── */}
      <MobileSheet open={isBillSheetOpen} onClose={onCloseBillSheet} maxHeight="65dvh">
        {longPressedBill && (
          <div className="px-5 pb-4 space-y-1">
            {/* Header */}
            <div className="pb-3 mb-2 border-b border-white/10">
              <p className="text-[15px] font-semibold text-[var(--foreground)]">
                {longPressedBill.clientName}
              </p>
              <p className="text-[13px] text-[var(--muted-foreground)]">
                {longPressedBill.billNumber} · {"\u20B9"}
                {longPressedBill.totalAmount.toLocaleString(dateLocale)}
              </p>
            </div>

            {/* Preview */}
            <button
              onClick={() => {
                onCloseBillSheet();
                onPreview(longPressedBill);
              }}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Eye className="h-[18px] w-[18px] text-blue-400" />
              <span className="text-[15px] text-[var(--foreground)]">{t("sheetPreview")}</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={() => {
                onCloseBillSheet();
                onDownloadPdf(longPressedBill);
              }}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Download className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              <span className="text-[15px] text-[var(--foreground)]">
                {t("sheetDownloadPdf")}
              </span>
            </button>

            {/* Print */}
            <button
              onClick={() => {
                onCloseBillSheet();
                onPrint(longPressedBill);
              }}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Printer className="h-[18px] w-[18px] text-[var(--erp-success)]" />
              <span className="text-[15px] text-[var(--foreground)]">{t("sheetPrint")}</span>
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={() => {
                onCloseBillSheet();
                onWhatsAppShare(longPressedBill);
              }}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Share2 className="h-[18px] w-[18px] text-green-500" />
              <span className="text-[15px] text-[var(--foreground)]">{t("sheetWhatsApp")}</span>
            </button>

            <div className="my-1 border-t border-white/10" />

            {/* Mark as Sent (draft only) */}
            {longPressedBill.status === "draft" && (
              <button
                onClick={() => {
                  onCloseBillSheet();
                  onUpdateStatus(longPressedBill.id, "sent");
                }}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Send className="h-[18px] w-[18px] text-blue-400" />
                <span className="text-[15px] text-[var(--foreground)]">
                  {t("sheetMarkSent")}
                </span>
              </button>
            )}

            {/* Mark as Paid (sent only) */}
            {longPressedBill.status === "sent" && (
              <button
                onClick={() => {
                  onCloseBillSheet();
                  onUpdateStatus(longPressedBill.id, "paid");
                }}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="h-[18px] w-[18px] text-green-400" />
                <span className="text-[15px] text-[var(--foreground)]">
                  {t("sheetMarkPaid")}
                </span>
              </button>
            )}

            <div className="my-1 border-t border-white/10" />

            {/* Delete */}
            <button
              onClick={() => {
                onCloseBillSheet();
                onOpenDelete(longPressedBill.id);
              }}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Trash2 className="h-[18px] w-[18px] text-red-400" />
              <span className="text-[15px] text-red-400">{t("sheetDelete")}</span>
            </button>
          </div>
        )}
      </MobileSheet>
    </>
  );
}

