"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/hooks/useFormatters";
import {
    getFYDateRange,
    type StatementLine,
    type StatementResult,
} from "@/lib/reports/receivables";
import { exportWorkbook } from "@/lib/excel-export";
import { generateDataExportPDF } from "@/lib/pdf-generator";
import { EnterpriseDataTable } from "@/components/EnterpriseDataTable";
import { MobileTableCards, type MobileField } from "@/components/ui/MobileTableCards";
import { StatWidget } from "@/components/ui/StatWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnDef } from "@tanstack/react-table";
import {
    Calendar,
    Download,
    FileSpreadsheet,
    FileText,
    MessageSquare,
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    Coins,
    RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClientStatementProps {
    clientId: string;
    clientName?: string;
    clientPhone?: string;
    inModal?: boolean;
}

export function ClientStatement({
    clientId,
    clientName,
    clientPhone,
    inModal = false,
}: ClientStatementProps) {
    const t = useTranslations("statements");
    const { formatINR } = useFormatters();

    // Default to Current Indian FY
    const defaultFY = useMemo(() => getFYDateRange("current"), []);
    const [from, setFrom] = useState<string>(defaultFY.from);
    const [to, setTo] = useState<string>(defaultFY.to);
    const [activePreset, setActivePreset] = useState<"current" | "previous" | "custom">("current");

    const [data, setData] = useState<StatementResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatement = useCallback(async () => {
        if (!clientId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/reports/statement?client_id=${encodeURIComponent(clientId)}&from=${from}&to=${to}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to load statement");
            }
            const json: StatementResult = await res.json();
            setData(json);
        } catch (err: any) {
            console.error("Error fetching statement:", err);
            setError(err.message || "Failed to fetch statement");
            toast.error(err.message || "Failed to fetch statement");
        } finally {
            setLoading(false);
        }
    }, [clientId, from, to]);

    useEffect(() => {
        fetchStatement();
    }, [fetchStatement]);

    const handlePresetChange = (preset: "current" | "previous") => {
        setActivePreset(preset);
        const range = getFYDateRange(preset);
        setFrom(range.from);
        setTo(range.to);
    };

    const handleCustomDateChange = (newFrom: string, newTo: string) => {
        setActivePreset("custom");
        setFrom(newFrom);
        setTo(newTo);
    };

    // ─── Export Handlers ──────────────────────────────────────────

    const handleExportExcel = () => {
        if (!data || data.lines.length === 0) {
            toast.error(t("noTransactions"));
            return;
        }
        const displayName = data.client?.name || clientName || "Client";
        const sheetRows: any[] = [
            {
                date: from,
                type: "",
                particulars: "Opening Balance",
                debit: "",
                credit: "",
                runningBalance: data.openingBalance,
            },
            ...data.lines.map((line) => ({
                date: line.date,
                type: line.type,
                particulars: line.particulars,
                debit: line.debit,
                credit: line.credit,
                runningBalance: line.runningBalance,
            })),
            {
                date: to,
                type: "",
                particulars: "Total",
                debit: data.totalDebit,
                credit: data.totalCredit,
                runningBalance: "",
            },
            {
                date: to,
                type: "",
                particulars: "Closing Balance",
                debit: "",
                credit: "",
                runningBalance: data.closingBalance,
            },
        ];

        exportWorkbook(`Statement_${displayName.replace(/\s+/g, "_")}_${from}_to_${to}.xlsx`, [
            {
                sheetName: "Statement of Account",
                data: sheetRows,
                columns: [
                    { header: "Date", key: "date" },
                    { header: "Type", key: "type" },
                    { header: "Particulars", key: "particulars" },
                    { header: "Debit", key: "debit" },
                    { header: "Credit", key: "credit" },
                    { header: "Running Balance", key: "runningBalance" },
                ],
            },
        ]);
        toast.success(t("exportExcel"));
    };

    const handleExportPDF = () => {
        if (!data || data.lines.length === 0) {
            toast.error(t("noTransactions"));
            return;
        }
        const displayName = data.client?.name || clientName || "Client";
        const headers = [
            t("date"),
            t("type"),
            t("particulars"),
            `${t("debit")} (INR)`,
            `${t("credit")} (INR)`,
            `${t("balance")} (INR)`,
        ];
        const rows = [
            [
                from,
                "",
                "Opening Balance",
                "—",
                "—",
                data.openingBalance < 0
                    ? `${Math.abs(data.openingBalance).toLocaleString("en-IN")} Cr`
                    : data.openingBalance.toLocaleString("en-IN"),
            ],
            ...data.lines.map((line) => [
                line.date,
                line.type,
                line.particulars,
                line.debit ? line.debit.toLocaleString("en-IN") : "—",
                line.credit ? line.credit.toLocaleString("en-IN") : "—",
                line.runningBalance < 0
                    ? `${Math.abs(line.runningBalance).toLocaleString("en-IN")} Cr`
                    : line.runningBalance.toLocaleString("en-IN"),
            ]),
            [
                to,
                "",
                "Total",
                data.totalDebit.toLocaleString("en-IN"),
                data.totalCredit.toLocaleString("en-IN"),
                "—",
            ],
            [
                to,
                "",
                "Closing Balance",
                "—",
                "—",
                data.closingBalance < 0
                    ? `${Math.abs(data.closingBalance).toLocaleString("en-IN")} Cr`
                    : data.closingBalance.toLocaleString("en-IN"),
            ],
        ];

        generateDataExportPDF({
            title: `Statement of Account - ${displayName}`,
            subtitle: `Period: ${from} to ${to}  •  Closing: ${data.closingBalance < 0 ? `${Math.abs(data.closingBalance).toLocaleString("en-IN")} Cr` : data.closingBalance.toLocaleString("en-IN")}`,
            headers,
            rows,
            filename: `Statement_${displayName.replace(/\s+/g, "_")}_${from}_to_${to}.pdf`,
        });
        toast.success(t("downloadPDF"));
    };

    const handleWhatsAppShare = () => {
        if (!data) return;
        const displayName = data.client?.name || clientName || "Client";
        const balanceStr = data.closingBalance < 0
            ? `₹${Math.abs(data.closingBalance).toLocaleString("en-IN")} Cr`
            : `₹${data.closingBalance.toLocaleString("en-IN")}`;
        const message = `Statement of Account\nClient: ${displayName}\nClosing Balance: ${balanceStr}\nPeriod: ${from} to ${to}`;
        const cleanPhone = (data.client?.phone || clientPhone || "").replace(/\D/g, "");
        const waUrl = cleanPhone
            ? `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(waUrl, "_blank");
    };

    // ─── Table Column Definitions ─────────────────────────────────

    const columns = useMemo<ColumnDef<StatementLine>[]>(
        () => [
            {
                accessorKey: "date",
                header: t("date"),
                cell: ({ row }) => (
                    <span className="text-[13px] font-medium whitespace-nowrap tabular-nums">
                        {row.original.date}
                    </span>
                ),
            },
            {
                accessorKey: "type",
                header: t("type"),
                cell: ({ row }) => (
                    <span
                        className={cn(
                            "text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block whitespace-nowrap",
                            row.original.type === "Order"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        )}
                    >
                        {row.original.type === "Order" ? t("order") : t("payment")}
                    </span>
                ),
            },
            {
                accessorKey: "particulars",
                header: t("particulars"),
                cell: ({ row }) => (
                    <span
                        className="text-[13px] text-[var(--foreground)] truncate max-w-[240px] lg:max-w-[340px] block"
                        title={row.original.particulars}
                    >
                        {row.original.particulars}
                    </span>
                ),
            },
            {
                accessorKey: "debit",
                header: () => <div className="text-right">{t("debit")}</div>,
                cell: ({ row }) => (
                    <div className="text-right font-medium text-[13px] tabular-nums whitespace-nowrap">
                        {row.original.debit > 0 ? formatINR(row.original.debit) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "credit",
                header: () => <div className="text-right">{t("credit")}</div>,
                cell: ({ row }) => (
                    <div className="text-right font-medium text-[13px] tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                        {row.original.credit > 0 ? formatINR(row.original.credit) : "—"}
                    </div>
                ),
            },
            {
                accessorKey: "runningBalance",
                header: () => <div className="text-right">{t("balance")}</div>,
                cell: ({ row }) => {
                    const bal = row.original.runningBalance;
                    return (
                        <div
                            className={cn(
                                "text-right font-semibold text-[13px] tabular-nums whitespace-nowrap",
                                bal < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--foreground)]"
                            )}
                        >
                            {bal < 0 ? `${formatINR(Math.abs(bal))} Cr` : formatINR(bal)}
                        </div>
                    );
                },
            },
        ],
        [t, formatINR]
    );

    const mobileFields = useMemo<MobileField<StatementLine>[]>(
        () => [
            {
                key: "particulars",
                label: t("particulars"),
                primary: true,
            },
            {
                key: "date",
                label: t("date"),
            },
            {
                key: "type",
                label: t("type"),
                render: (v) => (
                    <span
                        className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block",
                            v === "Order"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        )}
                    >
                        {v === "Order" ? t("order") : t("payment")}
                    </span>
                ),
            },
            {
                key: "debit",
                label: t("debit"),
                render: (v) => (v > 0 ? formatINR(v) : "—"),
            },
            {
                key: "credit",
                label: t("credit"),
                render: (v) => (v > 0 ? formatINR(v) : "—"),
            },
            {
                key: "runningBalance",
                label: t("balance"),
                render: (v) => (v < 0 ? `${formatINR(Math.abs(v))} Cr` : formatINR(v)),
            },
        ],
        [t, formatINR]
    );

    const formatBalance = (amount: number) => {
        if (amount < 0) return `${formatINR(Math.abs(amount))} Cr`;
        return formatINR(amount);
    };

    return (
        <div className="w-full min-w-0 space-y-4">
            {/* ─── Controls: Presets + Date Range + Export Actions ─── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-[16px] bg-[var(--muted)]/50 border border-[var(--border)] min-w-0">
                {/* Preset Pill Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <button
                        type="button"
                        onClick={() => handlePresetChange("current")}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer",
                            activePreset === "current"
                                ? "bg-[var(--primary)] text-white shadow-sm"
                                : "bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--muted-foreground)] border border-[var(--border)]"
                        )}
                    >
                        {t("currentFY")}
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePresetChange("previous")}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer",
                            activePreset === "previous"
                                ? "bg-[var(--primary)] text-white shadow-sm"
                                : "bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--muted-foreground)] border border-[var(--border)]"
                        )}
                    >
                        {t("previousFY")}
                    </button>
                </div>

                {/* Date Inputs */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <div className="flex items-center gap-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl px-2.5 py-1">
                        <span className="text-[11px] font-medium text-[var(--muted-foreground)]">{t("fromDate")}:</span>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => handleCustomDateChange(e.target.value, to)}
                            className="bg-transparent text-[12px] text-[var(--foreground)] outline-none border-none cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl px-2.5 py-1">
                        <span className="text-[11px] font-medium text-[var(--muted-foreground)]">{t("toDate")}:</span>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => handleCustomDateChange(from, e.target.value)}
                            className="bg-transparent text-[12px] text-[var(--foreground)] outline-none border-none cursor-pointer"
                        />
                    </div>
                </div>

                {/* Export & Share Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        title={t("exportExcel")}
                        disabled={loading || !data}
                        className="h-8 px-2.5 rounded-xl bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] flex items-center gap-1.5 text-[12px] font-medium transition-all disabled:opacity-50 cursor-pointer"
                    >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="hidden md:inline">Excel</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportPDF}
                        title={t("downloadPDF")}
                        disabled={loading || !data}
                        className="h-8 px-2.5 rounded-xl bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] flex items-center gap-1.5 text-[12px] font-medium transition-all disabled:opacity-50 cursor-pointer"
                    >
                        <FileText className="h-3.5 w-3.5 text-red-500" />
                        <span className="hidden md:inline">PDF</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleWhatsAppShare}
                        title={t("shareWhatsApp")}
                        disabled={loading || !data}
                        className="h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-[12px] font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">WhatsApp</span>
                    </button>
                </div>
            </div>

            {/* ─── StatWidget KPI Row ───────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full min-w-0">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-[20px]" />
                    ))}
                </div>
            ) : data ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full min-w-0">
                    <StatWidget
                        label={t("openingBalance")}
                        value={data.openingBalance}
                        displayValue={formatBalance(data.openingBalance)}
                        icon={Wallet}
                        color="blue"
                    />
                    <StatWidget
                        label={t("totalDebit")}
                        value={data.totalDebit}
                        displayValue={formatINR(data.totalDebit)}
                        icon={ArrowUpRight}
                        color="purple"
                    />
                    <StatWidget
                        label={t("totalCredit")}
                        value={data.totalCredit}
                        displayValue={formatINR(data.totalCredit)}
                        icon={ArrowDownLeft}
                        color="green"
                    />
                    <StatWidget
                        label={t("closingBalance")}
                        value={data.closingBalance}
                        displayValue={formatBalance(data.closingBalance)}
                        icon={Coins}
                        color={data.closingBalance < 0 ? "green" : "orange"}
                    />
                </div>
            ) : null}

            {/* ─── Transactions Table / Cards / Empty State ────────── */}
            {loading ? (
                <div className="p-6 text-center">
                    <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
            ) : !data || data.lines.length === 0 ? (
                <EmptyState
                    icon="📄"
                    title={t("emptyStatementTitle")}
                    description={t("emptyStatementDesc")}
                />
            ) : (
                <div className="space-y-3 w-full min-w-0">
                    {/* Desktop EnterpriseDataTable */}
                    <div className="hidden md:block rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden min-w-0">
                        <EnterpriseDataTable
                            columns={columns}
                            data={data.lines}
                            searchColumn="particulars"
                            searchPlaceholder={`${t("particulars")}...`}
                            showBulkActions={false}
                        />
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden">
                        <MobileTableCards
                            data={data.lines}
                            fields={mobileFields}
                            keyExtractor={(item, idx) => `${item.refId}-${idx}`}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
