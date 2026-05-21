"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Search,
    Cog,
    Activity,
    Clock,
    CheckCircle2,
    TrendingUp,
    Pause,
    Play,
    AlertTriangle,
    MoreVertical,
    Trash2,
    Eye,
    Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRole } from "@/lib/hooks/use-role";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { Production, ProductionStatus } from "@/lib/production-types";
import { IOSCard } from "@/components/ui/ios/IOSCard";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { StatWidget } from "@/components/ui/StatWidget";
import { staggerContainer, staggerItem } from "@/styles/animations";

// ─── Status Config ───────────────────────────────────────
const statusConfig: Record<
    ProductionStatus,
    { label: string; color: "orange" | "blue" | "red" | "green"; icon: any }
> = {
    pending: { label: "Pending", color: "orange", icon: Clock },
    running: { label: "Running", color: "blue", icon: Play },
    paused: { label: "Paused", color: "red", icon: Pause },
    completed: { label: "Completed", color: "green", icon: CheckCircle2 },
};

// ─── Production Page ─────────────────────────────────────
export default function ProductionPage() {
    const router = useRouter();
    const { isAdmin } = useRole();
    const [productions, setProductions] = useState<Production[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productionToDelete, setProductionToDelete] = useState<string | null>(null);

    const fetchProductions = async () => {
        try {
            const res = await fetch("/api/v1/production");
            const json = await res.json();
            if (json.error) throw new Error(json.error.message);
            setProductions(json.data || []);
        } catch {
            toast.error("Failed to fetch productions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductions();
        const interval = setInterval(fetchProductions, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/production/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok || json.error) {
                toast.error(json.error?.message || "Delete failed");
            } else {
                toast.success("Production deleted");
                fetchProductions();
            }
        } catch {
            toast.error("Delete failed");
        } finally {
            setDeleteDialogOpen(false);
            setProductionToDelete(null);
        }
    };

    // Computed stats
    const stats = {
        total: productions.length,
        running: productions.filter((p) => p.status === "running").length,
        pending: productions.filter((p) => p.status === "pending").length,
        completed: productions.filter((p) => p.status === "completed").length,
        paused: productions.filter((p) => p.status === "paused").length,
        avgEfficiency:
            productions.length > 0
                ? Math.round(
                    productions
                        .filter((p) => p.expectedOutput > 0)
                        .reduce((acc, p) => acc + (p.producedQuantity / p.expectedOutput) * 100, 0) /
                    Math.max(productions.filter((p) => p.expectedOutput > 0).length, 1)
                )
                : 0,
    };

    // Filtering
    const filtered = productions.filter((p) => {
        const matchesSearch =
            p.orderProductName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.machineName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const kpiCards = [
        {
            label: "Active Runs",
            value: String(stats.running),
            subtitle: `${stats.paused} paused`,
            icon: Activity,
            colorClass: "blue" as const,
        },
        {
            label: "Pending",
            value: String(stats.pending),
            subtitle: "Awaiting start",
            icon: Clock,
            colorClass: "orange" as const,
        },
        {
            label: "Completed",
            value: String(stats.completed),
            subtitle: "All time",
            icon: CheckCircle2,
            colorClass: "green" as const,
        },
        {
            label: "Avg. Efficiency",
            value: `${stats.avgEfficiency}%`,
            subtitle: "Across batches",
            icon: TrendingUp,
            colorClass: "purple" as const,
        },
    ];

    const iconBgMap: Record<string, string> = {
        blue: "bg-primary/10",
        orange: "bg-amber-500/10",
        green: "bg-green-500/10",
        purple: "bg-violet-500/10",
    };

    const iconColorMap: Record<string, string> = {
        blue: "text-primary",
        orange: "text-amber-500",
        green: "text-green-500",
        purple: "text-violet-500",
    };

    const progressColorMap: Record<string, string> = {
        completed: "bg-green-500",
        paused: "bg-amber-500",
        running: "bg-primary",
        pending: "bg-muted-foreground",
    };

    return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
            {/* ── Header ── */}
            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-[24px] font-semibold text-foreground leading-tight">
                        Production Floor
                    </h1>
                    <p className="text-[14px] text-muted-foreground mt-1 flex items-center gap-2">
                        <Cog className="h-4 w-4 text-primary" />
                        Track and manage active production runs
                    </p>
                </div>
                <IOSButton
                    variant="filled"
                    size="large"
                    onClick={() => router.push("/dashboard/production/create")}
                    icon={<Plus className="h-5 w-5" />}
                    id="create-production-btn"
                >
                    Create Production
                </IOSButton>
            </motion.div>

            {/* ── KPI Cards ── */}
            <div className="kpi-panel">
                <div className="kpi-panel__glow"></div>
                <div className="kpi-grid">
                    {kpiCards.map((stat, i) => (
                        <StatWidget
                            key={stat.label}
                            label={stat.label}
                            value={Number(stat.value.replace('%', ''))}
                            change={0}
                            icon={stat.icon}
                            color={stat.colorClass}
                            suffix={stat.value.includes('%') ? '%' : ''}
                            delay={i}
                        />
                    ))}
                </div>
            </div>

            {/* ── Filters ── */}
            <motion.div variants={staggerItem} className="workflow-command-bar">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 h-[16px] w-[16px] text-muted-foreground" />
                    <input
                        placeholder="Search by product, batch, client..."
                        className="w-full h-[34px] rounded-md bg-muted pl-[34px] pr-4 text-[13px] text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-2 focus:ring-primary/30 transition-shadow"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        id="production-search"
                    />
                </div>
                <div className="flex items-center gap-2">
                    {[
                        { key: "running", label: "Running" },
                        { key: "pending", label: "Pending" },
                        { key: "completed", label: "Completed" },
                    ].map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setStatusFilter(item.key)}
                            className={cn(
                                "px-3 h-8 rounded-md text-xs font-medium transition-colors cursor-pointer",
                                statusFilter === item.key
                                    ? "bg-primary text-white"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] h-[34px] rounded-md bg-muted border-border text-[13px]" id="status-filter">
                        <div className="flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                            <SelectValue placeholder="Filter status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                        <SelectItem value="all" className="rounded-md">All Status</SelectItem>
                        <SelectItem value="pending" className="rounded-md">Pending</SelectItem>
                        <SelectItem value="running" className="rounded-md">Running</SelectItem>
                        <SelectItem value="paused" className="rounded-md">Paused</SelectItem>
                        <SelectItem value="completed" className="rounded-md">Completed</SelectItem>
                    </SelectContent>
                </Select>
                {(searchTerm || statusFilter !== "all") && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                        }}
                        className="h-8 px-3 rounded-md text-xs font-medium text-muted-foreground bg-muted hover:bg-accent cursor-pointer"
                    >
                        Clear
                    </button>
                )}
            </motion.div>

            {/* ── Productions List ── */}
            <motion.div variants={staggerItem}>
                <IOSCard variant="elevated" padding="none" className="overflow-hidden">
                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-[1fr_120px_1fr_160px_120px_60px] gap-4 px-5 py-3 border-b border-border bg-muted/50">
                        {["Production", "Status", "Progress", "Machine / Operator", "Order", ""].map((h) => (
                            <span key={h} className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{h}</span>
                        ))}
                    </div>

                    {/* Body */}
                    {loading ? (
                        <div className="p-5 space-y-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex gap-4 items-center">
                                    <div className="h-14 flex-1 rounded-[10px] bg-muted animate-pulse" />
                                    <div className="h-14 w-24 rounded-[10px] bg-muted animate-pulse" />
                                    <div className="h-14 flex-1 rounded-[10px] bg-muted animate-pulse" />
                                    <div className="h-14 w-40 rounded-[10px] bg-muted animate-pulse" />
                                    <div className="h-14 w-28 rounded-[10px] bg-muted animate-pulse" />
                                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center mb-4">
                                <Cog className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-[16px] font-semibold text-foreground mb-1">No productions found</h3>
                            <p className="text-[13px] text-muted-foreground mb-6 max-w-sm">
                                {searchTerm || statusFilter !== "all"
                                    ? "Try adjusting your filters to find what you're looking for."
                                    : "Create your first production to start tracking runs."}
                            </p>
                            {!searchTerm && statusFilter === "all" && (
                                <IOSButton
                                    variant="filled"
                                    size="medium"
                                    onClick={() => router.push("/dashboard/production/create")}
                                    icon={<Plus className="h-4 w-4" />}
                                >
                                    Create First Production
                                </IOSButton>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filtered.map((production, index) => {
                                const sc = statusConfig[production.status];

                                return (
                                    <motion.div
                                        key={production.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                        className="grid grid-cols-1 md:grid-cols-[1fr_120px_1fr_160px_120px_60px] gap-3 md:gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer group"
                                        onClick={() => router.push(`/dashboard/production/${production.id}`)}
                                        id={`production-row-${production.id}`}
                                    >
                                        {/* Production Info */}
                                        <div className="flex flex-col justify-center min-w-0">
                                            <span className="text-[14px] font-semibold text-foreground truncate">
                                                {production.orderProductName}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[11px] font-mono text-muted-foreground uppercase">
                                                    {production.batchNumber}
                                                </span>
                                                <span className="text-muted-foreground/50 text-[10px]">•</span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {production.clientName}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="flex items-center">
                                            <IOSBadge color={sc.color} variant="tinted" dot size="medium">
                                                {sc.label}
                                            </IOSBadge>
                                        </div>

                                        {/* Progress */}
                                        <div className="flex flex-col justify-center gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[13px] font-semibold text-foreground tabular-nums">
                                                    {production.producedQuantity} / {production.expectedOutput}
                                                </span>
                                                <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                                                    {production.progressPercent}%
                                                </span>
                                            </div>
                                            <div className="w-full h-[5px] bg-muted rounded-full overflow-hidden">
                                                <motion.div
                                                    className={cn("h-full rounded-full", progressColorMap[production.status])}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${production.progressPercent}%` }}
                                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                                />
                                            </div>
                                            {production.rejectQuantity > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <AlertTriangle className="h-2.5 w-2.5 text-destructive" />
                                                    <span className="text-[11px] font-semibold text-destructive">
                                                        {production.rejectQuantity} rejected
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Machine / Operator */}
                                        <div className="flex flex-col justify-center min-w-0">
                                            <span className="text-[13px] font-medium text-foreground truncate">
                                                {production.machineName || "—"}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground truncate">
                                                {production.operatorName || "Unassigned"}
                                            </span>
                                        </div>

                                        {/* Order */}
                                        <div className="flex flex-col justify-center min-w-0">
                                            <span className="text-[11px] font-mono text-muted-foreground uppercase truncate">
                                                {production.orderId ? `#${production.orderId.slice(0, 8)}` : "—"}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">
                                                {production.orderQuantity} units
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        className="h-[34px] w-[34px] rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all cursor-pointer"
                                                    >
                                                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44 rounded-lg">
                                                    <DropdownMenuItem
                                                        className="rounded-md"
                                                        onClick={() => router.push(`/dashboard/production/${production.id}`)}
                                                    >
                                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                                    </DropdownMenuItem>
                                                    {isAdmin && (
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive rounded-md"
                                                            onClick={() => {
                                                                setProductionToDelete(production.id);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </IOSCard>
            </motion.div>

            {/* ── Delete Dialog ── */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-[380px]" showCloseButton={false}>
                    <DialogHeader className="px-4 pt-3">
                        <DialogTitle className="text-[15px] font-medium text-foreground">Delete Production</DialogTitle>
                        <DialogDescription className="text-[13px] text-muted-foreground">
                            Are you sure you want to delete this production record? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-4 pb-5 pt-2.5">
                        <DialogFooter className="flex gap-2">
                            <IOSButton variant="gray" size="large" onClick={() => setDeleteDialogOpen(false)} fullWidth>
                                Cancel
                            </IOSButton>
                            <IOSButton variant="destructive" size="large" onClick={() => productionToDelete && handleDelete(productionToDelete)} fullWidth>
                                Delete
                            </IOSButton>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
