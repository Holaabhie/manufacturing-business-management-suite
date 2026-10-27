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
    const [exportingExcel, setExportingExcel] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);

    const [data, setData] = useState<StatementResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const formatDisplayDate = useCallback((dStr: string) => {
        if (!dStr) return "";
        const parts = dStr.split("-");
        if (parts.length === 3) {
            const y = Number(parts[0]);
            const m = Number(parts[1]);
            const d = Number(parts[2]);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                const dt = new Date(y, m - 1, d);
                return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            }
        }
        const dt = new Date(dStr);
        if (!isNaN(dt.getTime())) {
            return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        }
        return dStr;
    }, []);

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
        setExportingExcel(true);
        try {
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
        } catch (e: any) {
            toast.error(e.message || "Failed to export Excel");
        } finally {
            setExportingExcel(false);
        }
    };

    const handleExportPDF = () => {
        if (!data || data.lines.length === 0) {
            toast.error(t("noTransactions"));
            return;
        }
        setExportingPDF(true);
        try {
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
                    formatDisplayDate(from),
                    "",
                    "Opening Balance",
                    "—",
                    "—",
                    data.openingBalance < 0
                        ? `${Math.abs(data.openingBalance).toLocaleString("en-IN")} Cr`
                        : data.openingBalance.toLocaleString("en-IN"),
                ],
                ...data.lines.map((line) => [
                    formatDisplayDate(line.date),
                    line.type,
                    line.particulars,
                    line.debit ? line.debit.toLocaleString("en-IN") : "—",
                    line.credit ? line.credit.toLocaleString("en-IN") : "—",
                    line.runningBalance < 0
                        ? `${Math.abs(line.runningBalance).toLocaleString("en-IN")} Cr`
                        : line.runningBalance.toLocaleString("en-IN"),
                ]),
                [
                    formatDisplayDate(to),
                    "",
                    "Total",
                    data.totalDebit.toLocaleString("en-IN"),
                    data.totalCredit.toLocaleString("en-IN"),
                    "—",
                ],
                [
                    formatDisplayDate(to),
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
                subtitle: `Period: ${formatDisplayDate(from)} to ${formatDisplayDate(to)}  •  Closing: ${data.closingBalance < 0 ? `${Math.abs(data.closingBalance).toLocaleString("en-IN")} Cr` : data.closingBalance.toLocaleString("en-IN")}`,
                headers,
                rows,
                filename: `Statement_${displayName.replace(/\s+/g, "_")}_${from}_to_${to}.pdf`,
            });
            toast.success(t("downloadPDF"));
        } catch (e: any) {
            toast.error(e.message || "Failed to download PDF");
        } finally {
            setExportingPDF(false);
        }
    };

    const handleWhatsAppShare = () => {
        if (!data) return;
        const displayName = data.client?.name || clientName || "Client";
        const formattedFrom = formatDisplayDate(from);
        const formattedTo = formatDisplayDate(to);
        const balanceStr = `₹${Math.abs(data.closingBalance).toLocaleString("en-IN")}`;
        const message = `Statement of Account\nClient: ${displayName}\nClosing Balance: ${balanceStr}\nPeriod: ${formattedFrom} to ${formattedTo}`;
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
                        {formatDisplayDate(row.original.date)}
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
        [t, formatINR, formatDisplayDate]
    );

    const formatBalance = (amount: number) => {
        if (amount < 0) return `${formatINR(Math.abs(amount))} Cr`;
        return formatINR(amount);
    };

    // Group lines by month for compact mobile ledger cards
    const groupedLines = useMemo(() => {
        if (!data || data.lines.length === 0) return [];
        const groups: { monthKey: string; lines: StatementLine[] }[] = [];
        data.lines.forEach((line) => {
            const parts = line.date.split("-");
            let monthKey = "";
            if (parts.length === 3) {
                const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
                monthKey = dt.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
            } else {
                monthKey = line.date;
            }
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.monthKey === monthKey) {
                lastGroup.lines.push(line);
            } else {
                groups.push({ monthKey, lines: [line] });
            }
        });
        return groups;
    }, [data]);

    return (
        <div className="w-full min-w-0 flex flex-col h-full min-h-0 bg-[var(--background)]">
            {/* ─── Scrollable Body ────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 min-h-0 space-y-4 scrollbar-hide">
                {/* ─── Filters Section ───────────────────────────────────── */}
                <div className="space-y-2.5">
                    {/* Segmented Control */}
                    <div className="flex rounded-xl bg-[var(--muted)] p-1 border border-[var(--border)]">
                        <button
                            type="button"
                            onClick={() => handlePresetChange("current")}
                            className={cn(
                                "flex-1 py-1.5 px-3 rounded-lg text-[13px] font-medium transition-all text-center cursor-pointer",
                                activePreset === "current"
                                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-xs font-semibold"
                                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            )}
                        >
                            {t("currentFY")}
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePresetChange("previous")}
                            className={cn(
                                "flex-1 py-1.5 px-3 rounded-lg text-[13px] font-medium transition-all text-center cursor-pointer",
                                activePreset === "previous"
                                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-xs font-semibold"
                                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            )}
                        >
                            {t("previousFY")}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActivePreset("custom")}
                            className={cn(
                                "flex-1 py-1.5 px-3 rounded-lg text-[13px] font-medium transition-all text-center cursor-pointer",
                                activePreset === "custom"
                                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-xs font-semibold"
                                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            )}
                        >
                            {t("customFY") || t("allDates") || "Custom"}
                        </button>
                    </div>

                    {/* From / To Date Inputs (2-col grid) */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                        <div>
                            <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                                {t("fromDate")}
                            </label>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => handleCustomDateChange(e.target.value, to)}
                                className="w-full h-10 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[13px] font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                                {t("toDate")}
                            </label>
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => handleCustomDateChange(from, e.target.value)}
                                className="w-full h-10 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[13px] font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* ─── Compact 2x2 Summary Block ─────────────────────────── */}
                {loading ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 grid grid-cols-2 gap-2.5">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-xl" />
                        ))}
                    </div>
                ) : data ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 sm:p-4 grid grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="p-2.5 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)]/40 min-w-0">
                            <span className="block text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold truncate">
                                {t("openingBalance")}
                            </span>
                            <span className="mt-1 block text-[15px] sm:text-base font-bold text-[var(--foreground)] tabular-nums truncate">
                                {formatBalance(data.openingBalance)}
                            </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)]/40 min-w-0">
                            <span className="block text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold truncate">
                                {t("totalDebit")}
                            </span>
                            <span className="mt-1 block text-[15px] sm:text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums truncate">
                                {formatINR(data.totalDebit)}
                            </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)]/40 min-w-0">
                            <span className="block text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold truncate">
                                {t("totalCredit")}
                            </span>
                            <span className="mt-1 block text-[15px] sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
                                {formatINR(data.totalCredit)}
                            </span>
                        </div>
                        <div className={cn(
                            "p-2.5 rounded-xl border min-w-0",
                            data.closingBalance < 0
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                        )}>
                            <span className="block text-[11px] uppercase tracking-wider font-semibold opacity-80 truncate">
                                {t("closingBalance")}
                            </span>
                            <span className="mt-1 block text-[15px] sm:text-base font-bold tabular-nums truncate">
                                {formatBalance(data.closingBalance)}
                            </span>
                        </div>
                    </div>
                ) : null}

                {/* ─── Ledger Transactions List ──────────────────────────── */}
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-xl" />
                        ))}
                    </div>
                ) : !data || data.lines.length === 0 ? (
                    <div className="py-10 px-4 text-center rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                        <p className="text-3xl mb-2">📄</p>
                        <p className="text-[14px] font-semibold text-[var(--foreground)]">{t("noTransactionsPeriod") || t("emptyStatementTitle")}</p>
                        <p className="text-[12px] text-[var(--muted-foreground)] mt-1">{t("emptyStatementDesc")}</p>
                    </div>
                ) : (
                    <div className="w-full min-w-0 space-y-3">
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

                        {/* Mobile Grouped Row Cards */}
                        <div className="md:hidden space-y-3">
                            {groupedLines.map((group) => (
                                <div key={group.monthKey} className="space-y-2">
                                    <div className="sticky top-0 z-10 py-1 px-3 rounded-lg bg-[var(--muted)]/90 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] border border-[var(--border)]/40">
                                        {group.monthKey}
                                    </div>
                                    <div className="space-y-2">
                                        {group.lines.map((line, idx) => (
                                            <div
                                                key={`${line.refId}-${idx}`}
                                                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 space-y-2 shadow-2xs"
                                            >
                                                {/* Line 1: Date + Type badge */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[12px] font-semibold text-[var(--muted-foreground)] tabular-nums">
                                                        {formatDisplayDate(line.date)}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                                            line.type === "Order"
                                                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                        )}
                                                    >
                                                        {line.type === "Order" ? t("order") : t("payment")}
                                                    </span>
                                                </div>

                                                {/* Line 2: Particulars (wrap, max 2 lines) */}
                                                <p className="text-[13px] font-medium text-[var(--foreground)] line-clamp-2 leading-snug">
                                                    {line.particulars}
                                                </p>

                                                {/* Line 3: Debit / Credit / Balance in 3 equal columns */}
                                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)]/40 text-[12px]">
                                                    <div>
                                                        <span className="block text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium">
                                                            {t("debit")}
                                                        </span>
                                                        <span className="mt-0.5 block font-semibold text-rose-600 dark:text-rose-400 tabular-nums truncate">
                                                            {line.debit > 0 ? formatINR(line.debit) : "—"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium">
                                                            {t("credit")}
                                                        </span>
                                                        <span className="mt-0.5 block font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
                                                            {line.credit > 0 ? formatINR(line.credit) : "—"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium">
                                                            {t("balance")}
                                                        </span>
                                                        <span className={cn(
                                                            "mt-0.5 block font-bold tabular-nums truncate",
                                                            line.runningBalance < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--foreground)]"
                                                        )}>
                                                            {line.runningBalance < 0 ? `${formatINR(Math.abs(line.runningBalance))} Cr` : formatINR(line.runningBalance)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Sticky Footer Actions ───────────────────────────────────── */}
            <div className="shrink-0 p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--card)] flex items-center gap-2 sm:gap-3">
                <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={loading || !data || exportingExcel}
                    className="flex-1 h-11 px-3 rounded-xl bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] flex items-center justify-center gap-2 text-[13px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                    {exportingExcel ? <RefreshCw className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    <span>Excel</span>
                </button>
                <button
                    type="button"
                    onClick={handleExportPDF}
                    disabled={loading || !data || exportingPDF}
                    className="flex-1 h-11 px-3 rounded-xl bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] flex items-center justify-center gap-2 text-[13px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                    {exportingPDF ? <RefreshCw className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" /> : <FileText className="h-4 w-4 text-rose-500 shrink-0" />}
                    <span>PDF</span>
                </button>
                <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    disabled={loading || !data}
                    className="flex-[1.4] h-11 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 text-[13px] font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t("shareWhatsApp") || "Send on WhatsApp"}</span>
                </button>
            </div>
        </div>
    );
}
