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
                cell: ({ row }) => (
                    <div className="min-w-0 max-w-[200px]">
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
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums text-[var(--muted-foreground)]">
                        {row.original.notDue > 0 ? formatINR(row.original.notDue) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "days1_30",
                header: () => <div className="text-right">{t("days1_30")}</div>,
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-medium text-amber-600 dark:text-amber-400">
                        {row.original.days1_30 > 0 ? formatINR(row.original.days1_30) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "days31_60",
                header: () => <div className="text-right">{t("days31_60")}</div>,
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-medium text-orange-600 dark:text-orange-400">
                        {row.original.days31_60 > 0 ? formatINR(row.original.days31_60) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "days61_90",
                header: () => <div className="text-right">{t("days61_90")}</div>,
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                        {row.original.days61_90 > 0 ? formatINR(row.original.days61_90) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "days90Plus",
                header: () => <div className="text-right">{t("days90Plus")}</div>,
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
                    <div className="text-right text-[13px] tabular-nums font-semibold text-[var(--foreground)]">
                        {formatINR(row.original.totalOutstanding)}
                    </div>
                ),
            },
            {
                accessorKey: "unallocatedCredit",
                header: () => <div className="text-right">{t("unallocatedCredit")}</div>,
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums text-emerald-600 dark:text-emerald-400">
                        {row.original.unallocatedCredit > 0 ? formatINR(row.original.unallocatedCredit) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "netReceivable",
                header: () => <div className="text-right">{t("netReceivable")}</div>,
                cell: ({ row }) => (
                    <div className="text-right text-[13px] tabular-nums font-bold text-[var(--foreground)]">
                        {formatINR(row.original.netReceivable)}
                    </div>
                ),
            },
            {
                id: "actions",
                header: "",
                cell: ({ row }) => {
                    if (row.original.clientId === "unassigned") return null;
                    return (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => handleOpenStatement(row.original)}
                                title={t("viewStatement")}
                                className="px-2.5 py-1 rounded-lg text-[12px] font-medium bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] transition-all flex items-center gap-1 cursor-pointer shrink-0"
                            >
                                <Eye className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                                <span className="hidden sm:inline">{t("viewStatement")}</span>
                            </button>
                        </div>
                    );
                },
            },
        ],
        [t, formatINR]
    );

    const mobileFields = useMemo<MobileField<AgingClientRow>[]>(
        () => [
            {
                key: "clientName",
                label: t("client"),
                primary: true,
            },
            {
                key: "netReceivable",
                label: t("netReceivable"),
                render: (v) => <span className="font-bold">{formatINR(v)}</span>,
            },
            {
                key: "totalOutstanding",
                label: t("totalOutstanding"),
                render: (v) => formatINR(v),
            },
            {
                key: "unallocatedCredit",
                label: t("unallocatedCredit"),
                render: (v) => (v > 0 ? formatINR(v) : "—"),
            },
            {
                key: "days90Plus",
                label: t("days90Plus"),
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
                        {t("receivablesTitle")}
                    </h1>
                    <p className="text-[13px] text-[var(--muted-foreground)] mt-1">
                        {t("receivablesSubtitle")}
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
                            label={t("unallocatedCredit")}
                            value={data.kpis.unallocatedCredit}
                            displayValue={formatINR(data.kpis.unallocatedCredit)}
                            icon={Coins}
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

                        {/* Mobile Cards */}
                        <div className="md:hidden">
                            <MobileTableCards
                                data={data.rows}
                                fields={mobileFields}
                                keyExtractor={(item) => item.clientId}
                                actionsTrigger={(row) => {
                                    if (row.clientId === "unassigned") return null;
                                    return (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)]">
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenStatement(row)}>
                                                    <Eye className="mr-2 h-4 w-4" /> {t("viewStatement")}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    );
                                }}
                            />
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
