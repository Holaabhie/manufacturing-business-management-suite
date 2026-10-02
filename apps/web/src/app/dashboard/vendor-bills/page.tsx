"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ReceiptText,
    Plus,
    Search,
    FileSpreadsheet,
    Clock,
    AlertCircle,
    CheckCircle2,
    Ban,
    Edit3,
    Eye,
    Building2,
    DollarSign,
    Layers,
    CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { StatWidget } from "@/components/ui/StatWidget";
import { MonthYearFilter, matchesMonthYear, type MonthYearFilterValue } from "@/components/ui/month-year-filter";
import { exportWorkbook } from "@/lib/excel-export";
import type { VendorBill, VendorBillListSummary, BillStatus } from "@/modules/vendor-bills/domain/types";
import { CreateBillModal } from "@/components/vendor-bills/CreateBillModal";
import { BillDetailModal } from "@/components/vendor-bills/BillDetailModal";
import { RecordVendorBillPaymentModal } from "@/components/vendor-bills/RecordVendorBillPaymentModal";

function VendorBillsContent() {
    const t = useTranslations("vendorBills");
    const tCommon = useTranslations("common");
    const searchParams = useSearchParams();
    const router = useRouter();

    const [bills, setBills] = useState<VendorBill[]>([]);
    const [summary, setSummary] = useState<VendorBillListSummary>({
        open_payable: 0,
        overdue: 0,
        due_in_7_days: 0,
        draft_count: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [activeTab, setActiveTab] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [monthYear, setMonthYear] = useState<MonthYearFilterValue>({
        month: "all",
        year: new Date().getFullYear(),
    });

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
    const [billToEdit, setBillToEdit] = useState<VendorBill | null>(null);
    const [paymentBill, setPaymentBill] = useState<VendorBill | null>(null);

    // Fetch bills and summary from API
    const loadBills = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/vendor-bills");
            if (!res.ok) throw new Error("Failed to load vendor bills");
            const data = await res.json();
            setBills(Array.isArray(data) ? data : data.bills || []);
            if (data.summary) {
                setSummary(data.summary);
            }
        } catch (err: any) {
            toast.error(err.message || t("errLoadBills"));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBills();
    }, [loadBills]);

    // Handle query params on mount (?action=new or ?new=true, or ?id=)
    useEffect(() => {
        const action = searchParams.get("action");
        const isNew = searchParams.get("new");
        const id = searchParams.get("id");

        if (action === "new" || isNew === "true") {
            setIsCreateOpen(true);
        }
        if (id) {
            setSelectedBillId(id);
        }
    }, [searchParams]);

    // Filter bills
    const filteredBills = useMemo(() => {
        return bills.filter((bill) => {
            // Tab filter
            if (activeTab === "Draft" && bill.status !== "Draft") return false;
            if (activeTab === "Open" && bill.status !== "Open") return false;
            if (activeTab === "Overdue" && !(bill.status === "Open" && bill.overdue)) return false;
            if (activeTab === "Paid" && bill.payment_status !== "Paid") return false;
            if (activeTab === "Void" && bill.status !== "Void") return false;

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchNumber = bill.bill_number.toLowerCase().includes(q);
                const matchVendor = bill.vendor.name.toLowerCase().includes(q);
                const matchInvoice = bill.vendor_invoice_number.toLowerCase().includes(q);
                if (!matchNumber && !matchVendor && !matchInvoice) return false;
            }

            // Month/Year filter
            if (!matchesMonthYear(bill.bill_date, monthYear)) {
                return false;
            }

            return true;
        });
    }, [bills, activeTab, searchQuery, monthYear]);

    // Excel Export
    const handleExportExcel = () => {
        if (filteredBills.length === 0) {
            toast.error(t("emptyTitle"));
            return;
        }

        let totalSubtotal = 0;
        let totalTax = 0;
        let totalGrandTotal = 0;
        let totalTds = 0;
        let totalPayable = 0;
        let totalPaid = 0;
        let totalBalance = 0;

        const sheetData: Array<{
            bill_number: string;
            vendor_name: string;
            vendor_invoice_number: string;
            bill_date: string;
            due_date: string;
            status: string;
            payment_status: string;
            subtotal: number;
            total_tax: number;
            grand_total: number;
            tds_amount: number;
            payable_amount: number;
            paid_total: number;
            balance: number;
        }> = filteredBills.map((b) => {
            totalSubtotal += b.subtotal;
            totalTax += b.total_tax;
            totalGrandTotal += b.grand_total;
            totalTds += b.tds?.amount || 0;
            totalPayable += b.payable_amount;
            totalPaid += b.paid_total;
            totalBalance += b.balance || 0;

            return {
                bill_number: b.bill_number,
                vendor_name: b.vendor.name,
                vendor_invoice_number: b.vendor_invoice_number,
                bill_date: b.bill_date,
                due_date: b.due_date,
                status: b.status,
                payment_status: b.payment_status || "Unpaid",
                subtotal: b.subtotal,
                total_tax: b.total_tax,
                grand_total: b.grand_total,
                tds_amount: b.tds?.amount || 0,
                payable_amount: b.payable_amount,
                paid_total: b.paid_total,
                balance: b.balance || 0,
            };
        });

        // Totals row
        sheetData.push({
            bill_number: "TOTALS",
            vendor_name: "",
            vendor_invoice_number: "",
            bill_date: "",
            due_date: "",
            status: "",
            payment_status: "",
            subtotal: Math.round(totalSubtotal * 100) / 100,
            total_tax: Math.round(totalTax * 100) / 100,
            grand_total: Math.round(totalGrandTotal * 100) / 100,
            tds_amount: Math.round(totalTds * 100) / 100,
            payable_amount: Math.round(totalPayable * 100) / 100,
            paid_total: Math.round(totalPaid * 100) / 100,
            balance: Math.round(totalBalance * 100) / 100,
        });

        exportWorkbook(`Vendor_Bills_${new Date().toISOString().split("T")[0]}.xlsx`, [
            {
                sheetName: "Vendor Bills",
                data: sheetData,
                columns: [
                    { header: "Bill #", key: "bill_number" },
                    { header: "Vendor", key: "vendor_name" },
                    { header: "Vendor Inv #", key: "vendor_invoice_number" },
                    { header: "Bill Date", key: "bill_date" },
                    { header: "Due Date", key: "due_date" },
                    { header: "Status", key: "status" },
                    { header: "Payment Status", key: "payment_status" },
                    { header: "Subtotal", key: "subtotal" },
                    { header: "Total GST", key: "total_tax" },
                    { header: "Grand Total", key: "grand_total" },
                    { header: "TDS", key: "tds_amount" },
                    { header: "Payable", key: "payable_amount" },
                    { header: "Paid", key: "paid_total" },
                    { header: "Balance", key: "balance" },
                ],
            },
        ]);

        toast.success(tCommon("export"));
    };

    const tabs = [
        { key: "all", label: t("filterAll") },
        { key: "Draft", label: t("filterDraft") },
        { key: "Open", label: t("filterOpen") },
        { key: "Overdue", label: t("filterOverdue") },
        { key: "Paid", label: t("filterPaid") },
        { key: "Void", label: t("filterVoid") },
    ];

    return (
        <div className="w-full min-w-0 overflow-x-hidden space-y-6 hero-glow max-w-7xl mx-auto p-4 sm:p-6 pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
                        <ReceiptText className="w-6 h-6 text-emerald-500" />
                        <span>{t("title")}</span>
                    </h1>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {t("subtitle")}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="px-3 py-2 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>{tCommon("export")}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setBillToEdit(null);
                            setIsCreateOpen(true);
                        }}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t("btnCreateBill")}</span>
                    </button>
                </div>
            </div>

            {/* KPI Stat Widgets Grid */}
            <div className="min-w-0 w-full overflow-hidden">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <StatWidget
                        label={t("cardOpenPayable")}
                        value={summary.open_payable}
                        displayValue={`₹${summary.open_payable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        icon={CreditCard}
                        color="green"
                    />
                    <StatWidget
                        label={t("cardOverdue")}
                        value={summary.overdue}
                        displayValue={`₹${summary.overdue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        icon={Clock}
                        color="red"
                    />
                    <StatWidget
                        label={t("cardDue7Days")}
                        value={summary.due_in_7_days}
                        displayValue={`₹${summary.due_in_7_days.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        icon={AlertCircle}
                        color="orange"
                    />
                    <StatWidget
                        label={t("cardDrafts")}
                        value={summary.draft_count}
                        icon={Layers}
                        color="blue"
                    />
                </div>
            </div>

            {/* Filters Row: Status Tabs + Search + MonthYear */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-1 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)] shrink-0">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
                                    activeTab === tab.key
                                        ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm font-semibold"
                                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Month Year Filter */}
                    <div className="shrink-0">
                        <MonthYearFilter
                            value={monthYear}
                            onChange={setMonthYear}
                        />
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t("searchPlaceholder")}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                    />
                </div>
            </div>

            {/* Content: Table & Mobile Cards */}
            {isLoading ? (
                <div className="p-12 text-center text-xs text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
                    {t("loadingFallback")}
                </div>
            ) : filteredBills.length === 0 ? (
                /* Empty State */
                <div className="p-12 text-center space-y-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
                        <ReceiptText className="w-6 h-6" />
                    </div>
                    <div className="max-w-xs mx-auto">
                        <h3 className="text-sm font-bold text-[var(--foreground)]">
                            {t("emptyTitle")}
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {t("emptyDescription")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setBillToEdit(null);
                            setIsCreateOpen(true);
                        }}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm inline-flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t("btnCreateFirstBill")}</span>
                    </button>
                </div>
            ) : (
                <>
                    {/* Desktop Table (hidden on mobile) */}
                    <div className="hidden md:block rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
                        <table className="w-full table-fixed text-left text-xs">
                            <thead className="bg-[var(--muted)]/50 text-[var(--muted-foreground)] uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                                <tr>
                                    <th className="p-3 w-[140px]">{t("thBillNumber")}</th>
                                    <th className="p-3 w-[180px]">{t("thVendor")}</th>
                                    <th className="p-3 w-[130px]">{t("thVendorInvoice")}</th>
                                    <th className="p-3 w-[100px]">{t("thBillDate")}</th>
                                    <th className="p-3 w-[100px]">{t("thDueDate")}</th>
                                    <th className="p-3 w-[110px] text-right">{t("thPayable")}</th>
                                    <th className="p-3 w-[110px] text-right">{t("thBalance")}</th>
                                    <th className="p-3 w-[90px] text-center">{t("thStatus")}</th>
                                    <th className="p-3 w-[110px] text-center">{t("thPaymentStatus")}</th>
                                    <th className="p-3 w-[100px] text-right">{t("thActions")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {filteredBills.map((b) => (
                                    <tr
                                        key={b.id}
                                        onClick={() => setSelectedBillId(b.id)}
                                        className="hover:bg-[var(--muted)]/30 cursor-pointer transition-colors"
                                    >
                                        <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">
                                            <div className="min-w-0 truncate">{b.bill_number}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-medium text-[var(--foreground)] min-w-0 truncate">
                                                {b.vendor.name}
                                            </div>
                                        </td>
                                        <td className="p-3 text-[var(--muted-foreground)] font-mono">
                                            <div className="min-w-0 truncate">{b.vendor_invoice_number}</div>
                                        </td>
                                        <td className="p-3 text-[var(--muted-foreground)]">
                                            {b.bill_date}
                                        </td>
                                        <td className="p-3">
                                            <span
                                                className={cn(
                                                    b.status === "Open" && b.overdue
                                                        ? "text-rose-500 font-bold"
                                                        : "text-[var(--muted-foreground)]"
                                                )}
                                            >
                                                {b.due_date}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-medium text-[var(--foreground)]">
                                            ₹{b.payable_amount.toFixed(2)}
                                        </td>
                                        <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                            ₹{(b.balance ?? 0).toFixed(2)}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span
                                                className={cn(
                                                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                    b.status === "Open"
                                                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                                        : b.status === "Void"
                                                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                                )}
                                            >
                                                {b.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span
                                                className={cn(
                                                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                                                    b.payment_status === "Paid"
                                                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                                        : b.payment_status === "Partially Paid"
                                                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                                            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                                                )}
                                            >
                                                {b.payment_status || "Unpaid"}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedBillId(b.id)}
                                                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                                                title={t("actionView")}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards (shown on mobile, hidden on desktop) */}
                    <div className="md:hidden space-y-3">
                        {filteredBills.map((b) => (
                            <div
                                key={b.id}
                                onClick={() => setSelectedBillId(b.id)}
                                className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-3 cursor-pointer active:scale-[0.99] transition-transform shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            {b.bill_number}
                                        </div>
                                        <div className="text-sm font-semibold text-[var(--foreground)] mt-0.5">
                                            {b.vendor.name}
                                        </div>
                                        <div className="text-[11px] text-[var(--muted-foreground)] font-mono">
                                            Inv: {b.vendor_invoice_number}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        <span
                                            className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                b.status === "Open"
                                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                                    : b.status === "Void"
                                                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                            )}
                                        >
                                            {b.status}
                                        </span>
                                        {b.status === "Open" && b.overdue && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                {t("badgeOverdue")}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[var(--border)]/60">
                                    <div>
                                        <span className="text-[var(--muted-foreground)] text-[10px] block">Bill Date:</span>
                                        <span className="font-medium text-[var(--foreground)]">{b.bill_date}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[var(--muted-foreground)] text-[10px] block">Due Date:</span>
                                        <span
                                            className={cn(
                                                "font-medium",
                                                b.status === "Open" && b.overdue
                                                    ? "text-rose-500 font-bold"
                                                    : "text-[var(--foreground)]"
                                            )}
                                        >
                                            {b.due_date}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[var(--muted-foreground)] text-[10px] block">Payable:</span>
                                        <span className="font-semibold text-[var(--foreground)]">₹{b.payable_amount.toFixed(2)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[var(--muted-foreground)] text-[10px] block">Balance:</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            ₹{(b.balance ?? 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Create / Edit Bill Modal */}
            {isCreateOpen && (
                <CreateBillModal
                    open={isCreateOpen}
                    onClose={() => {
                        setIsCreateOpen(false);
                        setBillToEdit(null);
                    }}
                    onSuccess={(bill) => {
                        loadBills();
                        setSelectedBillId(bill.id);
                    }}
                    billToEdit={billToEdit}
                />
            )}

            {/* Bill Details Modal */}
            {selectedBillId && (
                <BillDetailModal
                    open={Boolean(selectedBillId)}
                    onClose={() => setSelectedBillId(null)}
                    billId={selectedBillId}
                    onEdit={(bill) => {
                        setBillToEdit(bill);
                        setIsCreateOpen(true);
                    }}
                    onRefresh={loadBills}
                />
            )}
        </div>
    );
}

function VendorBillsLoading() {
    const t = useTranslations("vendorBills");
    return <div className="p-6 text-sm text-[var(--muted-foreground)]">{t("loadingFallback")}</div>;
}

export default function VendorBillsPage() {
    return (
        <Suspense fallback={<VendorBillsLoading />}>
            <VendorBillsContent />
        </Suspense>
    );
}
