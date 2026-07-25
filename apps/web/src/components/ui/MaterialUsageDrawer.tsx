"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { X, Package, Factory, Clock, BarChart3, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
    springModal,
    variantsBackdrop,
} from "@/lib/motion";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface MaterialUsageDrawerProps {
    material: {
        id: string;
        name: string;
        quantity: number;
        unit: string;
    } | null;
    onClose: () => void;
}

interface UsageLog {
    productionId: string;
    orderId: string;
    orderProductName: string;
    batchNumber: string;
    operatorName: string;
    status: string;
    materialName: string;
    qtyUsed: number;
    unit: string;
    date: string;
    source?: "production" | "order";
}

interface UsageStats {
    totalUsed: number;
    productionCount: number;
    pendingCount: number;
    avgPerUse: number;
    totalRecords: number;
}

type FilterType = "all" | "completed" | "in_progress" | "pending" | "cancelled";

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; dot: string }> = {
    completed: { color: "#34D399", bg: "rgba(52,211,153,0.12)", label: "Completed", dot: "#34D399" },
    in_progress: { color: "#FBBF24", bg: "rgba(251,191,36,0.12)", label: "In Progress", dot: "#FBBF24" },
    processing: { color: "#60A5FA", bg: "rgba(96,165,250,0.12)", label: "In Production", dot: "#60A5FA" },
    pending: { color: "#60A5FA", bg: "rgba(96,165,250,0.12)", label: "Pending", dot: "#60A5FA" },
    cancelled: { color: "#F87171", bg: "rgba(248,113,113,0.12)", label: "Cancelled", dot: "#F87171" },
};

