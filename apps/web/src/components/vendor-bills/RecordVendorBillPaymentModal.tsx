"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, X, DollarSign, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { VendorBill, VendorBillPayment, BillPaymentMode } from "@/modules/vendor-bills/domain/types";
import { generateId } from "@/lib/uuid";

interface RecordVendorBillPaymentModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (payment: VendorBillPayment, updatedBill: VendorBill) => void;
    bill: VendorBill | null;
}

const PAYMENT_MODES: BillPaymentMode[] = ["Bank", "UPI", "Cheque", "Cash", "Other"];

const inputClasses = `
  bg-white/60 dark:bg-[rgba(15,17,25,0.6)]
  border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)]
  rounded-[7px] px-3 py-[6px] text-[12px]
  text-[#0F172A] dark:text-[#F1F5F9]
  placeholder:text-[#94A3B8]/50
  focus:border-emerald-500/50 focus:bg-emerald-500/[0.04]
  focus:ring-0 focus:outline-none
  transition-all duration-150 w-full
  h-[36px] md:h-[36px]
`;

const labelClasses = "text-[10px] text-[#64748B] dark:text-[#94A3B8] font-medium mb-[3px] block";

export function RecordVendorBillPaymentModal({
    open,
    onClose,
    onSuccess,
    bill,
}: RecordVendorBillPaymentModalProps) {
    const t = useTranslations("vendorBills");
    const queryClient = useQueryClient();
    const [portalMounted, setPortalMounted] = useState(false);

    useEffect(() => {
        setPortalMounted(true);
    }, []);

    const getToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const balance = bill ? Math.max(0, bill.balance ?? (bill.payable_amount - bill.paid_total)) : 0;

    const [amount, setAmount] = useState<number>(balance);
    const [paymentDate, setPaymentDate] = useState<string>(getToday());
    const [paymentMode, setPaymentMode] = useState<BillPaymentMode>("Bank");
    const [reference, setReference] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync default amount when bill changes
    useEffect(() => {
        if (bill) {
            const rem = Math.max(0, bill.balance ?? (bill.payable_amount - bill.paid_total));
            setAmount(Math.round(rem * 100) / 100);
            setPaymentDate(getToday());
            setPaymentMode("Bank");
            setReference("");
            setNotes("");
        }
    }, [bill, open]);

    // Body scroll lock
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bill) return;

        if (amount <= 0) {
            toast.error(t("errPaymentAmountPositive"));
            return;
        }

        if (amount > balance) {
            toast.error(t("errPaymentExceedsBalance", { amount: balance.toFixed(2) }));
            return;
        }

        const today = getToday();
        if (paymentDate > today) {
            toast.error(t("errPaymentDateFuture"));
            return;
        }

        if (paymentDate < bill.bill_date) {
            toast.error(t("errPaymentDateBeforeBill"));
            return;
        }

        setIsSubmitting(true);
        try {
            const idempotencyKey = generateId();
            const data = await apiClient.postIdempotent<{ payment: VendorBillPayment; updatedBill: VendorBill }>(
                `/api/vendor-bills/${bill.id}/payments`,
                {
                    amount: Number(amount),
                    payment_date: paymentDate,
                    payment_mode: paymentMode,
                    reference: reference.trim(),
                    notes: notes.trim(),
                },
                idempotencyKey
            );

            queryClient.invalidateQueries({ queryKey: queryKeys.vendorBills });
            queryClient.invalidateQueries({ queryKey: queryKeys.banking });

            toast.success(t("toastPaymentRecorded"));
            onSuccess(data.payment, data.updatedBill);
            onClose();
        } catch (err: any) {
            toast.error(err.message || t("errRecordPayment"));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!portalMounted || !open || !bill) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0"
                />

                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-[var(--background)] border-t sm:border border-[var(--border)] rounded-none sm:rounded-[20px] shadow-2xl flex flex-col overflow-hidden z-10"
                >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--card)]">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[var(--foreground)] tracking-tight">
                                    {t("modalPaymentTitle")}
                                </h2>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    {bill.bill_number} • {bill.vendor.name}
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

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                        {/* Outstanding Balance Banner */}
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                            <div>
                                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                                    {t("outstandingBalance")}
                                </div>
                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    ₹{balance.toFixed(2)}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAmount(Math.round(balance * 100) / 100)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
                            >
                                {t("btnPayFull")}
                            </button>
                        </div>

                        {/* Amount */}
                        <div>
                            <label className={labelClasses}>{t("paymentAmount")} (₹) *</label>
                            <input
                                type="number"
                                step="any"
                                min="0.01"
                                max={balance}
                                value={amount || ""}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className={inputClasses}
                                placeholder="0.00"
                                required
                                autoFocus
                            />
                        </div>

                        {/* Date */}
                        <div>
                            <label className={labelClasses}>{t("paymentDate")} *</label>
                            <input
                                type="date"
                                value={paymentDate}
                                min={bill.bill_date}
                                max={getToday()}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className={inputClasses}
                                required
                            />
                        </div>

                        {/* Mode */}
                        <div>
                            <label className={labelClasses}>{t("paymentMode")} *</label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-0.5">
                                {PAYMENT_MODES.map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setPaymentMode(mode)}
                                        className={cn(
                                            "py-1.5 px-2 text-xs rounded-lg border text-center transition-all font-medium",
                                            paymentMode === mode
                                                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm font-semibold"
                                                : "border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)]"
                                        )}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reference */}
                        <div>
                            <label className={labelClasses}>{t("paymentRef")}</label>
                            <input
                                type="text"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder={t("paymentRefPlaceholder")}
                                className={inputClasses}
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className={labelClasses}>{t("paymentNotes")}</label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t("paymentNotesPlaceholder")}
                                className={cn(inputClasses, "h-auto py-2")}
                            />
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="p-4 border-t border-[var(--border)] bg-[var(--card)] flex items-center justify-end gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors"
                        >
                            {t("cancel")}
                        </button>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || amount <= 0}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isSubmitting ? t("saving") : t("btnSavePayment")}</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
