"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Activity,
    Clock,
    CheckCircle2,
    Play,
    Pause,
    AlertTriangle,
    Package,
    ChevronRight,
    RefreshCw,
    Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, type Variants } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ProductionStatus } from "@/lib/production-types";

// ─── Status config ──────────────────────────────────────────────────
const statusConfig: Record<
    string,
    { label: string; color: string; bgColor: string; borderColor: string; icon: any }
> = {
    pending: {
        label: "Pending",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        icon: Clock,
    },
    running: {
        label: "Running",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        icon: Play,
    },
    paused: {
        label: "Paused",
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/20",
        icon: Pause,
    },
    completed: {
        label: "Completed",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/20",
        icon: CheckCircle2,
    },
};

// ─── Animation variants ─────────────────────────────────────────────
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.06, delayChildren: 0.05 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: "easeOut" },
    },
};

interface MyProduction {
    id: string;
    orderProductName: string;
    batchNumber: string;
    clientName: string;
    machineName: string;
    operatorName: string;
    expectedOutput: number;
    producedQuantity: number;
    rejectQuantity: number;
    progressPercent: number;
    status: string;
    shift: string;
    startTime: string;
    targetCompletion: string;
    createdAt: string;
}

// ─── Page ───────────────────────────────────────────────────────────
export default function MyProductionsPage() {
    const router = useRouter();
    const [productions, setProductions] = useState<MyProduction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchMyProductions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/production/my-productions?page=${page}`);
            if (!res.ok) {
                if (res.status === 403) {
                    setError("You don't have access to view productions.");
                    return;
                }
                throw new Error("Failed to load productions");
            }
            const data = await res.json();
            setProductions(data.productions || []);
            setTotalPages(data.totalPages || 1);
            setTotal(data.total || 0);
        } catch (err: any) {
            setError(err.message || "Failed to load productions");
            toast.error("Failed to load productions");
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchMyProductions();
    }, [fetchMyProductions]);

    // Visibility-aware polling
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        const startPolling = () => {
            interval = setInterval(() => {
                if (document.visibilityState === "visible") {
                    fetchMyProductions();
                }
            }, 30_000);
        };
        startPolling();
        const handleVisibility = () => {
            clearInterval(interval);
            if (document.visibilityState === "visible") {
                fetchMyProductions();
                startPolling();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [fetchMyProductions]);

    const progressColorMap: Record<string, string> = {
        completed: "bg-green-500",
        paused: "bg-amber-500",
        running: "bg-primary",
        pending: "bg-muted-foreground",
    };

    // ─── Loading ────────────────────────────────────────────────
    if (loading && productions.length === 0) {
        return (
            <div className="space-y-6 pb-28">
                <div className="space-y-1">
                    <Skeleton className="h-7 w-52 rounded-lg" />
                    <Skeleton className="h-4 w-72 rounded-lg" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="rounded-xl border bg-card border-border p-4 space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-5 w-48 rounded-lg" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                            <Skeleton className="h-3 w-full rounded-full" />
                            <div className="flex gap-4">
                                <Skeleton className="h-3 w-24 rounded-lg" />
                                <Skeleton className="h-3 w-32 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ─── Error ──────────────────────────────────────────────────
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center px-5 py-20 gap-4 pb-28">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-[15px] font-semibold">{error}</p>
                <Button
                    onClick={fetchMyProductions}
                    className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold"
                >
                    Retry
                </Button>
            </div>
        );
    }

    // ─── Empty State ────────────────────────────────────────────
    if (!loading && productions.length === 0) {
        return (
            <div className="space-y-6 pb-28">
                {/* Header */}
                <div className="space-y-1">
                    <h1 className="text-[24px] font-semibold text-foreground leading-tight">
                        My Productions
                    </h1>
                    <p className="text-[14px] text-muted-foreground flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        Productions assigned to you
                    </p>
                </div>

                <div className="flex flex-col items-center justify-center px-5 py-24 gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                        <Inbox className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <p className="text-[16px] font-semibold text-foreground">
                        No productions assigned to you yet
                    </p>
                    <p className="text-[13px] text-muted-foreground text-center max-w-sm">
                        Contact your admin if you believe this is a mistake. Productions will appear here once you are assigned.
                    </p>
                </div>
            </div>
        );
    }

    // ─── Productions List ───────────────────────────────────────
    return (
        <motion.div
            className="space-y-6 pb-28"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-[24px] font-semibold text-foreground leading-tight">
                        My Productions
                    </h1>
                    <p className="text-[14px] text-muted-foreground flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        {total} production{total !== 1 ? "s" : ""} assigned to you
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl"
                    onClick={fetchMyProductions}
                >
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </motion.div>

            {/* Production Cards */}
            <div className="space-y-3">
                {productions.map((production, index) => {
                    const sc = statusConfig[production.status] || statusConfig.pending;
                    const StatusIcon = sc.icon;

                    return (
                        <motion.div
                            key={production.id}
                            variants={itemVariants}
                            className={cn(
                                "rounded-xl border bg-card dark:bg-slate-900 border-border dark:border-slate-800",
                                "p-4 cursor-pointer transition-all duration-200",
                                "hover:shadow-md hover:border-primary/20 active:scale-[0.99]"
                            )}
                            onClick={() =>
                                router.push(`/dashboard/production/${production.id}`)
                            }
                        >
                            {/* Top: Name + Status */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-semibold text-foreground truncate">
                                        {production.orderProductName}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] font-mono text-muted-foreground uppercase">
                                            {production.batchNumber}
                                        </span>
                                        <span className="text-muted-foreground/50 text-[10px]">
                                            •
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            {production.clientName}
                                        </span>
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider gap-1 py-0.5 px-2 shrink-0",
                                        sc.color,
                                        sc.bgColor,
                                        sc.borderColor
                                    )}
                                >
                                    <StatusIcon className="h-3 w-3" />
                                    {sc.label}
                                </Badge>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1.5 mb-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-semibold tabular-nums">
                                        {production.producedQuantity} /{" "}
                                        {production.expectedOutput}
                                    </span>
                                    <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                                        {production.progressPercent}%
                                    </span>
                                </div>
                                <div className="w-full h-[5px] bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        className={cn(
                                            "h-full rounded-full",
                                            progressColorMap[production.status] ||
                                                "bg-muted-foreground"
                                        )}
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${production.progressPercent}%`,
                                        }}
                                        transition={{
                                            duration: 0.8,
                                            ease: [0.16, 1, 0.3, 1],
                                        }}
                                    />
                                </div>
                                {production.rejectQuantity > 0 && (
                                    <div className="flex items-center gap-1">
                                        <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
                                        <span className="text-[11px] font-semibold text-red-500">
                                            {production.rejectQuantity} rejected
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Bottom meta */}
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                {production.machineName && (
                                    <span className="flex items-center gap-1">
                                        <Package className="h-3 w-3" />
                                        {production.machineName}
                                    </span>
                                )}
                                <span className="capitalize">
                                    {production.shift} shift
                                </span>
                                <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/40" />
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <motion.div
                    variants={itemVariants}
                    className="flex items-center justify-center gap-2 pt-2"
                >
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-[13px]"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <span className="text-[13px] text-muted-foreground tabular-nums px-3">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-[13px]"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </Button>
                </motion.div>
            )}
        </motion.div>
    );
}
