"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/hooks/useFormatters";
import { exportWorkbook } from "@/lib/excel-export";
import { EnterpriseDataTable } from "@/components/EnterpriseDataTable";
import { MobileTableCards, type MobileField } from "@/components/ui/MobileTableCards";
import { StatWidget } from "@/components/ui/StatWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorStatementDialog } from "@/components/reports/VendorStatementDialog";
import { VendorBillsDrilldownDialog } from "@/components/reports/VendorBillsDrilldownDialog";
import { ColumnDef } from "@tanstack/react-table";
import {
    type AgingVendorRow,
    type PayablesAgingResult,
    toKolkataDateString,
} from "@/lib/reports/payables";
import {
    Calendar,
    FileSpreadsheet,
    Wallet,
    AlertCircle,
    AlertTriangle,
    Clock,
    Eye,
    ReceiptText,
    MoreVertical,
    FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/styles/animations";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PayablesAgingPage() {
    const t = useTranslations("payables");
    const { formatINR } = useFormatters();

    const [asOf, setAsOf] = useState<string>(toKolkataDateString(new Date()) || "2026-10-02");
    const [data, setData] = useState<PayablesAgingResult | null>(null);
    const [loading, setLoading] = useState(true);

    // Selected vendor for Statement Dialog
    const [selectedVendorForStatement, setSelectedVendorForStatement] = useState<AgingVendorRow | null>(null);
    const [isStatementDialogOpen, setIsStatementDialogOpen] = useState(false);

    // Selected vendor for Bills Drilldown Dialog
    const [selectedVendorForDrilldown, setSelectedVendorForDrilldown] = useState<AgingVendorRow | null>(null);
    const [isDrilldownDialogOpen, setIsDrilldownDialogOpen] = useState(false);

    const fetchAging = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/payables-aging?asOf=${encodeURIComponent(asOf)}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || t("failedToLoadAging"));
            }
            const json: PayablesAgingResult = await res.json();
            setData(json);
        } catch (err: any) {
            console.error("Error fetching payables aging report:", err);
            toast.error(err.message || t("failedToLoadAging"));
        } finally {
            setLoading(false);
        }
    }, [asOf, t]);

    useEffect(() => {
        fetchAging();
    }, [fetchAging]);

    const handleOpenStatement = (row: AgingVendorRow) => {
        setSelectedVendorForStatement(row);
        setIsStatementDialogOpen(true);
    };

    const handleOpenDrilldown = (row: AgingVendorRow) => {
        setSelectedVendorForDrilldown(row);
        setIsDrilldownDialogOpen(true);
    };

    const handleExportExcel = () => {
        if (!data || data.rows.length === 0) {
            toast.error(t("noPayables"));
            return;
        }

        const sheetData: any[] = data.rows.map((r) => ({
            vendorName: r.vendorName,
            vendorGstin: r.vendorGstin || "",
            vendorPhone: r.vendorPhone || "",
            notDue: r.notDue,
            days1_30: r.days1_30,
            days31_60: r.days31_60,
            days61_90: r.days61_90,
            days90Plus: r.days90Plus,
            totalOutstanding: r.totalOutstanding,
            billsCount: r.billsCount,
        }));

        // Add totals row
        sheetData.push({
            vendorName: t("totalUpper"),
            vendorGstin: "",
            vendorPhone: "",
            notDue: data.totals.notDue,
            days1_30: data.totals.days1_30,
            days31_60: data.totals.days31_60,
            days61_90: data.totals.days61_90,
            days90Plus: data.totals.days90Plus,
            totalOutstanding: data.totals.totalOutstanding,
            billsCount: data.meta.totalOpenBillsCount,
        });

        exportWorkbook(`Payables_Aging_${asOf}.xlsx`, [
            {
                sheetName: "Payables Aging",
                data: sheetData,
                columns: [
                    { header: t("vendor"), key: "vendorName" },
                    { header: "GSTIN", key: "vendorGstin" },
                    { header: t("phone"), key: "vendorPhone" },
                    { header: t("notDue"), key: "notDue" },
                    { header: "1–30 Days", key: "days1_30" },
                    { header: "31–60 Days", key: "days31_60" },
                    { header: "61–90 Days", key: "days61_90" },
                    { header: "90+ Days", key: "days90Plus" },
                    { header: t("totalOutstanding"), key: "totalOutstanding" },
                    { header: t("billsCount"), key: "billsCount" },
                ],
            },
        ]);
        toast.success(t("exportExcel"));
    };

    // ─── Table Columns ────────────────────────────────────────────

    const columns = useMemo<ColumnDef<AgingVendorRow>[]>(
        () => [
            {
                accessorKey: "vendorName",
                header: t("vendor"),
                cell: ({ row }) => (
                    <div className="min-w-0 max-w-[200px]">
                        <p className="font-semibold text-[13px] text-[var(--foreground)] truncate">
                            {row.original.vendorName}
                        </p>
                        {row.original.vendorGstin && (
                            <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                                GSTIN: {row.original.vendorGstin}
                            </p>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: "notDue",
                header: () => <div className="text-right">{t("notDue")}</div>,
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums text-[var(--muted-foreground)]">
                        {row.original.notDue > 0 ? formatINR(row.original.notDue) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "days1_30",
                header: () => <div className="text-right">1–30 d</div>,
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-medium text-amber-600 dark:text-amber-400">
                        {row.original.days1_30 > 0 ? formatINR(row.original.days1_30) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "days31_60",
                header: () => <div className="text-right">31–60 d</div>,
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-medium text-orange-600 dark:text-orange-400">
                        {row.original.days31_60 > 0 ? formatINR(row.original.days31_60) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "days61_90",
                header: () => <div className="text-right">61–90 d</div>,
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                        {row.original.days61_90 > 0 ? formatINR(row.original.days61_90) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "days90Plus",
                header: () => <div className="text-right">90+ d</div>,
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-bold text-red-600 dark:text-red-400">
                        {row.original.days90Plus > 0 ? formatINR(row.original.days90Plus) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "totalOutstanding",
                header: () => <div className="text-right">{t("totalOutstanding")}</div>,
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-bold text-[var(--foreground)]">
                        {formatINR(row.original.totalOutstanding)}
                    </div>
                ),
            },
            {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                    <div className="flex justify-end items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => handleOpenDrilldown(row.original)}
                            title={t("viewBills")}
                            className="px-2.5 py-1 rounded-lg text-[12px] font-medium bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        >
                            <FileText className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                            <span className="hidden sm:inline">{t("bills")}</span>
                            <span className="text-[10px] text-[var(--muted-foreground)] ml-0.5 tabular-nums">({row.original.billsCount})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenStatement(row.original)}
                            title={t("viewStatement")}
                            className="px-2.5 py-1 rounded-lg text-[12px] font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{t("statement")}</span>
                        </button>
                    </div>
                ),
            },
        ],
        [t, formatINR]
    );

    const mobileFields = useMemo<MobileField<AgingVendorRow>[]>(
        () => [
            {
                key: "vendorName",
                label: t("vendor"),
                primary: true,
            },
            {
                key: "totalOutstanding",
                label: t("totalOutstanding"),
                render: (v) => <span className="font-bold text-[var(--foreground)]">{formatINR(v)}</span>,
            },
            {
                key: "notDue",
                label: t("notDue"),
                render: (v) => (v > 0 ? formatINR(v) : "—"),
            },
            {
                key: "days90Plus",
                label: "90+ d",
                render: (v) => (v > 0 ? <span className="text-red-500 font-semibold">{formatINR(v)}</span> : "—"),
            },
        ],
        [t, formatINR]
    );

    return (
        <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="w-full min-w-0 overflow-x-clip space-y-6"
        >
            {/* ─── Header & Date Selector ────────────────────────────── */}
            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
                        <Clock className="h-6 w-6 text-amber-500 shrink-0" />
                        {t("payablesTitle")}
                    </h1>
                    <p className="text-[13px] text-[var(--muted-foreground)] mt-1">
                        {t("payablesSubtitle")}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <div className="flex items-center gap-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                        <span className="text-[12px] font-medium text-[var(--muted-foreground)]">As-of:</span>
                        <input
                            type="date"
                            value={asOf}
                            onChange={(e) => setAsOf(e.target.value)}
                            className="bg-transparent text-[13px] font-semibold text-[var(--foreground)] outline-none border-none cursor-pointer"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleExportExcel}
                        disabled={loading || !data}
                        className="h-9 px-3 rounded-xl bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] flex items-center gap-1.5 text-[13px] font-medium transition-all disabled:opacity-50 cursor-pointer"
                    >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{t("exportExcel")}</span>
                    </button>
                </div>
            </motion.div>

            {/* ─── StatWidget KPI Row ───────────────────────────────── */}
            <motion.div variants={staggerItem} className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full min-w-0">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-[20px]" />
                    ))
                ) : data ? (
                    <>
                        <StatWidget
                            label={t("totalOutstanding")}
                            value={data.kpis.totalOutstanding}
                            displayValue={formatINR(data.kpis.totalOutstanding)}
                            icon={Wallet}
                            color="blue"
                        />
                        <StatWidget
                            label={t("overdue")}
                            value={data.kpis.overdue}
                            displayValue={formatINR(data.kpis.overdue)}
                            icon={AlertCircle}
                            color="orange"
                        />
                        <StatWidget
                            label={t("overdue90Plus")}
                            value={data.kpis.overdue90Plus}
                            displayValue={formatINR(data.kpis.overdue90Plus)}
                            icon={AlertTriangle}
                            color="red"
                        />
                        <StatWidget
                            label={t("notDue")}
                            value={data.kpis.notDue}
                            displayValue={formatINR(data.kpis.notDue)}
                            icon={Clock}
                            color="green"
                        />
                    </>
                ) : null}
            </motion.div>

            {/* ─── Aging Table / Mobile Cards / Empty State ─────────── */}
            <motion.div variants={staggerItem} className="w-full min-w-0">
                {loading ? (
                    <div className="p-8 text-center bg-[var(--card)] border border-[var(--border)] rounded-2xl">
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                ) : !data || data.rows.length === 0 ? (
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                        <EmptyState
                            icon="⏱️"
                            title={t("noPayables")}
                            description={t("noPayablesDesc")}
                        />
                    </div>
                ) : (
                    <div className="space-y-4 w-full min-w-0">
                        {/* Desktop Table */}
                        <div className="hidden md:block rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden min-w-0">
                            <EnterpriseDataTable
                                columns={columns}
                                data={data.rows}
                                searchColumn="vendorName"
                                searchPlaceholder={`${t("vendor")}...`}
                                showBulkActions={false}
                            />
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden">
                            <MobileTableCards
                                data={data.rows}
                                fields={mobileFields}
                                keyExtractor={(item) => item.vendorId}
                                actionsTrigger={(row) => (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)]">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleOpenDrilldown(row)}>
                                                <FileText className="mr-2 h-4 w-4" /> {t("viewBills")} ({row.billsCount})
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleOpenStatement(row)}>
                                                <Eye className="mr-2 h-4 w-4" /> {t("viewStatement")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            />
                        </div>
                    </div>
                )}
            </motion.div>

            {/* ─── Vendor Bills Drilldown Dialog ───────────────────── */}
            {selectedVendorForDrilldown && (
                <VendorBillsDrilldownDialog
                    open={isDrilldownDialogOpen}
                    onOpenChange={(open) => {
                        setIsDrilldownDialogOpen(open);
                        if (!open) setSelectedVendorForDrilldown(null);
                    }}
                    vendor={selectedVendorForDrilldown}
                    onOpenStatement={(vendor) => {
                        setSelectedVendorForStatement(vendor);
                        setIsStatementDialogOpen(true);
                    }}
                />
            )}

            {/* ─── Statement Dialog (opened from row action) ───────── */}
            {selectedVendorForStatement && (
                <VendorStatementDialog
                    open={isStatementDialogOpen}
                    onOpenChange={(open) => {
                        setIsStatementDialogOpen(open);
                        if (!open) setSelectedVendorForStatement(null);
                    }}
                    vendorId={selectedVendorForStatement.vendorId}
                    vendorName={selectedVendorForStatement.vendorName}
                    vendorPhone={selectedVendorForStatement.vendorPhone}
                />
            )}
        </motion.div>
    );
}
