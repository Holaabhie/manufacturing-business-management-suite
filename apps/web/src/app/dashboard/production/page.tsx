"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useCachedPage } from "@/hooks/useCachedPage";
import { useRouter } from "next/navigation";
import { usePaginatedSearch } from "@/hooks/usePaginatedSearch";
import { useURLSyncedPagination } from "@/hooks/useURLSyncedPagination";

import { TablePagination } from "@/components/ui/TablePagination";
import { TableEmptyState } from "@/components/ui/TableEmptyState";
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
    X,
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
    const { isAdmin, isStaff, loading: roleLoading } = useRole();
    const [productions, setProductions] = useState<Production[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productionToDelete, setProductionToDelete] = useState<string | null>(null);
    const [restoredFromCache, setRestoredFromCache] = useState(false);

    // ── Page State Persistence ───────────────────────────
    const { restoreState, persist, scrollYRef } = useCachedPage({ pageKey: "production" });

    // Staff users should see only their assigned productions
    useEffect(() => {
        if (!roleLoading && isStaff) {
            router.replace("/dashboard/production/my-productions");
        }
    }, [roleLoading, isStaff, router]);

    const fetchProductions = async () => {
        try {
            const res = await fetch("/api/v1/production", { credentials: "include" });
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
        // Don't fetch if staff (they'll be redirected)
        if (roleLoading || isStaff) return;
        if (!restoredFromCache) fetchProductions();
        const interval = setInterval(fetchProductions, 15000);
        return () => clearInterval(interval);
    }, [roleLoading, isStaff, restoredFromCache]);

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/production/${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            // v1 envelope returns 204 No Content on success (no body)
            if (res.status === 204 || res.ok) {
                toast.success("Production closed");
                setProductions((prev) => prev.filter((p) => p.id !== id));
            } else {
                // Parse error body only for non-success
                const json = await res.json().catch(() => null);
                toast.error(json?.error?.message || "Delete failed");
            }
        } catch {
            toast.error("Delete failed");
        } finally {
            setDeleteDialogOpen(false);
            setProductionToDelete(null);
        }
    };

    // Filter out closed/deleted productions
    const activeProductions = useMemo(() => productions.filter((p) => p.status !== "closed"), [productions]);

    // Computed stats
    const stats = useMemo(() => {
        return {
            total: activeProductions.length,
            running: activeProductions.filter((p) => p.status === "running").length,
            pending: activeProductions.filter((p) => p.status === "pending").length,
            completed: activeProductions.filter((p) => p.status === "completed").length,
            paused: activeProductions.filter((p) => p.status === "paused").length,
            avgEfficiency:
                activeProductions.length > 0
                    ? Math.round(
                        activeProductions
                            .filter((p) => p.expectedOutput > 0)
                            .reduce((acc, p) => acc + (p.producedQuantity / p.expectedOutput) * 100, 0) /
                        Math.max(activeProductions.filter((p) => p.expectedOutput > 0).length, 1)
                    )
                    : 0,
        };
    }, [activeProductions]);

    // ── Date Filter ───────────────────────────────────────
    type DateFilter = "today" | "week" | "month" | null;
    const [dateFilter, setDateFilter] = useState<DateFilter>(null);

    // ── Restore cached state on mount ─────────────────────
    useEffect(() => {
        const cached = restoreState();
        if (cached) {
            if (cached.statusFilter) setStatusFilter(cached.statusFilter as string);
            if (cached.dateFilter !== undefined) setDateFilter(cached.dateFilter as DateFilter);
            if (Array.isArray(cached.productions) && (cached.productions as any[]).length > 0) {
                setProductions(cached.productions as Production[]);
                setLoading(false);
                setRestoredFromCache(true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Persist on unmount ────────────────────────────────
    const persistRef = useRef({ statusFilter, dateFilter, productions });
    useEffect(() => { persistRef.current = { statusFilter, dateFilter, productions }; });
    useEffect(() => {
        return () => {
            persist({ ...persistRef.current, scrollY: scrollYRef.current });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Status + Date pre-filter ──────────────────────────
    const preFiltered = useMemo(() => {
        const now = new Date();
        return activeProductions.filter((p) => {
            // Status filter
            if (statusFilter !== "all" && p.status !== statusFilter) return false;
            // Date filter
            if (dateFilter) {
                const created = new Date(p.createdAt);
                if (dateFilter === "today") {
                    return created.toDateString() === now.toDateString();
                } else if (dateFilter === "week") {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return created >= weekAgo;
                } else if (dateFilter === "month") {
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return created >= monthAgo;
                }
            }
            return true;
        });
    }, [activeProductions, statusFilter, dateFilter]);

    // ── URL Sync ─────────────────────────────────────────
    const { initialPage, initialSearch, syncToURL } = useURLSyncedPagination();

    // ── Pagination + Search ──────────────────────────────
    const {
        searchQuery,
        handleSearch,
        currentPage,
        setCurrentPage,
        totalPages,
        totalFiltered,
        paginatedData: filtered,
        debouncedQuery,
    } = usePaginatedSearch({
        data: preFiltered,
        searchFields: ["orderProductName", "batchNumber", "clientName", "machineName"],
        pageSize: 15,
        initialPage,
        initialSearch,
    });

    // ── Sync to URL on state change ──────────────────────
    useEffect(() => {
        syncToURL({
            page: currentPage,
            search: debouncedQuery,
            filters: { status: statusFilter === "all" ? null : statusFilter, dateFilter },
        });
    }, [currentPage, debouncedQuery, statusFilter, dateFilter, syncToURL]);

    // ── Scroll-to-top on page change ─────────────────────
    const listContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (currentPage > 1) {
            listContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [currentPage]);

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
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4 md:space-y-6">
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
            </motion.div>

            {/* ── Enterprise Toolbar (3-Layer Hierarchy) ── */}
            <motion.div
                variants={staggerItem}
                className={cn(
                    // Normal flow on mobile, sticky on desktop
                    "md:sticky md:top-[56px] md:z-30",
                    "shrink-0 pb-4 -mx-1 px-1 mb-2",
                    // Glass surface — only needed on desktop where sticky is active
                    "md:bg-[rgba(243,245,249,0.88)] md:backdrop-blur-xl",
                    "md:dark:bg-[rgba(8,12,24,0.82)]",
                    // Bottom hairline
                    "border-b border-[rgba(15,23,42,0.06)] dark:border-[rgba(255,255,255,0.06)]",
                )}
            >
                <div className="space-y-3">

                    {/* ROW 1 — Search + Primary Action */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        {/* Search Bar */}
                        <div className="flex-1 relative">
                            <Search
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
                                size={16}
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search by product, batch, client..."
                                id="production-search"
                                className={cn(
                                    "w-full h-10 pl-10 pr-10 rounded-[12px] text-[14px] transition-all duration-200",
                                    // Light mode
                                    "bg-[rgba(255,255,255,0.72)] border border-[rgba(15,23,42,0.08)]",
                                    "text-foreground placeholder:text-muted-foreground/60",
                                    "shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
                                    // Dark mode
                                    "dark:bg-[rgba(255,255,255,0.06)] dark:border-[rgba(255,255,255,0.08)]",
                                    "dark:placeholder:text-[rgba(148,163,184,0.72)]",
                                    "dark:shadow-none",
                                    // Focus
                                    "focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]",
                                    "dark:focus:border-[rgba(37,99,235,0.5)] dark:focus:ring-[rgba(37,99,235,0.2)]",
                                    // Caret
                                    "caret-primary",
                                )}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => handleSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-150 cursor-pointer"
                                    aria-label="Clear search"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Create Production — PRIMARY CTA */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => router.push("/dashboard/production/create")}
                                className="flex items-center gap-2 h-10 px-4 rounded-[12px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.35)] transition-all duration-200 active:scale-[0.98] cursor-pointer"
                                id="create-production-toolbar-btn"
                            >
                                <Plus size={15} />
                                <span className="hidden sm:inline">Create Production</span>
                                <span className="sm:hidden">Create</span>
                            </button>
                        </div>
                    </div>

                    {/* ROW 2 + ROW 3 — Filters + Result Count */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                        {/* LEFT — Status Pills + Date Dropdown */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {/* Status Filter Pills */}
                            {([
                                { key: "all", label: "All" },
                                { key: "running", label: "Running" },
                                { key: "pending", label: "Pending" },
                                { key: "paused", label: "Paused" },
                                { key: "completed", label: "Completed" },
                            ] as { key: string; label: string }[]).map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter(item.key);
                                        setCurrentPage(1);
                                    }}
                                    className={cn(
                                        "h-8 px-3.5 rounded-[10px] text-[12.5px] font-medium border transition-all duration-150 cursor-pointer",
                                        statusFilter === item.key
                                            ? "bg-[#2563EB] text-white border-transparent shadow-sm shadow-[rgba(37,99,235,0.25)]"
                                            : cn(
                                                "bg-[rgba(255,255,255,0.60)] hover:bg-white text-[#64748B] hover:text-[#0F172A]",
                                                "border-[rgba(15,23,42,0.08)] hover:border-[rgba(15,23,42,0.14)]",
                                                "dark:bg-[rgba(255,255,255,0.06)] dark:hover:bg-[rgba(255,255,255,0.10)]",
                                                "dark:text-[#94A3B8] dark:hover:text-[#E2E8F0]",
                                                "dark:border-[rgba(255,255,255,0.08)] dark:hover:border-[rgba(255,255,255,0.14)]",
                                            )
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}

                            {/* Divider between pills and date dropdown */}
                            <div className="hidden sm:block w-px h-5 bg-[rgba(15,23,42,0.10)] dark:bg-[rgba(255,255,255,0.08)] mx-1" />

                            {/* Date Range Dropdown */}
                            <select
                                value={dateFilter ?? ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setDateFilter(val === "" ? null : val as DateFilter);
                                    setCurrentPage(1);
                                }}
                                className={cn(
                                    "h-8 pl-3 pr-8 min-w-[130px] max-w-[170px] rounded-[10px] text-[12.5px] font-medium",
                                    "transition-all duration-150 cursor-pointer appearance-none",
                                    "bg-[rgba(255,255,255,0.60)] hover:bg-white text-[#64748B]",
                                    "border border-[rgba(15,23,42,0.08)] hover:border-[rgba(15,23,42,0.14)]",
                                    "dark:bg-[rgba(255,255,255,0.06)] dark:hover:bg-[rgba(255,255,255,0.10)]",
                                    "dark:text-[#94A3B8] dark:border-[rgba(255,255,255,0.08)] dark:hover:border-[rgba(255,255,255,0.14)]",
                                    "focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]",
                                    "dark:focus:border-[rgba(37,99,235,0.5)] dark:focus:ring-[rgba(37,99,235,0.2)]",
                                    "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20fill=%27none%27%20viewBox=%270%200%2024%2024%27%3E%3Cpath%20stroke=%27%2364748B%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%272%27%20d=%27m6%209%206%206%206-6%27/%3E%3C/svg%3E')]",
                                    "bg-no-repeat bg-[right_10px_center]",
                                )}
                                id="production-date-filter"
                            >
                                <option value="">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>

                            {/* Clear — only when filters/search are active */}
                            {(searchQuery || statusFilter !== "all" || dateFilter) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleSearch("");
                                        setStatusFilter("all");
                                        setDateFilter(null);
                                        setCurrentPage(1);
                                    }}
                                    className={cn(
                                        "h-8 px-3 rounded-[10px] text-[12.5px] font-medium transition-all duration-150 cursor-pointer",
                                        "text-muted-foreground/70 hover:text-muted-foreground",
                                        "border border-dashed",
                                        "border-[rgba(15,23,42,0.12)] hover:border-[rgba(15,23,42,0.20)]",
                                        "dark:border-[rgba(255,255,255,0.10)] dark:hover:border-[rgba(255,255,255,0.20)]",
                                        "bg-transparent hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[rgba(255,255,255,0.06)]",
                                    )}
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* RIGHT — Result Count (passive metadata) */}
                        <p className="text-[12.5px] text-muted-foreground/70 font-medium whitespace-nowrap shrink-0 sm:text-right tabular-nums">
                            {statusFilter !== "all" || dateFilter
                                ? `Showing ${totalFiltered} of ${productions.length} productions`
                                : `${totalFiltered} of ${productions.length} productions`
                            }
                        </p>
                    </div>

                </div>
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

            {/* ── Productions List ── */}
            <motion.div variants={staggerItem}>
                <IOSCard variant="elevated" padding="none" className="md:overflow-hidden">
                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-[1fr_120px_1fr_160px_120px_60px] gap-4 px-5 py-3 border-b border-border bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                        {["Production", "Status", "Progress", "Machine / Operator", "Order", ""].map((h) => (
                            <span key={h} className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{h}</span>
                        ))}
                    </div>

                    {/* Body — no max-h on mobile (page scrolls), contained scroll on desktop */}
                    <div ref={listContainerRef} className="md:max-h-[calc(100vh-280px)] md:overflow-auto md:overscroll-contain">
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
                        <TableEmptyState
                            variant={searchQuery ? "no-results" : "no-data"}
                            title={searchQuery ? "No productions match your search" : "No productions found"}
                            subtitle={searchQuery || statusFilter !== "all" || dateFilter
                                ? "Try adjusting your filters to find what you're looking for."
                                : "Create your first production to start tracking runs."}
                            action={!searchQuery && statusFilter === "all" && !dateFilter ? {
                                label: "Create First Production",
                                onClick: () => router.push("/dashboard/production/create"),
                            } : undefined}
                        />
                    ) : (
                        <div className="divide-y divide-border">
                            {filtered.map((production, index) => {
                                const sc = statusConfig[production.status as ProductionStatus] || { label: "Closed", color: "red" as const, icon: X };

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
                                                {production.orderQuantity} {production.outputUnit ?? "units"}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        className="h-[34px] w-[34px] rounded-md flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 hover:bg-muted transition-all cursor-pointer"
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
                    </div>
                </IOSCard>

                {/* ── Pagination ── */}
                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalFiltered}
                    pageSize={15}
                    onPageChange={setCurrentPage}
                />
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
