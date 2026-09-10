"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { X, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { NumericInput, parseNumericValue } from "@/components/ui/numeric-input";
import { toast } from "sonner";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

// ─── Types ──────────────────────────────────────────────────────

interface PurchaseOrderForPayment {
  id: string;
  poNumber: string;
  vendorName: string;
  totalAmount: number;
  paidAmount: number;
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrderForPayment | null;
  onPaymentRecorded: (updatedPO: any) => void;
}

const PAYMENT_MODES = ["Cash", "UPI", "Bank", "Cheque"] as const;

// ─── Component ──────────────────────────────────────────────────

export function RecordPaymentModal({
  // Hooks

  isOpen,
  onClose,
  purchaseOrder,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const t = useTranslations("purchasing.recordPayment");
  const tToast = useTranslations("purchasing.toasts");
  const [portalMounted, setPortalMounted] = useState(false);
  const [animateOpen, setAnimateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<string>("Cash");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  // Animate in
  useEffect(() => {
    if (isOpen) {
      // Reset form
      const outstanding = Math.max(
        0,
        (purchaseOrder?.totalAmount ?? 0) - (purchaseOrder?.paidAmount ?? 0)
      );
      setAmount(outstanding > 0 ? outstanding.toString() : "");
      setMode("Cash");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setReference("");
      setNotes("");
      requestAnimationFrame(() => setAnimateOpen(true));
    } else {
      setAnimateOpen(false);
    }
  }, [isOpen, purchaseOrder]);

  useBodyScrollLock(isOpen);

  const handleModalClose = () => {
    setAnimateOpen(false);
    setTimeout(onClose, 220);
  };

  const enteredAmount = parseNumericValue(amount);
  const outstanding = Math.max(
    0,
    (purchaseOrder?.totalAmount ?? 0) - (purchaseOrder?.paidAmount ?? 0)
  );
  const remaining = outstanding - enteredAmount;

  const formatIndianNumber = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseOrder || enteredAmount <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/purchase-orders/${purchaseOrder.id}/record-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: enteredAmount,
            mode,
            date: paymentDate,
            reference,
            notes,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(tToast("paymentRecorded"));
        onPaymentRecorded(data.data);
        handleModalClose();
      } else {
        toast.error(data.error || "Failed to record payment");
      }
    } catch {
      toast.error(tToast("recordPaymentFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!portalMounted || !isOpen) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-[220ms] ease-out",
        animateOpen ? "opacity-100" : "opacity-0"
      )}
      style={{
        backgroundColor: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={handleModalClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-vendor-payment-title"
        className={cn(
          "relative w-full sm:max-w-[640px] bg-white dark:bg-[#161B27] rounded-none sm:rounded-[20px] shadow-2xl flex flex-col transition-all duration-[220ms] ease-out",
          "h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh]",
          animateOpen
            ? "translate-y-0 sm:scale-100"
            : "translate-y-full sm:translate-y-5 sm:scale-95"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {/* ── HEADER ── */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
                  <IndianRupee className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2
                    id="record-vendor-payment-title"
                    className="text-[17px] font-semibold text-[#0F172A] dark:text-white leading-tight"
                  >
                    {t("title")}
                  </h2>
                  <p className="text-[13px] text-[#64748B] dark:text-slate-400 mt-0.5">
                    {purchaseOrder?.poNumber} · {purchaseOrder?.vendorName}
                  </p>
                </div>
              </div>

              {/* Outstanding badge */}
              <div className="flex flex-col items-end gap-0.5 mr-8 hidden sm:flex">
                <span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">
                  {t("lblOutstanding")}
                </span>
                <span className="text-[18px] font-bold text-[#0F172A] dark:text-white tabular-nums">
                  {"\u20B9"}
                  {formatIndianNumber(outstanding)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleModalClose}
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:bg-[rgba(15,23,42,0.06)] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Outstanding */}
            <div className="px-6 pb-3 sm:hidden">
              <div className="flex items-center justify-between rounded-[12px] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30 px-4 py-2.5">
                <span className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">
                  {t("lblOutstanding")}
                </span>
                <span className="text-[17px] font-bold text-[#0F172A] dark:text-white tabular-nums">
                  {"\u20B9"}
                  {formatIndianNumber(outstanding)}
                </span>
              </div>
            </div>

            {/* ── SECTION 1: Payment Details ── */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">
                    {t("lblAmount")}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[20px] font-bold text-[#0F172A] dark:text-white select-none pointer-events-none">
                      {"\u20B9"}
                    </span>
                    <NumericInput
                      value={amount}
                      onValueChange={setAmount}
                      className="w-full pl-9 h-[56px] rounded-[12px] text-[22px] font-bold tabular-nums text-[#0F172A] dark:text-white border border-[rgba(15,23,42,0.08)] dark:border-white/[0.08] bg-[rgba(255,255,255,0.72)] dark:bg-white/[0.04] focus:border-[#2563EB] focus:ring-0 outline-none transition-colors"
                      placeholder="0.00"
                      allowDecimal={true}
                      min={0}
                      required
                    />
                  </div>
                </div>

                {/* Payment Mode — pill selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">
                    {t("lblPaymentMode")}
                  </label>
                  <div className="grid grid-cols-4 gap-2 h-[56px]">
                    {PAYMENT_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={cn(
                          "h-full rounded-[10px] text-[13px] font-medium transition-all duration-150 border cursor-pointer",
                          mode === m
                            ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm"
                            : "bg-[rgba(255,255,255,0.72)] dark:bg-white/[0.04] text-[#64748B] dark:text-slate-400 border-[rgba(15,23,42,0.08)] dark:border-white/[0.08] hover:border-[rgba(59,130,246,0.4)] hover:text-[#2563EB]"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">
                    {t("lblPaymentDate")}
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="w-full h-[46px] rounded-[12px] border border-[rgba(15,23,42,0.08)] dark:border-white/[0.08] bg-[rgba(255,255,255,0.72)] dark:bg-white/[0.04] px-4 text-[15px] text-[#0F172A] dark:text-white outline-none focus:border-[#2563EB] focus:ring-0 transition-colors"
                  />
                </div>

                {/* Reference field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">
                    {t("lblReference")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("placeholderReference")}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full h-[46px] rounded-[12px] border border-[rgba(15,23,42,0.08)] dark:border-white/[0.08] bg-[rgba(255,255,255,0.72)] dark:bg-white/[0.04] px-4 text-[15px] text-[#0F172A] dark:text-white placeholder:text-[#94a3b8] dark:placeholder:text-slate-500 outline-none focus:border-[#2563EB] focus:ring-0 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-[rgba(15,23,42,0.06)] dark:border-white/[0.06]" />

            {/* ── SECTION 2: Notes ── */}
            <div className="px-6 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">
                  {t("lblPaymentNotes")}
                </label>
                <textarea
                  placeholder={t("placeholderPaymentNotes")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-[12px] border border-[rgba(15,23,42,0.08)] dark:border-white/[0.08] bg-[rgba(255,255,255,0.72)] dark:bg-white/[0.04] px-4 py-3 text-[14px] text-[#0F172A] dark:text-white placeholder:text-[#94a3b8] dark:placeholder:text-slate-500 resize-none min-h-[80px] focus:border-[#2563EB] outline-none transition-colors"
                />
              </div>
            </div>

            {/* ── SECTION 3: Live Summary Card ── */}
            <div className="mx-6 mb-6">
              <div className="rounded-[16px] bg-[rgba(37,99,235,0.04)] dark:bg-blue-950/20 border border-[rgba(37,99,235,0.12)] dark:border-blue-800/30 p-4">
                <p className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-widest mb-3">
                  {t("summaryTitle")}
                </p>

                <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                  <div>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">
                      {t("summaryOutstanding")}
                    </p>
                    <p className="text-[13px] font-medium text-[#0F172A] dark:text-white tabular-nums">
                      {"\u20B9"}
                      {formatIndianNumber(outstanding)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">
                      {t("summaryRecording")}
                    </p>
                    <p className="text-[13px] font-bold text-[#2563EB] dark:text-blue-400 tabular-nums">
                      {"\u20B9"}
                      {formatIndianNumber(enteredAmount || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">
                      {t("summaryRemaining")}
                    </p>
                    <p
                      className={cn(
                        "text-[13px] font-bold tabular-nums",
                        remaining === 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : remaining > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {"\u20B9"}
                      {formatIndianNumber(Math.abs(remaining))}
                      {remaining < 0 && ` ${t("summaryOver")}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="shrink-0 px-6 py-4 border-t border-[rgba(15,23,42,0.06)] dark:border-white/[0.06]">
            <button
              type="submit"
              disabled={submitting || enteredAmount <= 0}
              className={cn(
                "w-full h-[48px] rounded-[12px] text-[15px] font-semibold transition-all",
                "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm",
                "disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              )}
            >
              {submitting ? t("btnRecording") : t("btnRecord")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
