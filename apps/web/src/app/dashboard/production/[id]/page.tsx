"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/lib/hooks/use-role";
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

import type {
    Production,
    ProductionStatus,
    ProductionKPIs,
    ProductionProgressEntry,
} from "@/lib/production-types";

// ─── Status config ──────────────────────────────────────────────────
const statusConfig: Record<
    ProductionStatus,
    { label: string; color: string; bgColor: string; borderColor: string; icon: any }
> = {
    pending: {
        label: "Pending",
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        icon: Clock,
    },
    running: {
        label: "Running",
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        icon: Play,
    },
    paused: {
        label: "Paused",
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/20",
        icon: Pause,
    },
    completed: {
        label: "Completed",
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        icon: CheckCircle2,
    },
};

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
    const router = useRouter();
    const params = useParams();
    const productionId = params.id as string;
    const { isAdmin, isStaff, role } = useRole();

    const [production, setProduction] = useState<Production | null>(null);
    const [loading, setLoading] = useState(true);

    // Progress update form
    const [updateProduced, setUpdateProduced] = useState("");
    const [updateReject, setUpdateReject] = useState("");
    const [updateNotes, setUpdateNotes] = useState("");
    const [pauseReason, setPauseReason] = useState("");
    const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [progressHistory, setProgressHistory] = useState<ProductionProgressEntry[]>([]);

    const fetchProduction = useCallback(async () => {
        try {
            const res = await fetch(`/api/production/${productionId}`);
            if (!res.ok) {
                toast.error("Production not found");
                router.push("/dashboard/production");
                return;
            }
            const data = await res.json();
            setProduction(data);
            setUpdateProduced(String(data.producedQuantity || 0));
            setUpdateReject(String(data.rejectQuantity || 0));
        } catch {
            toast.error("Failed to load production");
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
        const interval = setInterval(() => {
            fetchProduction();
            fetchProgressHistory();
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchProduction, fetchProgressHistory]);

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
            fetchProduction();
        } catch {
            toast.error("Action failed");
        } finally {
            setUpdating(false);
            setPauseDialogOpen(false);
            setCompleteDialogOpen(false);
        }
    };

    const handleUpdateProgress = async () => {
        setUpdating(true);
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
                toast.error(data.error);
                return;
            }
            toast.success("Progress updated!");
            setUpdateNotes("");
            fetchProduction();
            fetchProgressHistory();
        } catch {
            toast.error("Failed to update progress");
        } finally {
            setUpdating(false);
        }
    };

    // ─── KPIs ─────────────────────────────────────────────────
    const kpis: ProductionKPIs | null = production
        ? {
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
                production.producedQuantity > 0
                    ? Math.round(
                        (production.rejectQuantity / production.producedQuantity) * 100
                    )
                    : 0,
            staffContribution: [
                {
                    name: production.operatorName || "Operator",
                    produced: production.producedQuantity,
                    role: "Operator",
                },
            ],
        }
        : null;

    // ─── Loading UI ───────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-96" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-[400px] rounded-xl" />
            </div>
        );
    }

    if (!production) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold mb-2">Production Not Found</h2>
                <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard/production")}
                    className="gap-2 rounded-xl"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Productions
                </Button>
            </div>
        );
    }

    const sc = statusConfig[production.status];
    const StatusIcon = sc.icon;
    const isEditable = isStaff || role === "Staff";
    const canEditProgress = !isAdmin && production.status !== "completed";
    // Staff can update progress; admins can view only
    const canPerformActions = production.status !== "completed";

    return (
        <motion.div
            className="space-y-6"
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
                    Production
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
                        <span className="capitalize">{production.shift} shift</span>
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
                            Start Production
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
                                Pause
                            </Button>
                            <Button
                                className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => setCompleteDialogOpen(true)}
                                disabled={updating}
                                id="complete-production-btn"
                            >
                                <Flag className="h-4 w-4" />
                                Complete
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
                            Resume
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
                            <span className="text-sm font-bold">Production Progress</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">
                                {production.producedQuantity}
                                <span className="text-muted-foreground font-normal">
                                    {" "}
                                    / {production.expectedOutput} units
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
                                {production.rejectQuantity} units rejected
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({kpis?.wastage || 0}% wastage rate)
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
                            Efficiency
                        </span>
                    </div>
                    <p className="text-2xl font-black">{kpis?.efficiency || 0}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Output vs target
                    </p>
                </div>

                <div className="rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="rounded-lg bg-teal-500/10 border border-teal-500/20 p-2">
                            <Package className="h-4 w-4 text-teal-500" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Material Used
                        </span>
                    </div>
                    <p className="text-2xl font-black">
                        {kpis?.materialConsumption.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Total units consumed
                    </p>
                </div>

                <div className="rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2">
                            <Flame className="h-4 w-4 text-red-500" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Wastage
                        </span>
                    </div>
                    <p className="text-2xl font-black">{kpis?.wastage || 0}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {production.rejectQuantity} rejected
                    </p>
                </div>

                <div className="rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-2">
                            <Award className="h-4 w-4 text-violet-500" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Staff
                        </span>
                    </div>
                    <p className="text-lg font-black truncate">{production.operatorName || "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {production.producedQuantity} produced
                    </p>
                </div>
            </motion.div>

            {/* ─── Tabs: Update / Details / Activity ───────────────── */}
            <motion.div variants={itemVariants}>
                <Tabs defaultValue="update" className="space-y-4">
                    <TabsList className="bg-muted/60 dark:bg-slate-800/60 rounded-xl p-1">
                        <TabsTrigger value="update" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Update Progress
                        </TabsTrigger>
                        <TabsTrigger value="details" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                            <Cpu className="h-3.5 w-3.5" />
                            Production Details
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                            <History className="h-3.5 w-3.5" />
                            Activity Log
                        </TabsTrigger>
                    </TabsList>

                    {/* ═══ Tab: Update Progress ═══ */}
                    <TabsContent value="update">
                        <div className="rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800 p-6">
                            {isAdmin ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
                                    <h3 className="font-bold text-lg mb-1">Admin View Only</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        Admins can view production details but cannot update progress.
                                        Only staff/operators can update production quantities.
                                    </p>
                                </div>
                            ) : production.status === "completed" ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-3" />
                                    <h3 className="font-bold text-lg mb-1">Production Complete</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        This production has been completed. No further updates are
                                        possible.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">Update Output</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Record the current produced and rejected quantities.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                Produced Quantity
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
                                                Target: {production.expectedOutput} units
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                                Rejected Quantity
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
                                        </div>
                                    </div>

                                    {/* Notes for this update */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Update Notes (Optional)
                                        </Label>
                                        <textarea
                                            value={updateNotes}
                                            onChange={(e) => setUpdateNotes(e.target.value)}
                                            placeholder="Add notes about this progress update..."
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
                                        disabled={
                                            updating || production.status === "pending"
                                        }
                                        id="save-progress-btn"
                                    >
                                        {updating ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <TrendingUp className="h-4 w-4" />
                                                Save Progress
                                            </>
                                        )}
                                    </Button>

                                    {/* Progress History */}
                                    {progressHistory.length > 0 && (
                                        <div className="mt-6 pt-6 border-t border-border dark:border-slate-800">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                                <History className="h-3.5 w-3.5" />
                                                Progress History
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
                                                                Produced:{" "}
                                                                <strong className="text-emerald-600">
                                                                    {entry.producedQty}
                                                                </strong>
                                                            </span>
                                                            <span>
                                                                Rejected:{" "}
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
                                    Order Information
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <DetailItem label="Product" value={production.orderProductName} />
                                    <DetailItem label="Client" value={production.clientName} />
                                    <DetailItem
                                        label="Order Qty"
                                        value={`${production.orderQuantity} units`}
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
                                    Production Setup
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <DetailItem label="Machine" value={production.machineName || "—"} />
                                    <DetailItem label="Operator" value={production.operatorName || "—"} />
                                    <DetailItem label="Shift" value={production.shift} />
                                    <DetailItem label="Batch No." value={production.batchNumber} />
                                </div>
                            </div>

                            <div className="border-t border-border dark:border-slate-800" />

                            {/* Materials */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <Package className="h-3.5 w-3.5" />
                                    Materials Used ({production.materials.length})
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
                                        No materials recorded.
                                    </p>
                                )}
                            </div>

                            <div className="border-t border-border dark:border-slate-800" />

                            {/* Schedule */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Schedule
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <DetailItem
                                        label="Start Time"
                                        value={
                                            production.startTime
                                                ? new Date(production.startTime).toLocaleString()
                                                : "—"
                                        }
                                    />
                                    <DetailItem
                                        label="Target Completion"
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
                                            Notes
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
                                Activity Timeline
                            </h3>
                            {production.activityLog.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No activity yet.
                                </p>
                            ) : (
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
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </motion.div>

            {/* ─── Pause Dialog ────────────────────────────────────── */}
            <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
                <DialogContent className="max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PauseCircle className="h-5 w-5 text-orange-500" />
                            Pause Production
                        </DialogTitle>
                        <DialogDescription>
                            Optionally provide a reason for pausing.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Reason (Optional)
                        </Label>
                        <Input
                            value={pauseReason}
                            onChange={(e) => setPauseReason(e.target.value)}
                            placeholder="e.g. Machine malfunction, Material shortage..."
                            className="h-10"
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPauseDialogOpen(false)}
                            className="flex-1 rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                            onClick={() =>
                                performAction("pause", { reason: pauseReason })
                            }
                            disabled={updating}
                        >
                            Pause Production
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Complete Dialog ──────────────────────────────────── */}
            <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
                <DialogContent className="max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Flag className="h-5 w-5 text-emerald-500" />
                            Complete Production
                        </DialogTitle>
                        <DialogDescription>
                            Mark this production as completed? This action is final.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Produced:</span>
                            <span className="font-bold">{updateProduced} units</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Rejected:</span>
                            <span className="font-bold text-red-500">
                                {updateReject} units
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Target:</span>
                            <span className="font-bold">
                                {production.expectedOutput} units
                            </span>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setCompleteDialogOpen(false)}
                            className="flex-1 rounded-xl"
                        >
                            Cancel
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
                            Complete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