export function MaterialUsageDrawer({ material, onClose }: MaterialUsageDrawerProps) {
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<FilterType>("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchUsage = useCallback(async (materialId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/inventory/${materialId}/usage`);
            const json = await res.json();
            if (json.success) {
                setLogs(json.data.logs || []);
                setStats(json.data.stats || null);
            }
        } catch {
            console.error("Failed to fetch usage");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (material?.id) {
            setFilter("all");
            setExpandedId(null);
            fetchUsage(material.id);
        }
    }, [material?.id, fetchUsage]);

    const filteredLogs = useMemo(() => {
        if (filter === "all") return logs;
        return logs.filter(l => l.status === filter);
    }, [logs, filter]);

    const filteredTotal = useMemo(() => {
        return filteredLogs.reduce((s, l) => s + Number(l.qtyUsed || 0), 0);
    }, [filteredLogs]);

    const maxQty = useMemo(() => {
        return Math.max(...filteredLogs.map(l => Number(l.qtyUsed || 0)), 1);
    }, [filteredLogs]);

    const isOpen = !!material;

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        if (isOpen) window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    const filters: { key: FilterType; label: string }[] = [
        { key: "all", label: "All" },
        { key: "completed", label: "Completed" },
        { key: "in_progress", label: "In Progress" },
        { key: "pending", label: "Pending" },
    ];

    // Body scroll lock — centralized, reference-counted
    useBodyScrollLock(isOpen);

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <>
                    {/* Backdrop */}
                    {/* Tier A fade — spring lives on the drawer, not the scrim */}
                    {/* onPointerDown (not onClick) — iOS Safari reliability fix */}
                    {/*
                        ⚠ CAPACITOR NOTE: this backdrop has backdropFilter: blur(4px).
                        If you see jank on mobile (Capacitor build), remove the blur and
                        keep just background rgba — blur + spring repaint can drop frames
                        on older Android WebViews.
                    */}
                    <motion.div
                        variants={variantsBackdrop}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-0 z-50"
                        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
                        onPointerDown={onClose}
                    />

                    {/* Drawer */}
                    {/* Tier B spring — stiffness 300 / damping 25, matches variantsSheetSlideUp axis but x-axis here */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={springModal}
                        className="fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] flex flex-col"
                        style={{ background: "#0e1117", borderLeft: "1px solid rgba(255,255,255,0.05)" }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Escape') onClose(); }}
                        tabIndex={-1}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "rgba(96,165,250,0.1)" }}>
                                    <Package className="h-[18px] w-[18px] text-blue-400" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-[17px] font-bold text-white truncate">{material?.name}</h2>
                                    <p className="text-[13px] text-white/50">
                                        Stock: <span className="text-white/80 font-semibold">{material?.quantity} {material?.unit}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
                            >
                                <X className="h-[18px] w-[18px] text-white/60" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {loading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="h-[60px] rounded-[12px] shimmer" style={{ background: "rgba(255,255,255,0.04)" }} />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    {/* Stats Row */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: "Total Used", value: `${stats?.totalUsed || 0} ${material?.unit}`, icon: BarChart3, color: "#60A5FA" },
                                            { label: "Productions", value: stats?.productionCount || 0, icon: Factory, color: "#34D399" },
                                            { label: "Avg / Use", value: `${stats?.avgPerUse || 0} ${material?.unit}`, icon: Clock, color: "#FBBF24" },
                                            { label: "Total Records", value: stats?.totalRecords || 0, icon: Package, color: "#A78BFA" },
                                        ].map(s => (
                                            <div
                                                key={s.label}
                                                className="rounded-xl p-3"
                                                style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.05)" }}
                                            >
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                                                    <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{s.label}</span>
                                                </div>
                                                <span className="text-[18px] font-bold text-white block" style={{ fontVariantNumeric: "tabular-nums" }}>
                                                    {s.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Filter Chips */}
                                    <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                                        {filters.map(f => (
                                            <button
                                                key={f.key}
                                                onClick={() => setFilter(f.key)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all",
                                                    filter === f.key
                                                        ? "text-white"
                                                        : "text-white/60 hover:text-white/80"
                                                )}
                                                style={{
                                                    background: filter === f.key ? "#1D9E75" : "rgba(255,255,255,0.05)",
                                                }}
                                            >
                                                {f.label}
                                                {f.key !== "all" && (
                                                    <span className="ml-1 opacity-60">
                                                        {logs.filter(l => f.key === "all" || l.status === f.key).length}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Summary Bar */}
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[12px] text-white/40">
                                            {filteredLogs.length} record{filteredLogs.length !== 1 ? "s" : ""} for <span className="text-white/60 font-medium">{material?.name}</span>
                                        </span>
                                        <span className="text-[12px] text-white/40">
                                            Total consumed: <span className="text-white/80 font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(filteredTotal * 100) / 100} {material?.unit}</span>
                                        </span>
                                    </div>

                                    {/* Timeline List */}
                                    {filteredLogs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="w-[48px] h-[48px] rounded-[12px] flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                                                <AlertCircle className="h-5 w-5 text-white/30" />
                                            </div>
                                            <p className="text-[15px] font-medium text-white/50">No usage records found</p>
                                            <p className="text-[13px] text-white/30 mt-1">
                                                {filter !== "all" ? "Try a different filter" : "This material hasn't been used in any production yet"}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            {/* Vertical connector line */}
                                            <div
                                                className="absolute left-[11px] top-[20px] w-[2px]"
                                                style={{
                                                    height: `calc(100% - 40px)`,
                                                    background: "linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                                                }}
                                            />

                                            <div className="space-y-2">
                                                {filteredLogs.map((log, idx) => {
                                                    const sc = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
                                                    const isExpanded = expandedId === `${log.productionId}-${idx}`;
                                                    const pctOfMax = maxQty > 0 ? (Number(log.qtyUsed) / maxQty) * 100 : 0;

                                                    return (
                                                        <div
                                                            key={`${log.productionId}-${idx}`}
                                                            className="flex gap-3 relative cursor-pointer"
                                                            onClick={() => setExpandedId(isExpanded ? null : `${log.productionId}-${idx}`)}
                                                        >
                                                            {/* Dot */}
                                                            <div className="flex flex-col items-center flex-shrink-0 z-10 pt-4">
                                                                <div
                                                                    className="w-[10px] h-[10px] rounded-full"
                                                                    style={{
                                                                        background: sc.dot,
                                                                        boxShadow: `0 0 8px ${sc.dot}40`,
                                                                    }}
                                                                />
                                                            </div>

                                                            {/* Card */}
                                                            <div
                                                                className="flex-1 rounded-xl p-3 transition-all"
                                                                style={{
                                                                    background: isExpanded ? "#1e2536" : "#1a1f2e",
                                                                    border: `1px solid ${isExpanded ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`,
                                                                }}
                                                            >
                                                                {/* Top row */}
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium block">
                                                                            {log.orderProductName || "—"}
                                                                        </span>
                                                                        <span className="text-[14px] font-semibold text-white block truncate mt-0.5">
                                                                            {log.source === "order"
                                                                                ? (log.batchNumber || log.orderId?.slice(-8).toUpperCase() || "Order")
                                                                                : (log.batchNumber || "No batch")}
                                                                        </span>
                                                                        <span className="text-[11px] text-white/40 mt-0.5 block">
                                                                            {new Date(log.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                                                            {log.operatorName && ` · ${log.operatorName}`}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-right flex-shrink-0">
                                                                        <span className="text-[18px] font-bold text-white block" style={{ fontVariantNumeric: "tabular-nums" }}>
                                                                            {log.qtyUsed}
                                                                        </span>
                                                                        <span className="text-[11px] text-white/40">{log.unit || material?.unit}</span>
                                                                        <div className="mt-1">
                                                                            <span
                                                                                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                                                                style={{ background: sc.bg, color: sc.color }}
                                                                            >
                                                                                {sc.label}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Progress bar */}
                                                                <div className="mt-2.5 h-[4px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                                                    <motion.div
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${Math.min(pctOfMax, 100)}%` }}
                                                                        transition={{ delay: idx * 0.03, duration: 0.5, ease: "easeOut" }}
                                                                        className="h-full rounded-full"
                                                                        style={{ background: sc.dot }}
                                                                    />
                                                                </div>

                                                                {/* Expanded detail */}
                                                                <AnimatePresence>
                                                                    {isExpanded && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: "auto" }}
                                                                            exit={{ opacity: 0, height: 0 }}
                                                                            transition={{ duration: 0.2 }}
                                                                            className="mt-3 pt-3 space-y-2"
                                                                            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                                                                        >
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[11px] text-white/30 uppercase tracking-wider">Product</span>
                                                                                <span className="text-[13px] text-white/70 font-medium">{log.orderProductName || "—"}</span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[11px] text-white/30 uppercase tracking-wider">
                                                                                    {log.source === "order" ? "Order Ref" : "Batch"}
                                                                                </span>
                                                                                <span className="text-[13px] text-white/70 font-medium">{log.batchNumber || "—"}</span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[11px] text-white/30 uppercase tracking-wider">
                                                                                    {log.source === "order" ? "Client" : "Operator"}
                                                                                </span>
                                                                                <span className="text-[13px] text-white/70 font-medium">{log.operatorName || "—"}</span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[11px] text-white/30 uppercase tracking-wider">% of Total</span>
                                                                                <span className="text-[13px] text-white/70 font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                                                                                    {stats?.totalUsed ? Math.round((Number(log.qtyUsed) / stats.totalUsed) * 1000) / 10 : 0}%
                                                                                </span>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
