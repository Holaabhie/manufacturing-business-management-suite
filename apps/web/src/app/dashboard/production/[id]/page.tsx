"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAppLocale } from "@/components/LocaleProvider";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/hooks/use-orders";
import {
    ChevronRight,
    Play,
    Pause,
    CheckCircle2,
    Clock,
    AlertTriangle,
    TrendingUp,
    Package,
    Cpu,
    User,
    Users,
    Calendar,
    Activity,
    Minus,
    Plus,
    ArrowLeft,
    BarChart3,
    History,
    Target,
    Zap,
    Flame,
    Award,
    PauseCircle,
    PlayCircle,
    Flag,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { playCompletionSound } from "@/hooks/useCompletionSound";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/lib/hooks/use-role";
import { useFormatters } from "@/hooks/useFormatters";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NumericInput } from "@/components/ui/numeric-input";
import { AssignStaffDialog } from "@/components/production/AssignStaffDialog";

import type {
    Production,
    ProductionStatus,
    ProductionKPIs,
    ProductionProgressEntry,
} from "@/lib/production-types";

// Status Config dynamically initialized inside component

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.06, delayChildren: 0.05 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: "easeOut" },
    },
};

// ─── Page Component ─────────────────────────────────────────────────
export default function ProductionDetailPage() {
    const t = useTranslations("production.detail");
    const tFloor = useTranslations("production.floor");
    const tStatus = useTranslations("production.statuses");
    const tToast = useTranslations("production.toasts");
    const { locale } = useAppLocale();
    const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";
    const router = useRouter();

    const statusConfig: Record<
        ProductionStatus,
        { label: string; color: string; bgColor: string; borderColor: string; icon: any }
    > = {
        pending: {
            label: tStatus("pending"),
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            borderColor: "border-amber-500/20",
            icon: Clock,
        },
        running: {
            label: tStatus("running"),
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20",
            icon: Play,
        },
        paused: {
            label: tStatus("paused"),
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/20",
            icon: Pause,
        },
        completed: {
            label: tStatus("completed"),
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
            icon: CheckCircle2,
        },
    };
    const params = useParams();
    const productionId = params.id as string;
    const { isAdmin, isStaff, role } = useRole();
    const { formatNumber } = useFormatters();
    const qc = useQueryClient();

    const [production, setProduction] = useState<Production | null>(null);
    const [loading, setLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    // Progress update form
    const [updateProduced, setUpdateProduced] = useState("");
    const [updateReject, setUpdateReject] = useState("");
    const [updateNotes, setUpdateNotes] = useState("");
    const [pauseReason, setPauseReason] = useState("");
    const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [overrideMode, setOverrideMode] = useState(false);
    const [assignStaffOpen, setAssignStaffOpen] = useState(false);
    const [progressHistory, setProgressHistory] = useState<ProductionProgressEntry[]>([]);

    // Refs for form initialization guard and activity timeline
    const formInitialized = useRef(false);
    const isAtBottom = useRef(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const timelineBottomRef = useRef<HTMLDivElement>(null);

    const fetchProduction = useCallback(async () => {
        try {
            const res = await fetch(`/api/production/${productionId}`);
            if (!res.ok) {
                toast.error(tToast("productionNotFound"));
                router.push("/dashboard/production");
                return;
            }
            const data = await res.json();
            setProduction(data);
            setIsError(false);
            if (!formInitialized.current) {
                setUpdateProduced(String(data.producedQuantity || 0));
                setUpdateReject(String(data.rejectQuantity || 0));
                formInitialized.current = true;
            }
        } catch {
            toast.error(tToast("loadProductionFailed"));
            setIsError(true);
        } finally {
            setLoading(false);
        }
    }, [productionId, router]);

    // Fetch progress history
    const fetchProgressHistory = useCallback(async () => {
        try {
            const res = await fetch(
                `/api/production/progress/update?productionId=${productionId}`
            );
            if (res.ok) {
                const data = await res.json();
                setProgressHistory(Array.isArray(data) ? data : []);
            }
        } catch {
            // Silently fail — history is secondary
        }
    }, [productionId]);

    useEffect(() => {
        fetchProduction();
        fetchProgressHistory();
        let interval: ReturnType<typeof setInterval>;
        const startPolling = () => {
            interval = setInterval(() => {
                if (document.visibilityState === "visible") {
                    fetchProduction();
                    fetchProgressHistory();
                }
            }, 30_000);
        };
        startPolling();
        const handleVisibility = () => {
            clearInterval(interval);
            if (document.visibilityState === "visible") {
                fetchProduction();
                fetchProgressHistory();
                startPolling();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [fetchProduction, fetchProgressHistory]);

    // Smart auto-scroll: only scroll to bottom if user is already there
    const handleTimelineScroll = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    }, []);

    useEffect(() => {
        if (production?.activityLog?.length && isAtBottom.current) {
            timelineBottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [production?.activityLog?.length]);

    // ─── Actions ──────────────────────────────────────────────
    const performAction = async (action: string, extra?: Record<string, any>) => {
        setUpdating(true);
        try {
            const body: any = { action, ...extra };
            const res = await fetch(`/api/production/${productionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.error) {
                toast.error(data.error);
                return;
            }
            toast.success(
                action === "start"
                    ? "Production started!"
                    : action === "pause"
                        ? "Production paused"
                        : action === "resume"
                            ? "Production resumed"
                            : action === "complete"
                                ? "Production completed!"
                                : "Progress updated"
            );
            if (action === "complete") {
                playCompletionSound("general");
            }
            // Invalidate dependent React Query caches
            qc.invalidateQueries({ queryKey: queryKeys.orders });
            qc.invalidateQueries({ queryKey: queryKeys.inventory });
            qc.invalidateQueries({ queryKey: queryKeys.stats });
            fetchProduction();
        } catch {
            toast.error(tToast("actionFailed"));
        } finally {
            setUpdating(false);
            setPauseDialogOpen(false);
            setCompleteDialogOpen(false);
        }
    };

    const handleUpdateProgress = async () => {
        setUpdating(true);
        // Snapshot for rollback
        const prevProduction = production;

        // Optimistic local update
        if (production) {
            const optimisticProcessed = Number(updateProduced) + Number(updateReject);
            setProduction({
                ...production,
                producedQuantity: Number(updateProduced),
                rejectQuantity: Number(updateReject),
                progressPercent: production.expectedOutput > 0
                    ? Math.min(Math.round((optimisticProcessed / production.expectedOutput) * 100), 100)
                    : 0,
            });
        }

        try {
            const res = await fetch("/api/production/progress/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productionId,
                    producedQty: Number(updateProduced),
                    rejectedQty: Number(updateReject),
                    notes: updateNotes.trim(),
                }),
            });
            const data = await res.json();
            if (data.error) {
                setProduction(prevProduction);
                toast.error(data.error);
                return;
            }
            const wasCompleted = prevProduction?.status === "completed";
            if (data.autoCompleted || data.status === "completed") {
                if (!wasCompleted) {
                    playCompletionSound("general");
                }
                toast.success(tToast("completedSuccess"));
            } else {
                toast.success(tToast("progressUpdated"));
            }
            formInitialized.current = false; // allow next fetch to sync
            setUpdateNotes("");
            // Invalidate dependent React Query caches
            qc.invalidateQueries({ queryKey: queryKeys.orders });
            qc.invalidateQueries({ queryKey: queryKeys.inventory });
            qc.invalidateQueries({ queryKey: queryKeys.stats });
            fetchProduction();
            fetchProgressHistory();
        } catch {
            setProduction(prevProduction);
            toast.error(tToast("progressUpdateFailed"));
        } finally {
            setUpdating(false);
        }
    };

    // ─── KPIs ─────────────────────────────────────────────────
    const kpis: ProductionKPIs | null = production
        ? (() => {
            const processedUnits = production.producedQuantity + production.rejectQuantity;
            return {
                efficiency:
                    production.expectedOutput > 0
                        ? Math.round(
                            (production.producedQuantity / production.expectedOutput) * 100
                        )
                        : 0,
                materialConsumption: production.materials.reduce(
                    (acc, m) => acc + m.quantityUsed,
                    0
                ),
                wastage:
                    processedUnits > 0
                        ? Math.round(
                            (production.rejectQuantity / processedUnits) * 100
                        )
                        : 0,
                staffContribution: [
                    {
                        name: production.operatorName || "Operator",
                        produced: production.producedQuantity,
                        role: "Operator",
                    },
                ],
            };
        })()
        : null;

    // Validation: rejected qty cannot exceed produced qty
    const rejectedExceedsProduced = Number(updateReject) > Number(updateProduced);

    // ─── Loading UI ───────────────────────────────────────────
    if (loading) {
        return (
            <div className="w-full min-w-0 overflow-x-hidden space-y-6 pb-28">
                <Skeleton className="h-5 w-40 rounded-lg" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-56 rounded-lg" />
                        <Skeleton className="h-4 w-72 rounded-lg" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-32 rounded-xl" />
                        <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                </div>
                <div className="rounded-xl border bg-card border-border p-5 space-y-3">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-36 rounded-lg" />
                        <Skeleton className="h-4 w-28 rounded-lg" />
                    </div>
                    <Skeleton className="h-3 w-full rounded-full" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-xl border bg-card border-border p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-8 w-8 rounded-lg" />
                                <Skeleton className="h-3 w-16 rounded-lg" />
                            </div>
                            <Skeleton className="h-7 w-20 rounded-lg" />
                            <Skeleton className="h-3 w-24 rounded-lg" />
                        </div>
                    ))}
                </div>
                <Skeleton className="h-[400px] rounded-xl" />
            </div>
        );
    }

    if (isError && !production) {
        return (
            <div className="flex flex-col items-center justify-center px-5 py-20 gap-4 pb-28">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-[15px] font-semibold">{t("notFoundTitle")}</p>
                <p className="text-[13px] text-muted-foreground text-center">
                    {t("notFoundDesc")}
                </p>
                <Button
                    onClick={() => {
                        setIsError(false);
                        setLoading(true);
                        fetchProduction();
                    }}
                    className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold"
                >
                    {t("btnRetry")}
                </Button>
            </div>
        );
    }

    if (!production) {
        return (
            <div className="flex flex-col items-center justify-center py-32 pb-28">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold mb-2">{t("notFoundTitle")}</h2>
                <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard/production")}
                    className="gap-2 rounded-xl"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t("btnBackToProductions")}
                </Button>
            </div>
        );
    }

    const unit = production.outputUnit ?? "units";
    const sc = statusConfig[production.status as ProductionStatus] || {
        label: "Closed",
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        icon: Clock,
    };
    const StatusIcon = sc.icon;
    const canEdit = isStaff || (isAdmin && overrideMode);
    const canEditProgress = canEdit && production.status !== "completed";
    const canPerformActions = production.status !== "completed";

    return (
        <motion.div
            className="space-y-6 pb-28"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* ─── Breadcrumb ──────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="flex items-center gap-2 text-sm text-muted-foreground">
                <button
                    onClick={() => router.push("/dashboard/production")}
                    className="hover:text-foreground transition-colors"
                >
                    {t("breadcrumbProduction")}
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">
                    {production.batchNumber}
                </span>
            </motion.div>

            {/* ─── Header ──────────────────────────────────────────── */}
            <motion.div
                variants={itemVariants}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {production.orderProductName}
                        </h1>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] font-bold uppercase tracking-wider gap-1 py-1 px-2.5",
                                sc.color,
                                sc.bgColor,
                                sc.borderColor
                            )}
                        >
                            <StatusIcon className="h-3 w-3" />
                            {sc.label}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-mono text-xs">{production.batchNumber}</span>
                        <span>•</span>
                        <span>{production.clientName}</span>
                        <span>•</span>
                        <span className="capitalize">{t("shiftSuffix", { shift: production.shift })}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {production.status === "pending" && canPerformActions && (
                        <Button
                            className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => performAction("start")}
                            disabled={updating}
                            id="start-production-btn"
                        >
                            <PlayCircle className="h-4 w-4" />
                            {t("btnStart")}
                        </Button>
                    )}
                    {production.status === "running" && canPerformActions && (
                        <>
                            <Button
                                variant="outline"
                                className="gap-2 rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50"
                                onClick={() => setPauseDialogOpen(true)}
                                disabled={updating}
                                id="pause-production-btn"
                            >
                                <PauseCircle className="h-4 w-4" />
                                {t("btnPause")}
                            </Button>
                            <Button
                                className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => setCompleteDialogOpen(true)}
                                disabled={updating}
                                id="complete-production-btn"
                            >
                                <Flag className="h-4 w-4" />
                                {t("btnComplete")}
                            </Button>
                        </>
                    )}
                    {production.status === "paused" && canPerformActions && (
                        <Button
                            className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => performAction("resume")}
                            disabled={updating}
                            id="resume-production-btn"
                        >
                            <PlayCircle className="h-4 w-4" />
                            {t("btnResume")}
                        </Button>
                    )}
                    {isAdmin && canPerformActions && (
                        <Button
                            variant="outline"
                            className="gap-2 rounded-xl"
                            onClick={() => setAssignStaffOpen(true)}
                            id="assign-staff-btn"
                        >
                            <Users className="h-4 w-4" />
                            {t("btnAssignStaff")}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl"
                        onClick={fetchProduction}
                        id="refresh-btn"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </motion.div>

            {/* ─── Progress Bar ────────────────────────────────────── */}
            <motion.div variants={itemVariants}>
                <div className="rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-indigo-500" />
                            <span className="text-sm font-bold">{t("tabProgress")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">
                                {formatNumber(production.producedQuantity)}
                                <span className="text-muted-foreground font-normal">
                                    {" "}
                                    / {formatNumber(production.expectedOutput)} {unit}
                                </span>
                            </span>
                            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                {production.progressPercent}%
                            </span>
                        </div>
                    </div>
                    <div className="h-3 bg-muted dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                            className={cn(
                                "h-full rounded-full",
                                production.status === "completed"
                                    ? "bg-emerald-500"
                                    : production.status === "paused"
                                        ? "bg-orange-500"
                                        : "bg-gradient-to-r from-indigo-500 to-violet-500"
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${production.progressPercent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </div>
                    {production.rejectQuantity > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-xs font-semibold text-red-500">
                                {formatNumber(production.rejectQuantity)} {unit} {t("statRejected").toLowerCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({kpis?.wastage || 0}{t("statWastageRate")})
                            </span>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* ─── KPI Cards ───────────────────────────────────────── */}
            <motion.div
                variants={itemVariants}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <div className="rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2">
                            <Zap className="h-4 w-4 text-indigo-500" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t("statEfficiency")}
                        </span>
                    </div>
                    <p className="text-2xl font-black">{kpis?.efficiency || 0}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t("statOutputVsTarget")}
                    </p>
                </div>

                <div className="rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="rounded-lg bg-teal-500/10 border border-teal-500/20 p-2">
                            <Package className="h-4 w-4 text-teal-500" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t("statMaterialUsed")}
                        </span>
                    </div>
                    <p className="text-2xl font-black">
                        {kpis?.materialConsumption.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t("statTotalConsumed")} ({unit})
                    </p>
                </div>

                <div className="rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2">
                            <Flame className="h-4 w-4 text-red-500" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t("statWastage")}
                        </span>
                    </div>
                    <p className="text-2xl font-black">{kpis?.wastage || 0}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {tFloor("rejectedCount", { count: production.rejectQuantity })}
                    </p>
                </div>

                <div className="rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-2">
                            <Award className="h-4 w-4 text-violet-500" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t("statStaff")}
                        </span>
                    </div>
                    <p className="text-lg font-black truncate">{production.operatorName || "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {production.producedQuantity} {t("statProduced").toLowerCase()}
                    </p>
                </div>
            </motion.div>

            {/* ─── Tabs: Update / Details / Activity ───────────────── */}
            <motion.div variants={itemVariants}>
                <Tabs defaultValue="update" className="space-y-4">
                    <TabsList className="bg-muted/60 dark:bg-slate-800/60 rounded-xl p-1">
                        <TabsTrigger value="update" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                            <BarChart3 className="h-3.5 w-3.5" />
                            {t("tabUpdateProgress")}
                        </TabsTrigger>
                        <TabsTrigger value="details" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                            <Cpu className="h-3.5 w-3.5" />
                            {t("tabDetails")}
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                            <History className="h-3.5 w-3.5" />
                            {t("tabActivityLog")}
                        </TabsTrigger>
                    </TabsList>

                    {/* ═══ Tab: Update Progress ═══ */}
                    <TabsContent value="update">
                        <div className="rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800 p-6">
                            {/* Admin Override Toggle — only visible to admin */}
                            {isAdmin && (
                                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', overflow: 'visible' }}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold" style={{ color: '#facc15' }}>{t("overrideModeTitle")}</p>
                                        <p className="text-xs" style={{ color: '#9ca3af' }}>{t("overrideModeDesc")}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setOverrideMode(!overrideMode)}
                                        id="admin-override-toggle"
                                        className={cn(
                                            "relative flex-shrink-0 w-[44px] h-[24px] rounded-full border-none p-0 cursor-pointer transition-colors duration-200",
                                            overrideMode ? "bg-yellow-500" : "bg-gray-600 dark:bg-gray-500"
                                        )}
                                    >
                                        <span
                                            className="absolute top-[2px] left-[2px] w-[20px] h-[20px] rounded-full bg-white dark:bg-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200"
                                            style={{
                                                transform: overrideMode ? 'translateX(20px)' : 'translateX(0px)',
                                            }}
                                        />
                                    </button>
                                </div>
                            )}

                            {/* Production Complete state — only when truly completed */}
                            {production.status === "completed" ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-3" />
                                    <h3 className="font-bold text-lg mb-1">{t("completionComplete")}</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        {t("completedNotice")}
                                    </p>
                                </div>
                            ) : /* Admin read-only view when override is OFF */
                            isAdmin && !overrideMode ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <BarChart3 className="h-8 w-8 text-indigo-400 mb-3" />
                                    <h3 className="font-bold text-lg mb-1">{t("completionSummary")}</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                                        {t("overrideNotice")}
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                                        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                                            <p className="text-2xl font-black text-emerald-500">{production.producedQuantity}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{t("statProduced")}</p>
                                        </div>
                                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-center">
                                            <p className="text-2xl font-black text-red-500">{production.rejectQuantity}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{t("statRejected")}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-4">
                                        {t("lblTarget")}: {formatNumber(production.expectedOutput)} {unit} &middot; {t("lblProgress")}: {production.progressPercent}%
                                    </p>
                                </div>
                            ) : (
                                /* ─── Editable Progress Form (Staff always, Admin when override ON) ─── */
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">{t("updateOutputTitle")}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {t("updateOutputDesc")}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                {t("lblProducedQty")}
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-12 w-12 rounded-xl"
                                                    onClick={() =>
                                                        setUpdateProduced(
                                                            String(Math.max(0, Number(updateProduced) - 1))
                                                        )
                                                    }
                                                    disabled={production.status === "pending"}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <NumericInput
                                                    value={updateProduced}
                                                    onValueChange={(v) => setUpdateProduced(v)}
                                                    className="h-12 text-center text-2xl font-black flex-1"
                                                    disabled={production.status === "pending"}
                                                    id="produced-input"
                                                    allowDecimal={false}
                                                    min={0}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-12 w-12 rounded-xl"
                                                    onClick={() =>
                                                        setUpdateProduced(
                                                            String(Number(updateProduced) + 1)
                                                        )
                                                    }
                                                    disabled={production.status === "pending"}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground text-center">
                                                {t("lblTarget")}: {formatNumber(production.expectedOutput)} {unit}
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                                {t("lblRejectedQty")}
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-12 w-12 rounded-xl"
                                                    onClick={() =>
                                                        setUpdateReject(
                                                            String(Math.max(0, Number(updateReject) - 1))
                                                        )
                                                    }
                                                    disabled={production.status === "pending"}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <NumericInput
                                                    value={updateReject}
                                                    onValueChange={(v) => setUpdateReject(v)}
                                                    className="h-12 text-center text-2xl font-black flex-1"
                                                    disabled={production.status === "pending"}
                                                    id="rejected-input"
                                                    allowDecimal={false}
                                                    min={0}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-12 w-12 rounded-xl"
                                                    onClick={() =>
                                                        setUpdateReject(
                                                            String(Number(updateReject) + 1)
                                                        )
                                                    }
                                                    disabled={production.status === "pending"}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            {rejectedExceedsProduced && (
                                                <p className="text-[12px] text-red-500 mt-1 text-center">
                                                    {t("errRejectExceedsProduced")}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notes for this update */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            {t("lblUpdateNotes")}
                                        </Label>
                                        <textarea
                                            value={updateNotes}
                                            onChange={(e) => setUpdateNotes(e.target.value)}
                                            placeholder={t("placeholderUpdateNotes")}
                                            rows={2}
                                            className={cn(
                                                "flex w-full rounded-xl border px-4 py-3 text-sm shadow-xs transition-colors resize-none",
                                                "bg-card border-border",
                                                "placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                                            )}
                                            disabled={production.status === "pending"}
                                            id="update-notes"
                                        />
                                    </div>

                                    <Button
                                        className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-lg shadow-indigo-500/20"
                                        onClick={handleUpdateProgress}
                                        disabled={updating || rejectedExceedsProduced || production.status === "pending"}
                                        id="save-progress-btn"
                                    >
                                        {updating ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                {t("btnSaving")}
                                            </>
                                        ) : (
                                            <>
                                                <TrendingUp className="h-4 w-4" />
                                                {t("btnSaveProgress")}
                                            </>
                                        )}
                                    </Button>

                                    {/* Progress History */}
                                    {progressHistory.length > 0 && (
                                        <div className="mt-6 pt-6 border-t border-border dark:border-slate-800">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                                <History className="h-3.5 w-3.5" />
                                                {t("secProgressHistory")}
                                            </h4>
                                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                {progressHistory.map((entry) => (
                                                    <div
                                                        key={entry.id}
                                                        className="rounded-lg bg-muted/30 dark:bg-slate-800/30 border border-border dark:border-slate-700 px-4 py-3"
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <User className="h-3 w-3 text-muted-foreground" />
                                                                <span className="text-xs font-semibold">
                                                                    {entry.updatedByName}
                                                                </span>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[8px] font-bold uppercase"
                                                                >
                                                                    {entry.updatedByRole}
                                                                </Badge>
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {new Date(entry.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs">
                                                            <span>
                                                                {t("statProduced")}:{" "}
                                                                <strong className="text-emerald-600">
                                                                    {entry.producedQty}
                                                                </strong>
                                                            </span>
                                                            <span>
                                                                {t("statRejected")}:{" "}
                                                                <strong className="text-red-500">
                                                                    {entry.rejectedQty}
                                                                </strong>
                                                            </span>
                                                        </div>
                                                        {entry.notes && (
                                                            <p className="text-[11px] text-muted-foreground mt-1 italic">
                                                                {entry.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* ═══ Tab: Production Details ═══ */}
                    <TabsContent value="details">
                        <div className="rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800 p-6 space-y-6">
                            {/* Order Info */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <Package className="h-3.5 w-3.5" />
                                    {t("secOrderInfo")}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <DetailItem label="Product" value={production.orderProductName} />
                                    <DetailItem label={t("lblClient")} value={production.clientName} />
                                    <DetailItem
                                        label="Order Qty"
                                        value={`${formatNumber(production.orderQuantity)} ${unit}`}
                                    />
                                    <DetailItem
                                        label="Delivery"
                                        value={
                                            production.deliveryDate
                                                ? new Date(production.deliveryDate).toLocaleDateString()
                                                : "—"
                                        }
                                    />
                                </div>
                            </div>

                            <div className="border-t border-border dark:border-slate-800" />

                            {/* Setup Info */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <Cpu className="h-3.5 w-3.5" />
                                    {t("secProductionSetup")}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <DetailItem label={t("lblMachine")} value={production.machineName || "—"} />
                                    <DetailItem label={t("lblOperator")} value={production.operatorName || "—"} />
                                    <DetailItem label={t("lblShift")} value={production.shift} />
                                    <DetailItem label={t("lblBatchNumber")} value={production.batchNumber} />
                                </div>
                            </div>

                            <div className="border-t border-border dark:border-slate-800" />

                            {/* Materials */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <Package className="h-3.5 w-3.5" />
                                    {t("secMaterialsUsed")} ({production.materials.length})
                                </h3>
                                {production.materials.length > 0 ? (
                                    <div className="space-y-2">
                                        {production.materials.map((mat, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between rounded-lg bg-muted/30 dark:bg-slate-800/30 border border-border dark:border-slate-700 px-4 py-2.5"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                                                    <span className="text-sm font-semibold">
                                                        {mat.name}
                                                    </span>
                                                </div>
                                                <span className="text-sm">
                                                    <span className="font-bold">{mat.quantityUsed}</span>{" "}
                                                    <span className="text-muted-foreground">{mat.unit}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {t("noMaterialsRecorded")}
                                    </p>
                                )}
                            </div>

                            <div className="border-t border-border dark:border-slate-800" />

                            {/* Schedule */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {t("secSchedule")}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <DetailItem
                                        label={t("lblStartTime")}
                                        value={
                                            production.startTime
                                                ? new Date(production.startTime).toLocaleString()
                                                : "—"
                                        }
                                    />
                                    <DetailItem
                                        label={t("lblTargetCompletion")}
                                        value={
                                            production.targetCompletion
                                                ? new Date(
                                                    production.targetCompletion
                                                ).toLocaleString()
                                                : "—"
                                        }
                                    />
                                    <DetailItem
                                        label="Created"
                                        value={
                                            production.createdAt
                                                ? new Date(production.createdAt).toLocaleString()
                                                : "—"
                                        }
                                    />
                                    <DetailItem
                                        label="Completed"
                                        value={
                                            production.completedAt
                                                ? new Date(production.completedAt).toLocaleString()
                                                : "In Progress"
                                        }
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            {production.notes && (
                                <>
                                    <div className="border-t border-border dark:border-slate-800" />
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                            {t("secNotes")}
                                        </h3>
                                        <p className="text-sm text-muted-foreground bg-muted/30 dark:bg-slate-800/30 rounded-lg p-3 border border-border dark:border-slate-700">
                                            {production.notes}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </TabsContent>

                    {/* ═══ Tab: Activity Log ═══ */}
                    <TabsContent value="activity">
                        <div className="rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800 p-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <History className="h-5 w-5 text-muted-foreground" />
                                {t("secActivityTimeline")}
                            </h3>
                            {production.activityLog.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    {t("noActivityYet")}
                                </p>
                            ) : (
                                <div
                                    ref={scrollContainerRef}
                                    onScroll={handleTimelineScroll}
                                    className="max-h-[320px] sm:max-h-[420px] overflow-y-auto overscroll-contain activity-timeline-scroll"
                                    style={{ WebkitOverflowScrolling: "touch" as any, scrollbarWidth: "thin" as any, scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
                                >
                                <div className="relative">
                                    {/* Timeline line */}
                                    <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border dark:bg-slate-700" />

                                    <div className="space-y-0">
                                        {[...production.activityLog]
                                            .reverse()
                                            .map((log, index) => (
                                                <div
                                                    key={log.id || index}
                                                    className="relative flex gap-4 pb-6 last:pb-0"
                                                >
                                                    <div
                                                        className={cn(
                                                            "relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center",
                                                            log.action.includes("Created")
                                                                ? "bg-indigo-500/10 border-indigo-500 text-indigo-500"
                                                                : log.action.includes("Started") ||
                                                                    log.action.includes("Resumed")
                                                                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                                                    : log.action.includes("Paused")
                                                                        ? "bg-orange-500/10 border-orange-500 text-orange-500"
                                                                        : log.action.includes("Completed")
                                                                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                                                            : "bg-blue-500/10 border-blue-500 text-blue-500"
                                                        )}
                                                    >
                                                        <Activity className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-sm font-bold">
                                                                {log.action}
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[9px] font-bold uppercase"
                                                            >
                                                                {log.performedByRole}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {log.details}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                                            <User className="h-3 w-3" />
                                                            <span>{log.performedBy}</span>
                                                            <span>•</span>
                                                            <Clock className="h-3 w-3" />
                                                            <span>
                                                                {new Date(log.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                                <div ref={timelineBottomRef} />
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </motion.div>

            {/* ─── Pause Dialog ────────────────────────────────────── */}
            <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
                <DialogContent className="max-w-[400px]" showCloseButton={false}>
                    <DialogHeader className="px-4 pt-3">
                        <DialogTitle className="text-[15px] font-medium flex items-center gap-2">
                            <PauseCircle className="h-4 w-4 text-orange-500" />
                            {t("pauseModalTitle")}
                        </DialogTitle>
                        <DialogDescription className="text-[13px]">
                            {t("pauseModalDesc")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-4 py-3">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                {t("lblPauseReason")}
                            </Label>
                            <Input
                                value={pauseReason}
                                onChange={(e) => setPauseReason(e.target.value)}
                                placeholder={t("placeholderPauseReason")}
                                className="h-10"
                            />
                        </div>
                    </div>
                    <div className="px-4 pb-5 pt-2.5 border-t border-[var(--border)]">
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setPauseDialogOpen(false)}
                                className="flex-1 rounded-xl"
                            >
                                {t("btnCancel")}
                            </Button>
                            <Button
                                className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={() =>
                                    performAction("pause", { reason: pauseReason })
                                }
                                disabled={updating}
                            >
                                {t("btnConfirmPause")}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── Complete Dialog ──────────────────────────────────── */}
            <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
                <DialogContent className="max-w-[400px]" showCloseButton={false}>
                    <DialogHeader className="px-4 pt-3">
                        <DialogTitle className="text-[15px] font-medium flex items-center gap-2">
                            <Flag className="h-4 w-4 text-emerald-500" />
                            {t("completeModalTitle")}
                        </DialogTitle>
                        <DialogDescription className="text-[13px]">
                            {t("completeModalDesc")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-4 py-3">
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t("lblProduced")}:</span>
                                <span className="font-bold">{updateProduced} {unit}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t("lblRejected")}:</span>
                                <span className="font-bold text-red-500">
                                    {updateReject} {unit}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t("lblTarget")}:</span>
                                <span className="font-bold">
                                    {formatNumber(production.expectedOutput)} {unit}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="px-4 pb-5 pt-2.5 border-t border-[var(--border)]">
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setCompleteDialogOpen(false)}
                                className="flex-1 rounded-xl"
                            >
                                {t("btnCancel")}
                            </Button>
                            <Button
                                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() =>
                                    performAction("complete", {
                                        producedQuantity: Number(updateProduced),
                                        rejectQuantity: Number(updateReject),
                                    })
                                }
                                disabled={updating}
                            >
                                {t("btnConfirmComplete")}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── Assign Staff Dialog ─────────────────────────── */}
            <AssignStaffDialog
                open={assignStaffOpen}
                onOpenChange={setAssignStaffOpen}
                productionId={productionId}
                productionName={production.orderProductName}
                currentStaffIds={production.assignedStaff?.map((s) => s.id) || []}
                onSuccess={() => {
                    formInitialized.current = false;
                    fetchProduction();
                }}
            />
        </motion.div>
    );
}

// ─── Helper: Detail Item ────────────────────────────────────────────
function DetailItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                {label}
            </p>
            <p className="text-sm font-semibold capitalize">{value}</p>
        </div>
    );
}
