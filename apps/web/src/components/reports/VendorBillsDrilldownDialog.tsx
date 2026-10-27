"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/hooks/useFormatters";
import type { AgingVendorRow, AgingBillDetail } from "@/lib/reports/payables";
import { FileText, Eye, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VendorBillsDrilldownDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendor: AgingVendorRow | null;
    onOpenStatement: (vendor: AgingVendorRow) => void;
}

export function VendorBillsDrilldownDialog({
    open,
    onOpenChange,
    vendor,
    onOpenStatement,
}: VendorBillsDrilldownDialogProps) {
    const t = useTranslations("payables");
    const { formatINR } = useFormatters();

    if (!vendor) return null;

    const bills = vendor.bills || [];

    const getBucketBadge = (bucket: AgingBillDetail["bucket"], days: number) => {
        switch (bucket) {
            case "notDue":
                return (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 text-[var(--muted-foreground)] border border-slate-500/20 whitespace-nowrap">
                        {t("notDue")}
                    </span>
                );
            case "days1_30":
                return (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
                        {t("badge1_30d", { days })}
                    </span>
                );
            case "days31_60":
                return (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 whitespace-nowrap">
                        {t("badge31_60d", { days })}
                    </span>
                );
            case "days61_90":
                return (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">
                        {t("badge61_90d", { days })}
                    </span>
                );
            case "days90Plus":
                return (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 whitespace-nowrap">
                        {t("badge90PlusD", { days })}
                    </span>
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                fullScreenMobile
                className="max-w-4xl w-full p-0 overflow-hidden rounded-2xl flex flex-col md:max-h-[85vh]"
            >
                <DialogHeader className="p-4 sm:p-5 border-b border-[var(--border)] shrink-0 bg-[var(--card)] flex flex-row items-center justify-between gap-3">
                    <div className="min-w-0">
                        <DialogTitle className="text-base sm:text-lg font-bold text-[var(--foreground)] truncate">
                            {vendor.vendorName} — {t("openBillsDrilldown")}
                        </DialogTitle>
                        <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">
                            {t("totalOutstanding")}: <span className="font-bold text-[var(--foreground)]">{formatINR(vendor.totalOutstanding)}</span> ({bills.length} {t("billsCount")})
                        </p>
                        <DialogDescription className="sr-only">
                            {t("openBillsDrilldown")}
                        </DialogDescription>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            onOpenChange(false);
                            onOpenStatement(vendor);
                        }}
                        className="px-3 py-1.5 rounded-xl text-[12px] font-medium bg-[var(--primary)] text-white hover:opacity-90 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm"
                    >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{t("viewStatement")}</span>
                    </button>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-3 sm:p-5 min-h-0 scrollbar-hide space-y-3">
                    {bills.length === 0 ? (
                        <div className="py-12 text-center text-sm text-[var(--muted-foreground)]">
                            {t("noOpenBills")}
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {/* Desktop Table View */}
                            <div className="hidden md:block rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                                <table className="w-full text-left border-collapse text-[13px]">
                                    <thead>
                                        <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-[11px] font-semibold uppercase text-[var(--muted-foreground)]">
                                            <th className="py-2.5 px-3">{t("billNumber")}</th>
                                            <th className="py-2.5 px-3">{t("invoiceNumber")}</th>
                                            <th className="py-2.5 px-3">{t("billDate")}</th>
                                            <th className="py-2.5 px-3">{t("dueDate")}</th>
                                            <th className="py-2.5 px-3">{t("agingBucket")}</th>
                                            <th className="py-2.5 px-3 text-right">{t("payableAmount")}</th>
                                            <th className="py-2.5 px-3 text-right">{t("paid")}</th>
                                            <th className="py-2.5 px-3 text-right">{t("balanceDue")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {bills.map((bill) => (
                                            <tr key={bill.billId} className="hover:bg-[var(--accent)]/50 transition-colors">
                                                <td className="py-2.5 px-3 font-semibold text-[var(--foreground)] tabular-nums">
                                                    {bill.billNumber}
                                                    {bill.tdsAmount && bill.tdsAmount > 0 ? (
                                                        <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                                                            TDS: ₹{bill.tdsAmount.toLocaleString("en-IN")}
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td className="py-2.5 px-3 text-[var(--muted-foreground)]">
                                                    {bill.vendorInvoiceNumber || "—"}
                                                </td>
                                                <td className="py-2.5 px-3 tabular-nums text-[var(--muted-foreground)]">
                                                    {bill.billDate}
                                                </td>
                                                <td className="py-2.5 px-3 tabular-nums text-[var(--muted-foreground)]">
                                                    {bill.dueDate}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    {getBucketBadge(bill.bucket, bill.daysPastDue)}
                                                </td>
                                                <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                                                    {formatINR(bill.payableAmount)}
                                                </td>
                                                <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                                                    {bill.paidAmount > 0 ? formatINR(bill.paidAmount) : "—"}
                                                </td>
                                                <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[var(--foreground)]">
                                                    {formatINR(bill.balance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-2.5">
                                {bills.map((bill) => (
                                    <div
                                        key={bill.billId}
                                        className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-2 min-w-0"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-[13px] text-[var(--foreground)]">
                                                {bill.billNumber}
                                            </span>
                                            {getBucketBadge(bill.bucket, bill.daysPastDue)}
                                        </div>

                                        {bill.vendorInvoiceNumber && (
                                            <p className="text-[12px] text-[var(--muted-foreground)]">
                                                {t("invoiceNumber")}: <span className="text-[var(--foreground)] font-medium">{bill.vendorInvoiceNumber}</span>
                                            </p>
                                        )}

                                        <div className="grid grid-cols-2 gap-2 text-[12px] pt-1 border-t border-[var(--border)]">
                                            <div>
                                                <span className="text-[var(--muted-foreground)] block text-[11px]">{t("billDate")}:</span>
                                                <span className="tabular-nums font-medium">{bill.billDate}</span>
                                            </div>
                                            <div>
                                                <span className="text-[var(--muted-foreground)] block text-[11px]">{t("dueDate")}:</span>
                                                <span className="tabular-nums font-medium">{bill.dueDate}</span>
                                            </div>
                                            <div>
                                                <span className="text-[var(--muted-foreground)] block text-[11px]">{t("payableAmount")}:</span>
                                                <span className="tabular-nums font-medium">{formatINR(bill.payableAmount)}</span>
                                            </div>
                                            <div>
                                                <span className="text-[var(--muted-foreground)] block text-[11px]">{t("balanceDue")}:</span>
                                                <span className="tabular-nums font-bold text-[var(--foreground)]">{formatINR(bill.balance)}</span>
                                            </div>
                                        </div>

                                        {bill.tdsAmount && bill.tdsAmount > 0 ? (
                                            <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                                TDS {bill.tdsSection ? t("tdsSectionSuffix", { sec: bill.tdsSection }) : ""}: ₹{bill.tdsAmount.toLocaleString("en-IN")}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
