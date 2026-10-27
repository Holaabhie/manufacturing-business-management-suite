"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ReceiptText,
    X,
    Edit3,
    Copy,
    Trash2,
    Ban,
    CheckCircle2,
    CreditCard,
    Calendar,
    Building2,
    FileText,
    Clock,
    AlertCircle,
    Info,
    ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LinkedDocChip } from "@/components/ui/LinkedDocChip";
import type { VendorBill, VendorBillPayment } from "@/modules/vendor-bills/domain/types";
import { RecordVendorBillPaymentModal } from "./RecordVendorBillPaymentModal";

interface BillDetailModalProps {
    open: boolean;
    onClose: () => void;
    billId: string | null;
    onEdit: (bill: VendorBill) => void;
    onRefresh: () => void;
}

export function BillDetailModal({
    open,
    onClose,
    billId,
    onEdit,
    onRefresh,
}: BillDetailModalProps) {
    const t = useTranslations("vendorBills");
    const router = useRouter();
    const [portalMounted, setPortalMounted] = useState(false);

    const formatDisplayDate = (dateStr?: string | Date | null): string => {
        if (!dateStr) return "-";
        try {
            const str = typeof dateStr === "string" ? dateStr : dateStr.toISOString();
            const d = new Date(str.includes("T") ? str : `${str}T00:00:00.000Z`);
            if (isNaN(d.getTime())) return String(dateStr);
            return d.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "Asia/Kolkata",
            });
        } catch {
            return String(dateStr);
        }
    };

    useEffect(() => {
        setPortalMounted(true);
    }, []);

    const [bill, setBill] = useState<VendorBill | null>(null);
    const [payments, setPayments] = useState<VendorBillPayment[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Sub-modal states
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Void bill state
    const [isVoidBillOpen, setIsVoidBillOpen] = useState(false);
    const [voidBillReason, setVoidBillReason] = useState("");
    const [isVoidingBill, setIsVoidingBill] = useState(false);

    // Void payment state
    const [paymentToVoid, setPaymentToVoid] = useState<VendorBillPayment | null>(null);
    const [voidPaymentReason, setVoidPaymentReason] = useState("");
    const [isVoidingPayment, setIsVoidingPayment] = useState(false);

    // Delete draft state
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit Open bill due_date / notes state
    const [isEditOpenFields, setIsEditOpenFields] = useState(false);
    const [editDueDate, setEditDueDate] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [isSavingOpenFields, setIsSavingOpenFields] = useState(false);

    const fetchBillDetails = async () => {
        if (!billId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/vendor-bills/${billId}`);
            if (!res.ok) throw new Error("Failed to load vendor bill");
            const data = await res.json();
            setBill(data.bill);
            setPayments(data.payments || []);
            setEditDueDate(data.bill?.due_date || "");
            setEditNotes(data.bill?.notes || "");
        } catch (err: any) {
            toast.error(err.message || t("errLoadDetails"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open && billId) {
            fetchBillDetails();
        } else {
            setBill(null);
            setPayments([]);
        }
    }, [open, billId]);

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

    // Mark Open handler
    const handleMarkOpen = async () => {
        if (!bill) return;
        try {
            const res = await fetch(`/api/vendor-bills/${bill.id}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Open" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to open bill");
            toast.success(t("toastStatusOpen"));
            await fetchBillDetails();
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || t("errOpenBill"));
        }
    };

    // Void Bill handler
    const handleVoidBill = async () => {
        if (!bill || !voidBillReason.trim()) {
            toast.error(t("errVoidBillReason"));
            return;
        }

        setIsVoidingBill(true);
        try {
            const res = await fetch(`/api/vendor-bills/${bill.id}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Void", void_reason: voidBillReason.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to void bill");
            toast.success(t("toastVoided"));
            setIsVoidBillOpen(false);
            setVoidBillReason("");
            await fetchBillDetails();
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || t("errVoidBill"));
        } finally {
            setIsVoidingBill(false);
        }
    };

    // Void Payment handler
    const handleVoidPayment = async () => {
        if (!bill || !paymentToVoid || !voidPaymentReason.trim()) {
            toast.error(t("errVoidPaymentReason"));
            return;
        }

        setIsVoidingPayment(true);
        try {
            const res = await fetch(`/api/vendor-bills/${bill.id}/payments/${paymentToVoid.id}/void`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ void_reason: voidPaymentReason.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to void payment");
            toast.success(t("toastPaymentVoided"));
            setPaymentToVoid(null);
            setVoidPaymentReason("");
            await fetchBillDetails();
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || t("errVoidPayment"));
        } finally {
            setIsVoidingPayment(false);
        }
    };

    // Duplicate handler
    const handleDuplicate = async () => {
        if (!bill) return;
        try {
            const res = await fetch(`/api/vendor-bills/${bill.id}/duplicate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to duplicate bill");
            toast.success(t("toastDuplicated"));
            onRefresh();
            onClose();
        } catch (err: any) {
            toast.error(err.message || t("errDuplicateBill"));
        }
    };

    // Delete Draft handler
    const handleDeleteDraft = async () => {
        if (!bill) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/vendor-bills/${bill.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete bill");
            toast.success(t("toastDeleted"));
            setIsDeleteOpen(false);
            onRefresh();
            onClose();
        } catch (err: any) {
            toast.error(err.message || t("errDeleteBill"));
        } finally {
            setIsDeleting(false);
        }
    };

    // Save Open bill due date / notes
    const handleSaveOpenFields = async () => {
        if (!bill) return;
        setIsSavingOpenFields(true);
        try {
            const res = await fetch(`/api/vendor-bills/${bill.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    due_date: editDueDate,
                    notes: editNotes.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update bill");
            toast.success(t("toastUpdated"));
            setIsEditOpenFields(false);
            await fetchBillDetails();
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || t("errUpdateBill"));
        } finally {
            setIsSavingOpenFields(false);
        }
    };

    if (!portalMounted || !open) return null;

    const nonVoidedPayments = payments.filter((p) => !p.voided);
    const balance = bill ? Math.max(0, bill.balance ?? (bill.payable_amount - bill.paid_total)) : 0;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
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
                    className="relative w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-[var(--background)] border-t sm:border border-[var(--border)] rounded-none sm:rounded-[20px] shadow-2xl flex flex-col overflow-hidden z-10"
                >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--card)]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                                <ReceiptText className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)] tracking-tight">
                                        {bill?.bill_number || t("detailTitle")}
                                    </h2>
                                    {bill && (
                                        <span
                                            className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                bill.status === "Open"
                                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                                    : bill.status === "Void"
                                                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                            )}
                                        >
                                            {bill.status}
                                        </span>
                                    )}
                                    {bill?.status === "Open" && bill.overdue && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                            {t("badgeOverdue")}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    {bill ? `${bill.vendor.name} • ${t("invoiceHash")}${bill.vendor_invoice_number}` : t("loadingFallback")}
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

                    {/* Content Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                        {isLoading || !bill ? (
                            <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                                {t("loadingFallback")}
                            </div>
                        ) : (
                            <>
                                {/* Void Warning if Void */}
                                {bill.status === "Void" && (
                                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
                                        <Ban className="w-4 h-4 shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-bold">{t("billVoided")}</div>
                                            <div>{t("lblReason")}: {bill.void_reason || t("noneSpecified")}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Top Grid: Vendor & Dates */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Vendor Card */}
                                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
                                            <Building2 className="w-4 h-4 text-emerald-500" />
                                            <span>{t("vendorDetails")}</span>
                                        </div>
                                        <div className="text-sm font-bold text-[var(--foreground)]">
                                            {bill.vendor.name}
                                        </div>
                                        {bill.vendor.gstin && (
                                            <div className="text-xs text-[var(--muted-foreground)]">
                                                GSTIN: <span className="font-mono">{bill.vendor.gstin}</span>
                                            </div>
                                        )}
                                        {bill.vendor.address && (
                                            <div className="text-xs text-[var(--muted-foreground)]">
                                                {bill.vendor.address}
                                            </div>
                                        )}
                                        {bill.vendor.phone && (
                                            <div className="text-xs text-[var(--muted-foreground)]">
                                                {t("lblPhone")}: {bill.vendor.phone}
                                            </div>
                                        )}
                                    </div>

                                    {/* Bill Info Card */}
                                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
                                            <FileText className="w-4 h-4 text-emerald-500" />
                                            <span>{t("billInformation")}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-[var(--muted-foreground)] block">{t("thVendorInvoice")}:</span>
                                                <span className="font-semibold text-[var(--foreground)]">
                                                    {bill.vendor_invoice_number}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[var(--muted-foreground)] block">{t("supplyType")}:</span>
                                                <span className="font-semibold text-[var(--foreground)]">
                                                    {bill.supply_type === "intra" ? t("supplyTypeIntra") : t("supplyTypeInter")}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[var(--muted-foreground)] block">{t("billDate")}:</span>
                                                <span className="font-semibold text-[var(--foreground)]">
                                                    {formatDisplayDate(bill.bill_date)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[var(--muted-foreground)] block">{t("dueDate")}:</span>
                                                <span className="font-semibold text-[var(--foreground)]">
                                                    {formatDisplayDate(bill.due_date)}
                                                </span>
                                            </div>
                                            {bill.purchase_order_id && (
                                                <div className="col-span-2 pt-2 border-t border-[var(--border)]/50">
                                                    <span className="text-[var(--muted-foreground)] block text-xs mb-1.5">{t("linkedPo")}:</span>
                                                    <LinkedDocChip
                                                        type="po"
                                                        doc={bill.purchase_order}
                                                        partyName={bill.purchase_order?.supplierName}
                                                        date={bill.purchase_order?.date}
                                                        amount={bill.purchase_order?.totalAmount}
                                                        onClick={() => {
                                                            if (bill.purchase_order?.id || bill.purchase_order_id) {
                                                                onClose();
                                                                router.push(`/dashboard/purchasing?poId=${bill.purchase_order?.id || bill.purchase_order_id}`);
                                                            }
                                                        }}
                                                        notFoundText="PO not available"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]/50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-[var(--border)] text-xs font-semibold text-[var(--foreground)]">
                                        {t("itemsTaxBreakdown")}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-[var(--muted)]/50 text-[var(--muted-foreground)] uppercase tracking-wider text-[10px]">
                                                <tr>
                                                    <th className="p-2.5">{t("thItem")}</th>
                                                    <th className="p-2.5">{t("colHsnShort")}</th>
                                                    <th className="p-2.5 text-right">{t("colQty")}</th>
                                                    <th className="p-2.5 text-right">{t("colRate")}</th>
                                                    <th className="p-2.5 text-right">{t("thDisc")}</th>
                                                    <th className="p-2.5 text-right">{t("thTaxable")}</th>
                                                    <th className="p-2.5 text-right">GST %</th>
                                                    <th className="p-2.5 text-right">{t("thTax")}</th>
                                                    <th className="p-2.5 text-right">{t("colTotal")}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {bill.items.map((item, idx) => {
                                                    const tax = item.cgst + item.sgst + item.igst;
                                                    return (
                                                        <tr key={idx} className="hover:bg-[var(--muted)]/20">
                                                            <td className="p-2.5 font-medium text-[var(--foreground)]">
                                                                {item.description}
                                                            </td>
                                                            <td className="p-2.5 font-mono text-[var(--muted-foreground)]">
                                                                {item.hsn_sac || "—"}
                                                            </td>
                                                            <td className="p-2.5 text-right">
                                                                {item.qty} {item.unit}
                                                            </td>
                                                            <td className="p-2.5 text-right">₹{item.rate.toFixed(2)}</td>
                                                            <td className="p-2.5 text-right text-[var(--muted-foreground)]">
                                                                {item.discount > 0 ? `₹${item.discount.toFixed(2)}` : "—"}
                                                            </td>
                                                            <td className="p-2.5 text-right font-medium">
                                                                ₹{item.taxable.toFixed(2)}
                                                            </td>
                                                            <td className="p-2.5 text-right">{item.gst_rate}%</td>
                                                            <td className="p-2.5 text-right text-[var(--muted-foreground)]">
                                                                ₹{tax.toFixed(2)}
                                                            </td>
                                                            <td className="p-2.5 text-right font-bold text-[var(--foreground)]">
                                                                ₹{item.line_total.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Financial Summary */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Left: Notes & Tax Summary */}
                                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 space-y-3">
                                        <div className="text-xs font-semibold text-[var(--foreground)]">{t("taxDetails")}</div>
                                        <div className="space-y-1.5 text-xs text-[var(--muted-foreground)]">
                                            {bill.supply_type === "intra" ? (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span>{t("cgstTotal")}:</span>
                                                        <span>₹{bill.cgst_total.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>{t("sgstTotal")}:</span>
                                                        <span>₹{bill.sgst_total.toFixed(2)}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex justify-between">
                                                    <span>{t("igstTotal")}:</span>
                                                    <span>₹{bill.igst_total.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-semibold text-[var(--foreground)] pt-1 border-t border-[var(--border)]">
                                                <span>{t("totalTax")}:</span>
                                                <span>₹{bill.total_tax.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {bill.notes && (
                                            <div className="pt-2 border-t border-[var(--border)] text-xs">
                                                <span className="text-[var(--muted-foreground)] block font-medium">{t("lblNotes")}:</span>
                                                <span className="text-[var(--foreground)]">{bill.notes}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Balance & Totals */}
                                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 space-y-2 text-xs">
                                        <div className="text-xs font-semibold text-[var(--foreground)] mb-2">
                                            {t("summary")}
                                        </div>
                                        <div className="flex justify-between text-[var(--muted-foreground)]">
                                            <span>{t("subtotal")}:</span>
                                            <span>₹{bill.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-[var(--muted-foreground)]">
                                            <span>{t("totalTax")}:</span>
                                            <span>₹{bill.total_tax.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-semibold text-[var(--foreground)]">
                                            <span>{t("grandTotal")}:</span>
                                            <span>₹{bill.grand_total.toFixed(2)}</span>
                                        </div>

                                        {bill.tds && (
                                            <div className="flex justify-between text-rose-500 font-medium">
                                                <span>TDS ({bill.tds.section} @ {bill.tds.rate}%):</span>
                                                <span>− ₹{bill.tds.amount.toFixed(2)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between font-bold text-[var(--foreground)] pt-1.5 border-t border-[var(--border)] text-sm">
                                            <span>{t("payableAmount")}:</span>
                                            <span>₹{bill.payable_amount.toFixed(2)}</span>
                                        </div>

                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                                            <span>{t("thPaid")}:</span>
                                            <span>₹{bill.paid_total.toFixed(2)}</span>
                                        </div>

                                        <div className="flex justify-between font-bold text-base pt-1.5 border-t border-[var(--border)] text-emerald-600 dark:text-emerald-400">
                                            <span>{t("thBalance")}:</span>
                                            <span>₹{balance.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment History Section */}
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]/50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
                                            <CreditCard className="w-4 h-4 text-emerald-500" />
                                            <span>{t("paymentHistory")}</span>
                                        </div>

                                        {bill.status === "Open" && balance > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setIsPaymentModalOpen(true)}
                                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-1.5"
                                            >
                                                <CreditCard className="w-3.5 h-3.5" />
                                                <span>{t("btnRecordPayment")}</span>
                                            </button>
                                        )}
                                    </div>

                                    {payments.length === 0 ? (
                                        <div className="p-6 text-center text-xs text-[var(--muted-foreground)]">
                                            {t("noPayments")}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-[var(--muted)]/50 text-[var(--muted-foreground)] uppercase tracking-wider text-[10px]">
                                                    <tr>
                                                        <th className="p-2.5">{t("thPaymentDate")}</th>
                                                        <th className="p-2.5">{t("thPaymentMode")}</th>
                                                        <th className="p-2.5">{t("thReference")}</th>
                                                        <th className="p-2.5 text-right">{t("thPaymentAmount")}</th>
                                                        <th className="p-2.5 text-center">{t("thStatus")}</th>
                                                        <th className="p-2.5 text-right">{t("thActions")}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--border)]">
                                                    {payments.map((p) => (
                                                        <tr
                                                            key={p.id}
                                                            className={cn(
                                                                "hover:bg-[var(--muted)]/20",
                                                                p.voided && "opacity-50 line-through bg-rose-500/5"
                                                            )}
                                                        >
                                                            <td className="p-2.5">{formatDisplayDate(p.payment_date)}</td>
                                                            <td className="p-2.5 font-medium">{p.payment_mode}</td>
                                                            <td className="p-2.5 font-mono text-[var(--muted-foreground)]">
                                                                {p.reference || "—"}
                                                            </td>
                                                            <td className="p-2.5 text-right font-bold text-[var(--foreground)]">
                                                                ₹{p.amount.toFixed(2)}
                                                            </td>
                                                            <td className="p-2.5 text-center">
                                                                {p.voided ? (
                                                                    <span className="text-[10px] text-rose-500 font-semibold uppercase">
                                                                        {t("statusVoided")}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-emerald-500 font-semibold uppercase">
                                                                        {t("statusActive")}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-2.5 text-right">
                                                                {!p.voided && bill.status === "Open" && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setPaymentToVoid(p);
                                                                            setVoidPaymentReason("");
                                                                        }}
                                                                        className="px-2 py-0.5 text-[11px] text-rose-500 hover:bg-rose-500/10 rounded transition-colors font-medium"
                                                                    >
                                                                        {t("actionVoidPayment")}
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer Actions */}
                    {bill && (
                        <div className="p-4 border-t border-[var(--border)] bg-[var(--card)] flex flex-wrap items-center justify-between gap-2 shrink-0">
                            {/* Left actions: Delete / Void / Duplicate */}
                            <div className="flex items-center gap-2">
                                {bill.status === "Draft" && (
                                    <button
                                        type="button"
                                        onClick={() => setIsDeleteOpen(true)}
                                        className="px-3 py-1.5 text-xs font-medium rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>{t("actionDelete")}</span>
                                    </button>
                                )}

                                {bill.status === "Open" && nonVoidedPayments.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setIsVoidBillOpen(true)}
                                        className="px-3 py-1.5 text-xs font-medium rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
                                    >
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>{t("actionVoid")}</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={handleDuplicate}
                                    className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors flex items-center gap-1.5"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>{t("actionDuplicate")}</span>
                                </button>
                            </div>

                            {/* Right actions: Edit / Mark Open / Record Payment */}
                            <div className="flex items-center gap-2">
                                {bill.status === "Draft" && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onEdit(bill);
                                                onClose();
                                            }}
                                            className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1.5"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            <span>{t("actionEdit")}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleMarkOpen}
                                            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-1.5"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>{t("actionMarkOpen")}</span>
                                        </button>
                                    </>
                                )}

                                {bill.status === "Open" && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditOpenFields(!isEditOpenFields)}
                                            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors flex items-center gap-1.5"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            <span>{t("btnEditDueDateNotes")}</span>
                                        </button>

                                        {balance > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setIsPaymentModalOpen(true)}
                                                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-1.5"
                                            >
                                                <CreditCard className="w-3.5 h-3.5" />
                                                <span>{t("btnRecordPayment")}</span>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Inline Edit for Open Bills (Due Date & Notes only) */}
                    {isEditOpenFields && bill && bill.status === "Open" && (
                        <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/50 space-y-3">
                            <div className="text-xs font-semibold text-[var(--foreground)]">
                                {t("editOpenBillNotice")}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-[var(--muted-foreground)] font-medium mb-1 block">
                                        {t("dueDate")} *
                                    </label>
                                    <input
                                        type="date"
                                        value={editDueDate}
                                        min={bill.bill_date}
                                        onChange={(e) => setEditDueDate(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--card)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-[var(--muted-foreground)] font-medium mb-1 block">
                                        {t("lblNotes")}
                                    </label>
                                    <input
                                        type="text"
                                        value={editNotes}
                                        onChange={(e) => setEditNotes(e.target.value)}
                                        placeholder={t("addNotesPlaceholder")}
                                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--card)]"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsEditOpenFields(false)}
                                    className="px-3 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--foreground)]"
                                >
                                    {t("cancel")}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveOpenFields}
                                    disabled={isSavingOpenFields}
                                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                                >
                                    {isSavingOpenFields ? t("saving") : t("btnSaveChanges")}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Sub-Modal: Record Payment */}
            {isPaymentModalOpen && bill && (
                <RecordVendorBillPaymentModal
                    open={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    bill={bill}
                    onSuccess={(newPayment, updatedBill) => {
                        setBill(updatedBill);
                        setPayments((prev) => [newPayment, ...prev]);
                        onRefresh();
                    }}
                />
            )}

            {/* Sub-Modal: Void Bill Sheet */}
            {isVoidBillOpen && bill && (
                <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                                <Ban className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[var(--foreground)]">
                                    {t("voidBillTitle")}
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    {t("voidBillDesc")}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-[var(--muted-foreground)] font-medium mb-1 block">
                                {t("voidReason")} *
                            </label>
                            <textarea
                                rows={3}
                                value={voidBillReason}
                                onChange={(e) => setVoidBillReason(e.target.value)}
                                placeholder={t("voidReasonPlaceholder")}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-rose-500"
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsVoidBillOpen(false)}
                                className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)]"
                            >
                                {t("cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={handleVoidBill}
                                disabled={isVoidingBill || !voidBillReason.trim()}
                                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-50"
                            >
                                {isVoidingBill ? t("saving") : t("btnConfirmVoid")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-Modal: Void Payment Sheet */}
            {paymentToVoid && (
                <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                                <Ban className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[var(--foreground)]">
                                    {t("voidPaymentTitle")}
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    {t("voidPaymentDesc", { amount: paymentToVoid.amount.toFixed(2) })}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-[var(--muted-foreground)] font-medium mb-1 block">
                                {t("voidReason")} *
                            </label>
                            <textarea
                                rows={3}
                                value={voidPaymentReason}
                                onChange={(e) => setVoidPaymentReason(e.target.value)}
                                placeholder={t("voidPaymentReasonPlaceholder")}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-rose-500"
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setPaymentToVoid(null)}
                                className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)]"
                            >
                                {t("cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={handleVoidPayment}
                                disabled={isVoidingPayment || !voidPaymentReason.trim()}
                                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-50"
                            >
                                {isVoidingPayment ? t("saving") : t("btnVoidPayment")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-Modal: Delete Draft Confirmation */}
            {isDeleteOpen && bill && (
                <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[var(--foreground)]">
                                    {t("deleteTitle")}
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    {t("deleteDesc", { number: bill.bill_number })}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsDeleteOpen(false)}
                                className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)]"
                            >
                                {t("cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteDraft}
                                disabled={isDeleting}
                                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? t("saving") : t("deleteConfirm")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
