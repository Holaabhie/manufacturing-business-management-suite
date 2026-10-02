"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
    Bell,
    Plus,
    Clock,
    Mail,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Trash2,
    Edit3,
    Loader2,
    Play,
    RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { SettingsHeader } from "../SettingsHeader";
import { StatWidget } from "@/components/ui/StatWidget";
import { IOSCard, IOSBadge } from "@/components/ui/ios";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { EnterpriseDataTable } from "@/components/EnterpriseDataTable";
import { MobileTableCards, MobileField } from "@/components/ui/MobileTableCards";
import type {
    ReminderRule,
    ReminderLog,
    ReminderTriggerType,
    ReminderPreviewResult,
} from "@/modules/reminders";

interface RuleFormData {
    id?: string;
    name: string;
    trigger_type: ReminderTriggerType;
    days: number;
    channels: ("email")[];
    min_outstanding_rupees: number;
    active: boolean;
}

const DEFAULT_FORM_DATA: RuleFormData = {
    name: "",
    trigger_type: "days_after_due",
    days: 7,
    channels: ["email"],
    min_outstanding_rupees: 0,
    active: true,
};

export default function PaymentRemindersSettingsPage() {
    const t = useTranslations("reminders");
    const tCommon = useTranslations("common");

    const [activeTab, setActiveTab] = useState<"rules" | "history" | "preview">("rules");
    const [rules, setRules] = useState<ReminderRule[]>([]);
    const [logs, setLogs] = useState<ReminderLog[]>([]);
    const [loadingRules, setLoadingRules] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Rule dialog state
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [ruleFormData, setRuleFormData] = useState<RuleFormData>(DEFAULT_FORM_DATA);
    const [savingRule, setSavingRule] = useState(false);

    // Delete rule dialog state
    const [ruleToDelete, setRuleToDelete] = useState<ReminderRule | null>(null);
    const [deletingRule, setDeletingRule] = useState(false);

    // History filter
    const [logStatusFilter, setLogStatusFilter] = useState<string>("all");

    // Preview state
    const [previewAsOf, setPreviewAsOf] = useState<string>(() => {
        const now = new Date();
        return now.toISOString().slice(0, 10);
    });
    const [previewResult, setPreviewResult] = useState<ReminderPreviewResult | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // ── Load Rules ──────────────────────────────────────────
    const fetchRules = useCallback(async () => {
        setLoadingRules(true);
        try {
            const res = await fetch("/api/reminders/rules");
            const data = await res.json();
            if (data.success && Array.isArray(data.rules)) {
                setRules(data.rules);
            }
        } catch (err) {
            console.error("Failed to load rules:", err);
            toast.error(t("toastSaveFailed"));
        } finally {
            setLoadingRules(false);
        }
    }, [t]);

    // ── Load Logs ───────────────────────────────────────────
    const fetchLogs = useCallback(async () => {
        setLoadingLogs(true);
        try {
            const url = logStatusFilter && logStatusFilter !== "all"
                ? `/api/reminders/logs?status=${encodeURIComponent(logStatusFilter)}&limit=100`
                : `/api/reminders/logs?limit=100`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success && Array.isArray(data.logs)) {
                setLogs(data.logs);
            }
        } catch (err) {
            console.error("Failed to load logs:", err);
        } finally {
            setLoadingLogs(false);
        }
    }, [logStatusFilter]);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    useEffect(() => {
        if (activeTab === "history") {
            fetchLogs();
        }
    }, [activeTab, fetchLogs]);

    // ── Compute KPI statistics ──────────────────────────────
    const stats = useMemo(() => {
        const activeRulesCount = rules.filter((r) => r.active).length;
        const queuedCount = logs.filter((l) => l.status === "queued").length;
        const sentCount = logs.filter((l) => l.status === "sent").length;
        const skippedCount = logs.filter((l) => l.status === "skipped").length;
        return {
            activeRulesCount,
            queuedCount,
            sentCount,
            skippedCount,
        };
    }, [rules, logs]);

    // ── Add / Edit Rule ─────────────────────────────────────
    const handleOpenCreateModal = () => {
        setRuleFormData(DEFAULT_FORM_DATA);
        setIsRuleModalOpen(true);
    };

    const handleOpenEditModal = (rule: ReminderRule) => {
        setRuleFormData({
            id: rule.id,
            name: rule.name,
            trigger_type: rule.trigger_type,
            days: rule.days,
            channels: rule.channels,
            min_outstanding_rupees: Math.round((rule.min_outstanding_paise || 0) / 100),
            active: rule.active,
        });
        setIsRuleModalOpen(true);
    };

    const handleSaveRule = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingRule(true);

        const payload = {
            name: ruleFormData.name,
            trigger_type: ruleFormData.trigger_type,
            days: ruleFormData.trigger_type === "on_due_date" ? 0 : Number(ruleFormData.days),
            channels: ruleFormData.channels,
            min_outstanding_paise: Math.round(Number(ruleFormData.min_outstanding_rupees || 0) * 100),
            active: ruleFormData.active,
        };

        try {
            if (ruleFormData.id) {
                // Update
                const res = await fetch(`/api/reminders/rules/${ruleFormData.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Update failed");
                toast.success(t("toastRuleUpdated"));
            } else {
                // Create
                const res = await fetch("/api/reminders/rules", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Create failed");
                toast.success(t("toastRuleCreated"));
            }
            setIsRuleModalOpen(false);
            await fetchRules();
        } catch (err: any) {
            toast.error(err.message || t("toastSaveFailed"));
        } finally {
            setSavingRule(false);
        }
    };

    const handleToggleRuleActive = async (rule: ReminderRule, nextActive: boolean) => {
        try {
            const res = await fetch(`/api/reminders/rules/${rule.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: nextActive }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            setRules((prev) =>
                prev.map((r) => (r.id === rule.id ? { ...r, active: nextActive } : r))
            );
        } catch {
            toast.error(t("toastSaveFailed"));
        }
    };

    const handleDeleteRule = async () => {
        if (!ruleToDelete) return;
        setDeletingRule(true);
        try {
            const res = await fetch(`/api/reminders/rules/${ruleToDelete.id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Delete failed");
            toast.success(t("toastRuleDeleted"));
            setRuleToDelete(null);
            await fetchRules();
        } catch (err: any) {
            toast.error(err.message || t("toastDeleteFailed"));
        } finally {
            setDeletingRule(false);
        }
    };

    // ── Run Preview Dry Run ─────────────────────────────────
    const handleRunPreview = async () => {
        setLoadingPreview(true);
        try {
            const res = await fetch(`/api/reminders/preview?asOf=${encodeURIComponent(previewAsOf)}`, {
                method: "POST",
            });
            const data = await res.json();
            if (data.success) {
                setPreviewResult(data);
            } else {
                toast.error(data.error || "Preview failed");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to run preview");
        } finally {
            setLoadingPreview(false);
        }
    };

    // ── Helper to format trigger description ────────────────
    const formatTriggerDescription = (trigger_type: ReminderTriggerType, days: number) => {
        if (trigger_type === "on_due_date") {
            return t("dueToday");
        }
        if (trigger_type === "days_before_due") {
            return t("daysBefore", { days });
        }
        return t("daysAfter", { days });
    };

    // ── Columns for EnterpriseDataTable (History) ───────────
    const logColumns = useMemo<ColumnDef<ReminderLog>[]>(
        () => [
            {
                accessorKey: "scheduled_date",
                header: t("colDate"),
                cell: ({ row }) => (
                    <span className="font-mono text-[12px] text-[var(--foreground)]">
                        {row.original.scheduled_date || String(row.original.created_at).slice(0, 10)}
                    </span>
                ),
            },
            {
                accessorKey: "order_id",
                header: t("colOrder"),
                cell: ({ row }) => (
                    <span className="font-semibold text-[13px] text-[var(--foreground)]">
                        #{row.original.order_id}
                    </span>
                ),
            },
            {
                accessorKey: "recipient",
                header: t("colClient"),
                cell: ({ row }) => (
                    <div className="min-w-0 max-w-[200px]">
                        <p className="text-[13px] text-[var(--foreground)] truncate">
                            {row.original.recipient || "—"}
                        </p>
                    </div>
                ),
            },
            {
                accessorKey: "outstanding_paise",
                header: t("colAmount"),
                cell: ({ row }) => {
                    const rupees = (row.original.outstanding_paise / 100).toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                    });
                    return (
                        <span className="font-semibold text-[13px] text-[var(--foreground)]">
                            ₹{rupees}
                        </span>
                    );
                },
            },
            {
                accessorKey: "days_past_due",
                header: t("colDaysPastDue"),
                cell: ({ row }) => (
                    <span className="text-[12px] text-[var(--muted-foreground)]">
                        {row.original.days_past_due > 0
                            ? `+${row.original.days_past_due}d`
                            : `${row.original.days_past_due}d`}
                    </span>
                ),
            },
            {
                accessorKey: "status",
                header: t("colStatus"),
                cell: ({ row }) => {
                    const s = row.original.status;
                    let color: "green" | "orange" | "red" | "gray" = "gray";
                    if (s === "sent") color = "green";
                    else if (s === "queued") color = "gray";
                    else if (s === "skipped") color = "orange";
                    else if (s === "failed") color = "red";

                    return (
                        <div className="flex flex-col gap-0.5">
                            <IOSBadge color={color} variant="tinted" size="small">
                                {t(`status${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}
                            </IOSBadge>
                            {row.original.skip_reason && (
                                <span className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[140px]" title={row.original.skip_reason}>
                                    {row.original.skip_reason}
                                </span>
                            )}
                        </div>
                    );
                },
            },
        ],
        [t]
    );

    // ── Mobile fields for MobileTableCards (History) ────────
    const mobileLogFields = useMemo<MobileField<ReminderLog>[]>(
        () => [
            {
                key: "order_id",
                label: t("colOrder"),
                primary: true,
                render: (val) => `#${val}`,
            },
            {
                key: "recipient",
                label: t("colClient"),
                render: (val) => val || "—",
            },
            {
                key: "outstanding_paise",
                label: t("colAmount"),
                render: (val) => `₹${((val || 0) / 100).toLocaleString("en-IN")}`,
            },
            {
                key: "scheduled_date",
                label: t("colDate"),
            },
            {
                key: "status",
                label: t("colStatus"),
                render: (val, row) => {
                    let color: "green" | "orange" | "red" | "gray" = "gray";
                    if (val === "sent") color = "green";
                    else if (val === "queued") color = "gray";
                    else if (val === "skipped") color = "orange";
                    else if (val === "failed") color = "red";
                    return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <IOSBadge color={color} variant="tinted" size="small">
                                {String(val).toUpperCase()}
                            </IOSBadge>
                            {row.skip_reason && (
                                <span className="text-[11px] text-[var(--muted-foreground)]">
                                    ({row.skip_reason})
                                </span>
                            )}
                        </div>
                    );
                },
            },
        ],
        [t]
    );

    return (
        <div className="w-full min-w-0 overflow-x-hidden space-y-6 max-w-6xl mx-auto pb-16 px-4 sm:px-6">
            {/* Header */}
            <SettingsHeader
                title={t("title")}
                subtitle={t("subtitle")}
                icon={Bell}
                iconColor="#FF2D55"
            >
                {activeTab === "rules" && (
                    <Button
                        size="sm"
                        onClick={handleOpenCreateModal}
                        className="flex items-center gap-1.5 font-medium shadow-sm bg-[var(--primary)] text-white hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" />
                        <span>{t("addRule")}</span>
                    </Button>
                )}
            </SettingsHeader>

            {/* KPI Stat Widgets */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
                <div className="min-w-0 w-full overflow-hidden">
                    <StatWidget
                        label={t("activeRules")}
                        value={stats.activeRulesCount}
                        icon={Clock}
                        color="blue"
                    />
                </div>
                <div className="min-w-0 w-full overflow-hidden">
                    <StatWidget
                        label={t("remindersQueued")}
                        value={stats.queuedCount}
                        icon={Mail}
                        color="purple"
                    />
                </div>
                <div className="min-w-0 w-full overflow-hidden">
                    <StatWidget
                        label={t("remindersSent")}
                        value={stats.sentCount}
                        icon={CheckCircle2}
                        color="green"
                    />
                </div>
                <div className="min-w-0 w-full overflow-hidden">
                    <StatWidget
                        label={t("remindersSkipped")}
                        value={stats.skippedCount}
                        icon={AlertCircle}
                        color="orange"
                    />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-[var(--border)] flex items-center gap-2 overflow-x-auto scrollbar-hide w-full min-w-0">
                <button
                    onClick={() => setActiveTab("rules")}
                    className={`pb-3 px-3 text-[14px] font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === "rules"
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                >
                    {t("tabRules")}
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`pb-3 px-3 text-[14px] font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === "history"
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                >
                    {t("tabHistory")}
                </button>
                <button
                    onClick={() => setActiveTab("preview")}
                    className={`pb-3 px-3 text-[14px] font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === "preview"
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                >
                    {t("tabPreview")}
                </button>
            </div>

            {/* TAB CONTENT: RULES */}
            {activeTab === "rules" && (
                <div className="space-y-4 w-full min-w-0">
                    {loadingRules ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
                        </div>
                    ) : rules.length === 0 ? (
                        <div className="p-8 sm:p-12 text-center rounded-[20px] border border-[var(--border)] bg-[var(--card)] space-y-4">
                            <div className="mx-auto w-12 h-12 rounded-full bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                                <Clock className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-[17px] font-bold text-[var(--foreground)]">
                                    {t("emptyRulesTitle")}
                                </h3>
                                <p className="text-[13px] text-[var(--muted-foreground)] max-w-md mx-auto">
                                    {t("emptyRulesDesc")}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleOpenCreateModal}
                                className="inline-flex items-center gap-2 bg-[var(--primary)] text-white hover:opacity-90"
                            >
                                <Plus className="h-4 w-4" />
                                {t("addRule")}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rules.map((rule) => (
                                <motion.div
                                    key={rule.id}
                                    layout
                                    className="p-4 sm:p-5 rounded-[16px] border border-[var(--border)] bg-[var(--card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                                >
                                    <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <h4 className="text-[15px] font-bold text-[var(--foreground)] truncate">
                                                {rule.name}
                                            </h4>
                                            <IOSBadge color="gray" variant="tinted" size="small">
                                                {formatTriggerDescription(rule.trigger_type, rule.days)}
                                            </IOSBadge>
                                            <IOSBadge color="blue" variant="tinted" size="small">
                                                <Mail className="h-3 w-3 mr-1 inline" />
                                                Email
                                            </IOSBadge>
                                        </div>
                                        <div className="flex items-center gap-3 text-[12px] text-[var(--muted-foreground)]">
                                            <span>
                                                {t("minAmount")}: ₹{(rule.min_outstanding_paise / 100).toLocaleString("en-IN")}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {rule.active ? t("active") : t("inactive")}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                        <div className="flex items-center gap-2 mr-2">
                                            <Switch
                                                checked={rule.active}
                                                onCheckedChange={(checked) => handleToggleRuleActive(rule, checked)}
                                                aria-label="Toggle active status"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleOpenEditModal(rule)}
                                            className="p-2 rounded-[8px] hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                                            title={t("editRule")}
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setRuleToDelete(rule)}
                                            className="p-2 rounded-[8px] hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                                            title={t("deleteRule")}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: HISTORY */}
            {activeTab === "history" && (
                <div className="space-y-4 w-full min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-[var(--muted-foreground)]">
                                {t("filterStatus")}:
                            </span>
                            <Select
                                value={logStatusFilter}
                                onValueChange={(val) => setLogStatusFilter(val)}
                            >
                                <SelectTrigger className="w-[140px] h-9 text-[13px]">
                                    <SelectValue placeholder={t("allStatuses")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("allStatuses")}</SelectItem>
                                    <SelectItem value="queued">{t("statusQueued")}</SelectItem>
                                    <SelectItem value="sent">{t("statusSent")}</SelectItem>
                                    <SelectItem value="skipped">{t("statusSkipped")}</SelectItem>
                                    <SelectItem value="failed">{t("statusFailed")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <button
                            onClick={fetchLogs}
                            className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors py-1.5 px-2.5 rounded-[8px] hover:bg-[var(--muted)] self-start sm:self-auto cursor-pointer"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>{tCommon("refresh")}</span>
                        </button>
                    </div>

                    {loadingLogs ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-8 sm:p-12 text-center rounded-[20px] border border-[var(--border)] bg-[var(--card)] space-y-2">
                            <Clock className="h-8 w-8 mx-auto text-[var(--muted-foreground)]" />
                            <h3 className="text-[16px] font-semibold text-[var(--foreground)]">
                                {t("emptyHistoryTitle")}
                            </h3>
                            <p className="text-[13px] text-[var(--muted-foreground)] max-w-md mx-auto">
                                {t("emptyHistoryDesc")}
                            </p>
                        </div>
                    ) : (
                        <div className="w-full min-w-0">
                            {/* Desktop Enterprise Table */}
                            <div className="hidden md:block w-full min-w-0 overflow-x-auto">
                                <EnterpriseDataTable
                                    columns={logColumns}
                                    data={logs}
                                    searchPlaceholder={t("colOrder")}
                                />
                            </div>
                            {/* Mobile Card Layout */}
                            <div className="block md:hidden w-full min-w-0">
                                <MobileTableCards
                                    data={logs}
                                    fields={mobileLogFields}
                                    emptyMessage={t("emptyHistoryTitle")}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: DRY RUN PREVIEW */}
            {activeTab === "preview" && (
                <div className="space-y-6 w-full min-w-0">
                    <IOSCard className="p-4 sm:p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="text-[16px] font-bold text-[var(--foreground)]">
                                    {t("tabPreview")}
                                </h3>
                                <p className="text-[13px] text-[var(--muted-foreground)]">
                                    Simulate reminder rule execution against current tenant receivables without writing logs or dispatching emails.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[12px] text-[var(--muted-foreground)]">
                                        As of Date (IST)
                                    </Label>
                                    <Input
                                        type="date"
                                        value={previewAsOf}
                                        onChange={(e) => setPreviewAsOf(e.target.value)}
                                        className="h-9 w-[160px] text-[13px]"
                                    />
                                </div>
                                <div className="pt-5">
                                    <Button
                                        size="sm"
                                        onClick={handleRunPreview}
                                        disabled={loadingPreview}
                                        className="flex items-center gap-1.5 bg-[var(--primary)] text-white hover:opacity-90"
                                    >
                                        {loadingPreview ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Play className="h-4 w-4" />
                                        )}
                                        <span>{loadingPreview ? t("previewing") : t("runPreview")}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {previewResult && (
                            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 rounded-[12px] bg-[var(--muted)]/50 border border-[var(--border)]">
                                        <p className="text-[11px] text-[var(--muted-foreground)]">{t("totalCandidates")}</p>
                                        <p className="text-[18px] font-bold text-[var(--foreground)]">{previewResult.totalCandidates}</p>
                                    </div>
                                    <div className="p-3 rounded-[12px] bg-emerald-500/10 border border-emerald-500/20">
                                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{t("wouldQueue")}</p>
                                        <p className="text-[18px] font-bold text-emerald-600 dark:text-emerald-400">{previewResult.wouldQueueCount}</p>
                                    </div>
                                    <div className="p-3 rounded-[12px] bg-amber-500/10 border border-amber-500/20">
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400">{t("wouldSkip")}</p>
                                        <p className="text-[18px] font-bold text-amber-600 dark:text-amber-400">{previewResult.wouldSkipCount}</p>
                                    </div>
                                    <div className="p-3 rounded-[12px] bg-blue-500/10 border border-blue-500/20">
                                        <p className="text-[11px] text-blue-600 dark:text-blue-400">{t("alreadySentToday")}</p>
                                        <p className="text-[18px] font-bold text-blue-600 dark:text-blue-400">{previewResult.alreadySentCount}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-[14px] font-bold text-[var(--foreground)]">
                                        {t("previewResults", { date: previewResult.asOf })}
                                    </h4>
                                    {previewResult.candidates.length === 0 ? (
                                        <p className="text-[13px] text-[var(--muted-foreground)] py-4">
                                            No orders match the active reminder rules for this date.
                                        </p>
                                    ) : (
                                        <div className="space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-hide">
                                            {previewResult.candidates.map((c, i) => (
                                                <div
                                                    key={`${c.order_id}-${c.rule_id}-${i}`}
                                                    className="p-3.5 rounded-[12px] border border-[var(--border)] bg-[var(--card)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-[var(--foreground)]">Order #{c.order_id}</span>
                                                            <span className="text-[var(--muted-foreground)]">({c.client_name})</span>
                                                            <IOSBadge color={c.status === "would_queue" ? "green" : "orange"} variant="tinted" size="small">
                                                                {c.status === "would_queue" ? t("wouldQueue") : t("wouldSkip")}
                                                            </IOSBadge>
                                                            {c.already_sent && (
                                                                <IOSBadge color="blue" variant="tinted" size="small">
                                                                    {t("alreadySentToday")}
                                                                </IOSBadge>
                                                            )}
                                                        </div>
                                                        <p className="text-[12px] text-[var(--muted-foreground)]">
                                                            Rule: <span className="font-medium text-[var(--foreground)]">{c.rule_name}</span> • Due Date: {c.due_date} ({c.days_past_due}d past due)
                                                        </p>
                                                    </div>
                                                    <div className="text-right sm:shrink-0">
                                                        <p className="font-bold text-[var(--foreground)]">
                                                            ₹{(c.outstanding_paise / 100).toLocaleString("en-IN")}
                                                        </p>
                                                        {c.skip_reason && (
                                                            <p className="text-[11px] text-amber-500">
                                                                Reason: {c.skip_reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </IOSCard>
                </div>
            )}

            {/* CREATE / EDIT RULE MODAL */}
            <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
                <DialogContent fullScreenMobile className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>
                            {ruleFormData.id ? t("editRule") : t("addRule")}
                        </DialogTitle>
                        <DialogDescription>
                            Configure when and how automated payment reminders should be triggered.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveRule} className="space-y-4 py-2">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="rule-name">{t("ruleName")}</Label>
                            <Input
                                id="rule-name"
                                value={ruleFormData.name}
                                onChange={(e) => setRuleFormData((p) => ({ ...p, name: e.target.value }))}
                                placeholder={t("ruleNamePlaceholder")}
                                required
                            />
                        </div>

                        {/* Trigger Type */}
                        <div className="space-y-1.5">
                            <Label htmlFor="trigger-type">{t("triggerType")}</Label>
                            <Select
                                value={ruleFormData.trigger_type}
                                onValueChange={(val: ReminderTriggerType) => {
                                    setRuleFormData((p) => ({
                                        ...p,
                                        trigger_type: val,
                                        days: val === "on_due_date" ? 0 : p.days || 7,
                                    }));
                                }}
                            >
                                <SelectTrigger id="trigger-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="days_before_due">{t("triggerBefore")}</SelectItem>
                                    <SelectItem value="on_due_date">{t("triggerOn")}</SelectItem>
                                    <SelectItem value="days_after_due">{t("triggerAfter")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Days Offset */}
                        {ruleFormData.trigger_type !== "on_due_date" && (
                            <div className="space-y-1.5">
                                <Label htmlFor="days-offset">{t("daysOffset")}</Label>
                                <Input
                                    id="days-offset"
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={ruleFormData.days}
                                    onChange={(e) =>
                                        setRuleFormData((p) => ({ ...p, days: parseInt(e.target.value, 10) || 0 }))
                                    }
                                    required
                                />
                            </div>
                        )}

                        {/* Minimum Outstanding Amount */}
                        <div className="space-y-1.5">
                            <Label htmlFor="min-amount">{t("minAmount")}</Label>
                            <Input
                                id="min-amount"
                                type="number"
                                min="0"
                                value={ruleFormData.min_outstanding_rupees}
                                onChange={(e) =>
                                    setRuleFormData((p) => ({
                                        ...p,
                                        min_outstanding_rupees: parseFloat(e.target.value) || 0,
                                    }))
                                }
                            />
                        </div>

                        {/* Channels */}
                        <div className="space-y-1.5">
                            <Label>{t("channels")}</Label>
                            <div className="flex items-center gap-2 p-3 rounded-[12px] bg-[var(--muted)] border border-[var(--border)]">
                                <Mail className="h-4 w-4 text-[var(--primary)]" />
                                <span className="text-[13px] font-medium text-[var(--foreground)]">{t("emailChannel")}</span>
                                <IOSBadge color="blue" variant="tinted" size="small" className="ml-auto">{t("active")}</IOSBadge>
                            </div>
                        </div>

                        {/* Active Switch */}
                        <div className="flex items-center justify-between pt-2">
                            <Label htmlFor="rule-active">{t("active")}</Label>
                            <Switch
                                id="rule-active"
                                checked={ruleFormData.active}
                                onCheckedChange={(checked) =>
                                    setRuleFormData((p) => ({ ...p, active: checked }))
                                }
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsRuleModalOpen(false)}
                                disabled={savingRule}
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                type="submit"
                                disabled={savingRule}
                                className="flex items-center gap-1.5 bg-[var(--primary)] text-white hover:opacity-90"
                            >
                                {savingRule && <Loader2 className="h-4 w-4 animate-spin" />}
                                <span>{savingRule ? t("saving") : t("save")}</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* CONFIRM DELETE MODAL */}
            <Dialog open={!!ruleToDelete} onOpenChange={(open) => !open && setRuleToDelete(null)}>
                <DialogContent fullScreenMobile className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>{t("deleteRule")}</DialogTitle>
                        <DialogDescription>{t("deleteConfirm")}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRuleToDelete(null)}
                            disabled={deletingRule}
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteRule}
                            disabled={deletingRule}
                            className="flex items-center gap-1.5"
                        >
                            {deletingRule && <Loader2 className="h-4 w-4 animate-spin" />}
                            <span>{t("delete")}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
