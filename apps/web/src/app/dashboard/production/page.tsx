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
        blue: "bg-[rgba(0,122,255,0.1)] dark:bg-[rgba(10,132,255,0.15)]",
        orange: "bg-[rgba(255,149,0,0.1)] dark:bg-[rgba(255,159,10,0.15)]",
        green: "bg-[rgba(52,199,89,0.1)] dark:bg-[rgba(48,209,88,0.15)]",
        purple: "bg-[rgba(175,82,222,0.1)] dark:bg-[rgba(191,90,242,0.15)]",
    };

    const iconColorMap: Record<string, string> = {
        blue: "text-[var(--ios-blue)]",
        orange: "text-[var(--ios-orange)]",
        green: "text-[var(--ios-green)]",
        purple: "text-[var(--ios-purple)]",
    };

    const progressColorMap: Record<string, string> = {
        completed: "bg-[var(--ios-green)]",
        paused: "bg-[var(--ios-orange)]",
        running: "bg-[var(--ios-blue)]",
        pending: "bg-[var(--ios-gray3)]",
    };

    return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
            {/* ── Header ── */}
            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-[34px] font-bold text-[var(--label-primary)] leading-[41px] tracking-[0.37px]">
                        Production Floor
                    </h1>
                    <p className="text-[15px] text-[var(--label-secondary)] mt-1 leading-[20px] flex items-center gap-2">
                        <Cog className="h-4 w-4 text-[var(--ios-blue)]" />
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
            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-[var(--label-tertiary)]" />
                    <input
                        placeholder="Search by product, batch, client..."
                        className="w-full h-[36px] rounded-[10px] bg-[var(--fill-tertiary)] pl-[34px] pr-4 text-[15px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] outline-none border-none focus:ring-2 focus:ring-[var(--ios-blue)] transition-shadow"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        id="production-search"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] h-[36px] rounded-[10px] bg-[var(--fill-tertiary)] border-none text-[15px]" id="status-filter">
                        <div className="flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5 text-[var(--label-tertiary)]" />
                            <SelectValue placeholder="Filter status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-[12px]">
                        <SelectItem value="all" className="rounded-[8px]">All Status</SelectItem>
                        <SelectItem value="pending" className="rounded-[8px]">Pending</SelectItem>
                        <SelectItem value="running" className="rounded-[8px]">Running</SelectItem>
                        <SelectItem value="paused" className="rounded-[8px]">Paused</SelectItem>
                        <SelectItem value="completed" className="rounded-[8px]">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </motion.div>

            {/* ── Productions List ── */}
            <motion.div variants={staggerItem}>
                <IOSCard variant="elevated" padding="none" className="overflow-hidden">
                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-[1fr_120px_1fr_160px_120px_60px] gap-4 px-5 py-3 border-b border-[var(--border-card)]">
                        {["Production", "Status", "Progress", "Machine / Operator", "Order", ""].map((h) => (
                            <span key={h} className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--label-tertiary)]">{h}</span>
                        ))}
                    </div>

                    {/* Body */}
                    {loading ? (
                        <div className="p-5 space-y-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex gap-4 items-center">
                                    <div className="h-14 flex-1 rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
                                    <div className="h-14 w-24 rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
                                    <div className="h-14 flex-1 rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
                                    <div className="h-14 w-40 rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
                                    <div className="h-14 w-28 rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
                                    <div className="h-10 w-10 rounded-full bg-[var(--fill-tertiary)] shimmer" />
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-[56px] h-[56px] rounded-[14px] bg-[var(--fill-tertiary)] flex items-center justify-center mb-4">
                                <Cog className="h-6 w-6 text-[var(--label-tertiary)]" />
                            </div>
                            <h3 className="text-[17px] font-semibold text-[var(--label-primary)] mb-1">No productions found</h3>
                            <p className="text-[13px] text-[var(--label-secondary)] mb-6 max-w-sm">
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
                        <div className="divide-y divide-[var(--border-card)]">
                            {filtered.map((production, index) => {
                                const sc = statusConfig[production.status];

                                return (
                                    <motion.div
                                        key={production.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                        className="grid grid-cols-1 md:grid-cols-[1fr_120px_1fr_160px_120px_60px] gap-3 md:gap-4 px-5 py-4 hover:bg-[var(--fill-quaternary)] transition-colors cursor-pointer group"
                                        onClick={() => router.push(`/dashboard/production/${production.id}`)}
                                        id={`production-row-${production.id}`}
                                    >
                                        {/* Production Info */}
                                        <div className="flex flex-col justify-center min-w-0">
                                            <span className="text-[15px] font-semibold text-[var(--label-primary)] truncate leading-[20px]">
                                                {production.orderProductName}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[11px] font-mono text-[var(--label-tertiary)] uppercase">
                                                    {production.batchNumber}
                                                </span>
                                                <span className="text-[var(--label-quaternary)] text-[10px]">•</span>
                                                <span className="text-[11px] text-[var(--label-tertiary)]">
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
                                                <span className="text-[13px] font-semibold text-[var(--label-primary)]">
                                                    {production.producedQuantity} / {production.expectedOutput}
                                                </span>
                                                <span className="text-[11px] font-bold text-[var(--label-tertiary)]">
                                                    {production.progressPercent}%
                                                </span>
                                            </div>
                                            <div className="w-full h-[6px] bg-[var(--fill-quaternary)] rounded-full overflow-hidden">
                                                <motion.div
                                                    className={cn("h-full rounded-full", progressColorMap[production.status])}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${production.progressPercent}%` }}
                                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                                />
                                            </div>
                                            {production.rejectQuantity > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <AlertTriangle className="h-2.5 w-2.5 text-[var(--ios-red)]" />
                                                    <span className="text-[11px] font-semibold text-[var(--ios-red)]">
                                                        {production.rejectQuantity} rejected
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Machine / Operator */}
                                        <div className="flex flex-col justify-center min-w-0">
                                            <span className="text-[13px] font-semibold text-[var(--label-primary)] truncate">
                                                {production.machineName || "—"}
                                            </span>
                                            <span className="text-[11px] text-[var(--label-tertiary)] truncate">
                                                {production.operatorName || "Unassigned"}
                                            </span>
                                        </div>

                                        {/* Order */}
                                        <div className="flex flex-col justify-center min-w-0">
                                            <span className="text-[11px] font-mono text-[var(--label-tertiary)] uppercase truncate">
                                                {production.orderId ? `#${production.orderId.slice(0, 8)}` : "—"}
                                            </span>
                                            <span className="text-[11px] text-[var(--label-tertiary)]">
                                                {production.orderQuantity} units
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <motion.button
                                                        whileTap={{ scale: 0.9 }}
                                                        className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--fill-tertiary)] transition-all cursor-pointer"
                                                    >
                                                        <MoreVertical className="h-[16px] w-[16px] text-[var(--label-secondary)]" />
                                                    </motion.button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44 rounded-[12px]">
                                                    <DropdownMenuItem
                                                        className="rounded-[8px]"
                                                        onClick={() => router.push(`/dashboard/production/${production.id}`)}
                                                    >
                                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                                    </DropdownMenuItem>
                                                    {isAdmin && (
                                                        <DropdownMenuItem
                                                            className="text-[var(--ios-red)] focus:text-[var(--ios-red)] rounded-[8px]"
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
                <DialogContent className="max-w-[380px] rounded-[20px] border-[var(--border-card)]">
                    <DialogHeader>
                        <DialogTitle className="text-[20px] font-bold text-[var(--label-primary)]">Delete Production</DialogTitle>
                        <DialogDescription className="text-[15px] text-[var(--label-secondary)]">
                            Are you sure you want to delete this production record? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <IOSButton variant="gray" size="large" onClick={() => setDeleteDialogOpen(false)} fullWidth>
                            Cancel
                        </IOSButton>
                        <IOSButton variant="destructive" size="large" onClick={() => productionToDelete && handleDelete(productionToDelete)} fullWidth>
                            Delete
                        </IOSButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
