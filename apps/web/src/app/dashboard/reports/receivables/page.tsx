"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/hooks/useFormatters";
import { exportWorkbook } from "@/lib/excel-export";
import { EnterpriseDataTable } from "@/components/EnterpriseDataTable";
import { StatWidget } from "@/components/ui/StatWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { StatementDialog } from "@/components/reports/StatementDialog";
import { ColumnDef } from "@tanstack/react-table";
import {
    type AgingClientRow,
    type ReceivablesAgingResult,
    toKolkataDateString,
} from "@/lib/reports/receivables";
import {
    Calendar,
    FileSpreadsheet,
    FileText,
    Wallet,
    AlertCircle,
    AlertTriangle,
    Coins,
    ArrowUpRight,
    Eye,
    MoreVertical,
    Clock,
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

export default function ReceivablesAgingPage() {
    const t = useTranslations("statements");
    const { formatINR } = useFormatters();

    const [asOf, setAsOf] = useState<string>(toKolkataDateString(new Date()) || "2026-09-29");
    const [data, setData] = useState<ReceivablesAgingResult | null>(null);
    const [loading, setLoading] = useState(true);

    // Selected client for Statement Dialog
    const [selectedClientForStatement, setSelectedClientForStatement] = useState<AgingClientRow | null>(null);
    const [isStatementDialogOpen, setIsStatementDialogOpen] = useState(false);

    const fetchAging = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/receivables-aging?as_of=${encodeURIComponent(asOf)}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to load receivables aging");
            }
            const json: ReceivablesAgingResult = await res.json();
            setData(json);
        } catch (err: any) {
            console.error("Error fetching aging report:", err);
            toast.error(err.message || "Failed to load receivables aging");
        } finally {
            setLoading(false);
        }
    }, [asOf]);

    useEffect(() => {
        fetchAging();
    }, [fetchAging]);

    const handleOpenStatement = (row: AgingClientRow) => {
        if (row.clientId === "unassigned") {
            toast.info("Cannot open statement for unassigned client");
            return;
        }
        setSelectedClientForStatement(row);
        setIsStatementDialogOpen(true);
    };

    const handleExportExcel = () => {
        if (!data || data.rows.length === 0) {
            toast.error(t("noReceivables"));
            return;
        }

        const sheetData = data.rows.map((r) => ({
            clientName: r.clientName,
            clientCompany: r.clientCompany,
            notDue: r.notDue,
            days1_30: r.days1_30,
            days31_60: r.days31_60,
            days61_90: r.days61_90,
            days90Plus: r.days90Plus,
            totalOutstanding: r.totalOutstanding,
            unallocatedCredit: r.unallocatedCredit,
            netReceivable: r.netReceivable,
        }));

        // Add totals row
        sheetData.push({
            clientName: "TOTAL",
            clientCompany: "",
            notDue: data.totals.notDue,
            days1_30: data.totals.days1_30,
            days31_60: data.totals.days31_60,
            days61_90: data.totals.days61_90,
            days90Plus: data.totals.days90Plus,
            totalOutstanding: data.totals.totalOutstanding,
            unallocatedCredit: data.totals.unallocatedCredit,
            netReceivable: data.totals.netReceivable,
        });

        exportWorkbook(`Receivables_Aging_${asOf}.xlsx`, [
            {
                sheetName: "Receivables Aging",
                data: sheetData,
                columns: [
                    { header: "Client", key: "clientName" },
                    { header: "Company", key: "clientCompany" },
                    { header: "Not Due", key: "notDue" },
                    { header: "1–30 Days", key: "days1_30" },
                    { header: "31–60 Days", key: "days31_60" },
                    { header: "61–90 Days", key: "days61_90" },
                    { header: "90+ Days", key: "days90Plus" },
                    { header: "Total Outstanding", key: "totalOutstanding" },
                    { header: "Unallocated Credit", key: "unallocatedCredit" },
                    { header: "Net Receivable", key: "netReceivable" },
                ],
            },
        ]);
        toast.success(t("exportExcel"));
    };

    // ─── Table Columns ────────────────────────────────────────────

    const columns = useMemo<ColumnDef<AgingClientRow>[]>(
        () => [
            {
                accessorKey: "clientName",
                header: t("client"),
                meta: {
                    headerClassName: "sticky left-0 z-20 bg-[var(--card)] shadow-[1px_0_0_0_var(--border)] min-w-[150px] max-w-[180px]",
                    cellClassName: "sticky left-0 z-10 bg-[var(--card)] shadow-[1px_0_0_0_var(--border)] min-w-[150px] max-w-[180px]",
                },
                cell: ({ row }) => (
                    <div className="min-w-0 max-w-[170px]">
                        <p className="font-semibold text-[13px] text-[var(--foreground)] truncate">
                            {row.original.clientName}
                        </p>
                        {row.original.clientCompany && (
                            <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                                {row.original.clientCompany}
                            </p>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: "notDue",
                header: () => <div className="text-right">{t("notDue")}</div>,
                meta: { align: "right" },
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums text-[var(--muted-foreground)]">
                        {row.original.notDue > 0 ? formatINR(row.original.notDue) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "days1_30",
                header: () => <div className="text-right">{t("bucket1_30d")}</div>,
                meta: { align: "right" },
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-medium text-amber-600 dark:text-amber-400">
                        {row.original.days1_30 > 0 ? formatINR(row.original.days1_30) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "days31_60",
                header: () => <div className="text-right">{t("bucket31_60d")}</div>,
                meta: { align: "right" },
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-medium text-orange-600 dark:text-orange-400">
                        {row.original.days31_60 > 0 ? formatINR(row.original.days31_60) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "days61_90",
                header: () => <div className="text-right">{t("bucket61_90d")}</div>,
                meta: { align: "right" },
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                        {row.original.days61_90 > 0 ? formatINR(row.original.days61_90) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "days90Plus",
                header: () => <div className="text-right">{t("bucket90PlusD")}</div>,
                meta: { align: "right" },
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-bold text-red-600 dark:text-red-400">
                        {row.original.days90Plus > 0 ? formatINR(row.original.days90Plus) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "totalOutstanding",
                header: () => <div className="text-right">{t("total")}</div>,
                meta: { align: "right" },
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-semibold text-[var(--foreground)]">
                        {formatINR(row.original.totalOutstanding)}
                    </div>
                ),
            },
            {
                accessorKey: "unallocatedCredit",
                header: () => <div className="text-right">{t("unappliedCredit")}</div>,
                meta: { align: "right" },
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums text-emerald-600 dark:text-emerald-400">
                        {row.original.unallocatedCredit > 0 ? formatINR(row.original.unallocatedCredit) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "netReceivable",
                header: () => (
                    <div className="text-right flex items-center justify-end gap-1 cursor-help" title={t("netTooltip")}>
                        <span>{t("net")}</span>
                    </div>
                ),
                meta: { align: "right" },
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-bold text-[var(--foreground)]" title={t("netTooltip")}>
                        {formatINR(row.original.netReceivable)}
                    </div>
                ),
            },
            {
                id: "actions",
                header: "",
                meta: {
                    headerClassName: "w-[44px] text-right",
                    cellClassName: "w-[44px] text-right",
                },
                cell: ({ row }) => {
                    if (row.original.clientId === "unassigned") return null;
                    return (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => handleOpenStatement(row.original)}
                                title={t("viewStatement")}
                                className="p-1.5 rounded-lg text-[11px] font-medium bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] transition-all flex items-center gap-1 cursor-pointer shrink-0"
                            >
                                <Eye className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                                <span className="hidden 2xl:inline">{t("statement")}</span>
                            </button>
                        </div>
                    );
                },
            },
        ],
        [t, formatINR]
    );


    return (
        <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="w-full min-w-0 overflow-x-clip space-y-4 sm:space-y-6"
        >
            {/* ─── Header & Date Selector ────────────────────────────── */}
            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
                        <Clock className="h-6 w-6 text-amber-500 shrink-0" />
                        {t("receivablesTitle")}
                    </h1>
                    <p className="text-[13px] text-[var(--muted-foreground)] mt-1">
                        {t("receivablesSubtitle")}
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap xs:flex-nowrap min-w-0">
                    <div className="flex-1 xs:flex-initial h-11 px-3.5 bg-[var(--card)] border border-[var(--border)] rounded-xl flex items-center gap-2 min-w-0">
                        <Calendar className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                        <span className="text-xs font-medium text-[var(--muted-foreground)] shrink-0">{t("asOf")}:</span>
                        <input
                            type="date"
                            value={asOf}
                            onChange={(e) => setAsOf(e.target.value)}
                            className="bg-transparent text-xs sm:text-sm font-semibold text-[var(--foreground)] outline-none border-none cursor-pointer min-w-0"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleExportExcel}
                        disabled={loading || !data}
                        className="h-11 px-3.5 rounded-xl bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] flex items-center justify-center gap-2 text-xs sm:text-sm font-medium transition-all disabled:opacity-50 cursor-pointer shrink-0"
                    >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{t("exportExcel")}</span>
                    </button>
                </div>
            </motion.div>

            {/* ─── Summary / KPI Section ───────────────────────────── */}
            <motion.div variants={staggerItem} className="w-full min-w-0">
                {/* Desktop 4-Card KPI Grid */}
                <div className="hidden md:grid md:grid-cols-4 gap-3 w-full min-w-0">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-[174px] w-full rounded-[20px]" />
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
                                label={t("unallocatedCredit")}
                                value={data.kpis.unallocatedCredit}
                                displayValue={formatINR(data.kpis.unallocatedCredit)}
                                icon={Coins}
                                color="green"
                            />
                        </>
                    ) : null}
                </div>

                {/* Mobile Compact Summary Strip (h ~56px) */}
                <div className="md:hidden w-full min-w-0">
                    {loading ? (
                        <Skeleton className="h-16 w-full rounded-2xl" />
                    ) : data ? (
                        <div className="w-full min-w-0 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)] block truncate">
                                    {t("totalOutstanding")}
                                </span>
                                <span className="text-lg font-bold tracking-tight text-[var(--foreground)] block truncate">
                                    {formatINR(data.kpis.totalOutstanding)}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-[var(--border)] shrink-0" />
                            <div className="min-w-0 flex-1 text-right">
                                <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)] block truncate">
                                    {t("overdue")}
                                </span>
                                <span className="text-base font-bold tracking-tight text-amber-600 dark:text-amber-400 block truncate">
                                    {formatINR(data.kpis.overdue)}
                                </span>
                            </div>
                        </div>
                    ) : null}
                </div>
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
                            title={t("noReceivables")}
                            description={t("noReceivablesDesc")}
                        />
                    </div>
                ) : (
                    <div className="space-y-4 w-full min-w-0">
                        {/* Desktop Table */}
                        <div className="hidden md:block rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden min-w-0">
                            <EnterpriseDataTable
                                columns={columns}
                                data={data.rows}
                                searchColumn="clientName"
                                searchPlaceholder={`${t("client")}...`}
                                showBulkActions={false}
                            />
                        </div>

                        {/* Mobile Full-Width Party Cards */}
                        <div className="md:hidden space-y-3 w-full min-w-0">
                            {data.rows.map((row) => (
                                <div
                                    key={row.clientId}
                                    className="w-full min-w-0 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3.5 space-y-3"
                                >
                                    {/* Header: Name + Menu */}
                                    <div className="flex items-start justify-between gap-2 min-w-0">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">
                                                {row.clientName}
                                            </h3>
                                            {row.clientCompany && row.clientCompany !== row.clientName && (
                                                <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                                                    {row.clientCompany}
                                                </p>
                                            )}
                                        </div>
                                        {row.clientId !== "unassigned" && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors shrink-0 cursor-pointer"
                                                        aria-label="Actions"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenStatement(row)}>
                                                        <Eye className="mr-2 h-4 w-4" /> {t("viewStatement")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>

                                    {/* Total Outstanding full-width row */}
                                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]/60 min-w-0">
                                        <span className="text-xs font-medium text-[var(--muted-foreground)] truncate">
                                            {t("totalOutstanding")}
                                        </span>
                                        <span className="text-sm font-bold text-[var(--foreground)] truncate">
                                            {formatINR(row.totalOutstanding)}
                                        </span>
                                    </div>

                                    {row.unallocatedCredit > 0 && (
                                        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium min-w-0">
                                            <span className="truncate">{t("unallocatedCredit")}</span>
                                            <span className="truncate font-semibold">-{formatINR(row.unallocatedCredit)}</span>
                                        </div>
                                    )}

                                    {/* 2-Column Bucket Grid: 5 buckets in fixed order */}
                                    <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                                        {/* 1. Not Due */}
                                        <div className={cn(
                                            "p-2.5 rounded-xl border flex flex-col justify-between min-h-[52px] min-w-0",
                                            row.notDue > 0
                                                ? "bg-[var(--muted)]/40 border-[var(--border)]"
                                                : "bg-[var(--muted)]/20 border-[var(--border)]/40"
                                        )}>
                                            <span className="text-[11px] font-medium leading-tight text-[var(--muted-foreground)] break-words">
                                                {t("notDue")}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-bold mt-1 truncate",
                                                row.notDue > 0 ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                                            )}>
                                                {row.notDue > 0 ? formatINR(row.notDue) : "—"}
                                            </span>
                                        </div>

                                        {/* 2. 1–30 Days */}
                                        <div className={cn(
                                            "p-2.5 rounded-xl border flex flex-col justify-between min-h-[52px] min-w-0",
                                            row.days1_30 > 0
                                                ? "bg-amber-500/10 border-amber-500/20"
                                                : "bg-[var(--muted)]/20 border-[var(--border)]/40"
                                        )}>
                                            <span className="text-[11px] font-medium leading-tight text-[var(--muted-foreground)] break-words">
                                                {t("days1_30")}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-bold mt-1 truncate",
                                                row.days1_30 > 0 ? "text-amber-600 dark:text-amber-400" : "text-[var(--muted-foreground)]"
                                            )}>
                                                {row.days1_30 > 0 ? formatINR(row.days1_30) : "—"}
                                            </span>
                                        </div>

                                        {/* 3. 31–60 Days */}
                                        <div className={cn(
                                            "p-2.5 rounded-xl border flex flex-col justify-between min-h-[52px] min-w-0",
                                            row.days31_60 > 0
                                                ? "bg-orange-500/10 border-orange-500/20"
                                                : "bg-[var(--muted)]/20 border-[var(--border)]/40"
                                        )}>
                                            <span className="text-[11px] font-medium leading-tight text-[var(--muted-foreground)] break-words">
                                                {t("days31_60")}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-bold mt-1 truncate",
                                                row.days31_60 > 0 ? "text-orange-600 dark:text-orange-400" : "text-[var(--muted-foreground)]"
                                            )}>
                                                {row.days31_60 > 0 ? formatINR(row.days31_60) : "—"}
                                            </span>
                                        </div>

                                        {/* 4. 61–90 Days */}
                                        <div className={cn(
                                            "p-2.5 rounded-xl border flex flex-col justify-between min-h-[52px] min-w-0",
                                            row.days61_90 > 0
                                                ? "bg-rose-500/10 border-rose-500/20"
                                                : "bg-[var(--muted)]/20 border-[var(--border)]/40"
                                        )}>
                                            <span className="text-[11px] font-medium leading-tight text-[var(--muted-foreground)] break-words">
                                                {t("days61_90")}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-bold mt-1 truncate",
                                                row.days61_90 > 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--muted-foreground)]"
                                            )}>
                                                {row.days61_90 > 0 ? formatINR(row.days61_90) : "—"}
                                            </span>
                                        </div>

                                        {/* 5. 90+ Days */}
                                        <div className={cn(
                                            "col-span-2 p-2.5 rounded-xl border flex items-center justify-between min-h-[44px] min-w-0",
                                            row.days90Plus > 0
                                                ? "bg-red-500/10 border-red-500/25"
                                                : "bg-[var(--muted)]/20 border-[var(--border)]/40"
                                        )}>
                                            <span className="text-[11px] font-medium leading-tight text-[var(--muted-foreground)] truncate">
                                                {t("days90Plus")}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-bold truncate",
                                                row.days90Plus > 0 ? "text-red-600 dark:text-red-400" : "text-[var(--muted-foreground)]"
                                            )}>
                                                {row.days90Plus > 0 ? formatINR(row.days90Plus) : "—"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>

            {/* ─── Statement Dialog (opened from row action) ───────── */}
            {selectedClientForStatement && (
                <StatementDialog
                    open={isStatementDialogOpen}
                    onOpenChange={(open) => {
                        setIsStatementDialogOpen(open);
                        if (!open) setSelectedClientForStatement(null);
                    }}
                    clientId={selectedClientForStatement.clientId}
                    clientName={selectedClientForStatement.clientName}
                    clientPhone={selectedClientForStatement.clientPhone}
                />
            )}
        </motion.div>
    );
}
