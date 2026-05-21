"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ClipboardList,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Package,
    Truck,
    Activity,
    CalendarDays,
    ListTodo,
    Layers,
    Cpu,
    Users2,
    Timer,
    CircleDot,
    Inbox,
    ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { IOSCard, IOSCardHeader, IOSCardContent } from "@/components/ui/ios/IOSCard";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { staggerContainer, staggerItem } from "@/styles/animations";

// ─── Types ───────────────────────────────────────────────
interface WorkPanelStats {
    assignedOrders: number;
    todaysTasks: number;
    pendingWork: number;
    completedTasks: number;
}

interface AssignedOrder {
    _id: string;
    orderNumber: string;
    clientName: string;
    status: string;
    priority: string;
    dueDate: string;
    items?: number;
}

interface TaskItem {
    id: string;
    title: string;
    type: "production" | "packing" | "inventory" | "order";
    status: "pending" | "in_progress" | "completed";
    priority: "high" | "medium" | "low";
    dueTime?: string;
}

// ─── Status/Priority Color Maps ──────────────────────────
const statusColors: Record<string, string> = {
    pending: "bg-[rgba(255,149,0,0.12)] text-[var(--erp-warning)]",
    in_progress: "bg-[rgba(0,122,255,0.12)] text-[var(--primary)]",
    processing: "bg-[rgba(0,122,255,0.12)] text-[var(--primary)]",
    completed: "bg-[rgba(52,199,89,0.12)] text-[var(--erp-success)]",
    dispatched: "bg-[rgba(88,86,214,0.12)] text-[var(--chart-5)]",
    cancelled: "bg-[rgba(255,59,48,0.12)] text-[var(--destructive)]",
};

const priorityDots: Record<string, string> = {
    high: "bg-[var(--destructive)]",
    medium: "bg-[var(--erp-warning)]",
    low: "bg-[var(--erp-success)]",
};

const taskTypeIcons: Record<string, any> = {
    production: Activity,
    packing: Truck,
    inventory: Package,
    order: ClipboardList,
};

// ─── Glass Mini Card ─────────────────────────────────────
function GlassMiniCard({
    icon: Icon,
    label,
    value,
    color,
    href,
    delay = 0,
}: {
    icon: any;
    label: string;
    value: string | number;
    color: string;
    href?: string;
    delay?: number;
}) {
    const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
        blue: { bg: "rgba(0,122,255,0.10)", text: "var(--primary)", glow: "rgba(0,122,255,0.15)" },
        green: { bg: "rgba(52,199,89,0.10)", text: "var(--erp-success)", glow: "rgba(52,199,89,0.15)" },
        orange: { bg: "rgba(255,149,0,0.10)", text: "var(--erp-warning)", glow: "rgba(255,149,0,0.15)" },
        purple: { bg: "rgba(88,86,214,0.10)", text: "var(--chart-5)", glow: "rgba(88,86,214,0.15)" },
        red: { bg: "rgba(255,59,48,0.10)", text: "var(--destructive)", glow: "rgba(255,59,48,0.15)" },
        cyan: { bg: "rgba(90,200,250,0.10)", text: "#5AC8FA", glow: "rgba(90,200,250,0.15)" },
    };
    const c = colorMap[color] || colorMap.blue;

    const content = (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="group relative overflow-hidden rounded-[16px] p-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: `0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 20px ${c.glow}`,
            }}
        >
            {/* Subtle glow dot */}
            <div
                className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-40 blur-xl"
                style={{ background: c.text }}
            />
            <div className="relative flex items-center gap-3">
                <div
                    className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: c.bg }}
                >
                    <Icon className="h-[18px] w-[18px]" style={{ color: c.text }} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[22px] font-bold text-[var(--foreground)] leading-[26px] tracking-tight">
                        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
                    </p>
                    <p className="text-[12px] font-medium text-[var(--muted-foreground)] leading-[16px] mt-0.5 truncate">
                        {label}
                    </p>
                </div>
                {href && (
                    <ArrowUpRight className="h-3.5 w-3.5 text-[var(--muted-foreground)] group-hover:text-[var(--muted-foreground)] transition-colors flex-shrink-0" />
                )}
            </div>
        </motion.div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }
    return content;
}

// ─── Side Panel Status Item ──────────────────────────────
function StatusItem({
    icon: Icon,
    label,
    count,
    color,
    href,
    delay = 0,
}: {
    icon: any;
    label: string;
    count: number;
    color: string;
    href?: string;
    delay?: number;
}) {
    const colorMap: Record<string, { bg: string; text: string }> = {
        blue: { bg: "rgba(0,122,255,0.10)", text: "var(--primary)" },
        green: { bg: "rgba(52,199,89,0.10)", text: "var(--erp-success)" },
        orange: { bg: "rgba(255,149,0,0.10)", text: "var(--erp-warning)" },
        red: { bg: "rgba(255,59,48,0.10)", text: "var(--destructive)" },
        purple: { bg: "rgba(88,86,214,0.10)", text: "var(--chart-5)" },
        cyan: { bg: "rgba(90,200,250,0.10)", text: "#5AC8FA" },
    };
    const c = colorMap[color] || colorMap.blue;

    const content = (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-[var(--muted)] transition-all cursor-pointer group active:scale-[0.98]"
        >
            <div
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
                style={{ background: c.bg }}
            >
                <Icon className="h-[16px] w-[16px]" style={{ color: c.text }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[var(--foreground)] leading-[18px] truncate">
                    {label}
                </p>
            </div>
            <span
                className="text-[13px] font-semibold tabular-nums px-2 py-0.5 rounded-full"
                style={{ background: c.bg, color: c.text }}
            >
                {count}
            </span>
            {href && (
                <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)] group-hover:text-[var(--muted-foreground)] transition-colors flex-shrink-0" />
            )}
        </motion.div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }
    return content;
}

// ═════════════════════════════════════════════════════════
// STAFF WORK PANEL — 3-Column Layout
// ═════════════════════════════════════════════════════════
export default function StaffWorkPanel({ userName }: { userName?: string }) {
    const [stats, setStats] = useState<WorkPanelStats | null>(null);
    const [orders, setOrders] = useState<AssignedOrder[]>([]);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorkPanelData = async () => {
            try {
                const res = await fetch("/api/staff/work-panel");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.stats || {
                        assignedOrders: 0,
                        todaysTasks: 0,
                        pendingWork: 0,
                        completedTasks: 0,
                    });
                    setOrders(data.assignedOrders || []);
                    setTasks(data.todaysTasks || []);
                } else {
                    setStats({ assignedOrders: 0, todaysTasks: 0, pendingWork: 0, completedTasks: 0 });
                }
            } catch (error) {
                console.error("Failed to fetch work panel data:", error);
                setStats({ assignedOrders: 0, todaysTasks: 0, pendingWork: 0, completedTasks: 0 });
            } finally {
                setLoading(false);
            }
        };

        fetchWorkPanelData();
    }, []);

    const formatDate = (date: string) => {
        if (!date) return "—";
        const d = new Date(date);
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    // Compute order status counts
    const orderStatusCounts = {
        new: orders.filter(o => o.status === "pending" || o.status === "new").length,
        inProgress: orders.filter(o => o.status === "processing" || o.status === "in_progress").length,
        completed: orders.filter(o => o.status === "completed" || o.status === "dispatched").length,
        delayed: orders.filter(o => {
            if (!o.dueDate) return false;
            return new Date(o.dueDate) < new Date() && o.status !== "completed" && o.status !== "dispatched" && o.status !== "cancelled";
        }).length,
    };

    // ─── Loading State ─────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="h-[34px] w-[200px] rounded-[10px] bg-[var(--muted)] shimmer" />
                    <div className="h-[20px] w-[300px] rounded-[8px] bg-[var(--muted)] shimmer" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-[320px] rounded-[16px] bg-[var(--muted)] shimmer" />
                    <div className="h-[320px] rounded-[16px] bg-[var(--muted)] shimmer" />
                    <div className="h-[320px] rounded-[16px] bg-[var(--muted)] shimmer" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="h-[340px] rounded-[16px] bg-[var(--muted)] shimmer" />
                    <div className="h-[340px] rounded-[16px] bg-[var(--muted)] shimmer" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
        >
            {/* ── Page Header ── */}
            <motion.div variants={staggerItem} className="flex items-end justify-between">
                <div>
                    <h1 className="text-[34px] font-bold text-[var(--foreground)] leading-[41px] tracking-[0.37px]">
                        Work Panel
                    </h1>
                    <p className="text-[15px] text-[var(--muted-foreground)] mt-1 leading-[20px]">
                        {getGreeting()}{userName ? `, ${userName}` : ""}. Here are your tasks for today.
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <Link href="/dashboard/orders">
                        <IOSButton variant="filled" size="medium" icon={<ClipboardList className="h-4 w-4" />}>
                            View Orders
                        </IOSButton>
                    </Link>
                </div>
            </motion.div>

            {/* ════════════════════════════════════════════════════════
              ── 3-COLUMN LAYOUT: Orders | Center Widgets | Production ──
              ════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* ── LEFT: Orders Design Panel ── */}
                <motion.div variants={staggerItem}>
                    <IOSCard variant="elevated" padding="lg" className="h-full">
                        <IOSCardHeader
                            title="Order Status"
                            subtitle={`${orders.length} total`}
                            action={
                                <Link href="/dashboard/orders">
                                    <IOSButton variant="plain" size="small">View All</IOSButton>
                                </Link>
                            }
                        />
                        <IOSCardContent>
                            <div className="space-y-1">
                                <StatusItem
                                    icon={Inbox}
                                    label="New Orders"
                                    count={orderStatusCounts.new}
                                    color="blue"
                                    href="/dashboard/orders"
                                    delay={0}
                                />
                                <div className="h-px bg-[var(--border-divider)] mx-3" />
                                <StatusItem
                                    icon={Timer}
                                    label="In Progress"
                                    count={orderStatusCounts.inProgress}
                                    color="orange"
                                    href="/dashboard/orders"
                                    delay={0.05}
                                />
                                <div className="h-px bg-[var(--border-divider)] mx-3" />
                                <StatusItem
                                    icon={CheckCircle2}
                                    label="Completed"
                                    count={orderStatusCounts.completed}
                                    color="green"
                                    href="/dashboard/orders"
                                    delay={0.1}
                                />
                                <div className="h-px bg-[var(--border-divider)] mx-3" />
                                <StatusItem
                                    icon={AlertCircle}
                                    label="Delayed"
                                    count={orderStatusCounts.delayed}
                                    color="red"
                                    href="/dashboard/orders"
                                    delay={0.15}
                                />
                            </div>

                            {/* Recent assigned orders list */}
                            {orders.length > 0 && (
                                <div className="mt-5 pt-4 border-t border-[var(--border-divider)]">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)] px-1 mb-2">
                                        Recent Assigned
                                    </p>
                                    <div className="space-y-0.5">
                                        {orders.slice(0, 3).map((order) => (
                                            <Link key={order._id} href="/dashboard/orders">
                                                <div className="flex items-center gap-2.5 p-2.5 rounded-[10px] hover:bg-[var(--muted)] transition-colors cursor-pointer group">
                                                    {order.priority && (
                                                        <div className={cn("w-[5px] h-[5px] rounded-full flex-shrink-0", priorityDots[order.priority] || priorityDots.medium)} />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-medium text-[var(--foreground)] truncate">
                                                            {order.orderNumber || `#${order._id.slice(-6)}`}
                                                        </p>
                                                        <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                                                            {order.clientName || "—"} · {formatDate(order.dueDate)}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize",
                                                            statusColors[order.status] || "bg-[var(--muted)] text-[var(--muted-foreground)]"
                                                        )}
                                                    >
                                                        {order.status || "pending"}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </IOSCardContent>
                    </IOSCard>
                </motion.div>

                {/* ── CENTER: Summary Widgets ── */}
                <motion.div variants={staggerItem} className="flex flex-col gap-4">
                    {/* Total Orders Widget */}
                    <GlassMiniCard
                        icon={ClipboardList}
                        label="Total Orders"
                        value={stats?.assignedOrders ?? 0}
                        color="blue"
                        href="/dashboard/orders"
                        delay={0.05}
                    />

                    {/* Completed Tasks Widget */}
                    <GlassMiniCard
                        icon={CheckCircle2}
                        label="Completed Tasks"
                        value={stats?.completedTasks ?? 0}
                        color="green"
                        delay={0.1}
                    />

                    {/* Pending Work Widget */}
                    <GlassMiniCard
                        icon={Clock}
                        label="Pending Work"
                        value={stats?.pendingWork ?? 0}
                        color="orange"
                        delay={0.15}
                    />

                    {/* Today's Tasks Widget */}
                    <GlassMiniCard
                        icon={CalendarDays}
                        label="Today's Tasks"
                        value={stats?.todaysTasks ?? 0}
                        color="purple"
                        delay={0.2}
                    />
                </motion.div>

                {/* ── RIGHT: Production Tools Panel ── */}
                <motion.div variants={staggerItem}>
                    <IOSCard variant="elevated" padding="lg" className="h-full">
                        <IOSCardHeader
                            title="Production Tools"
                            subtitle="Quick access"
                        />
                        <IOSCardContent>
                            <div className="space-y-1">
                                <StatusItem
                                    icon={Layers}
                                    label="Production Queue"
                                    count={stats?.assignedOrders ?? 0}
                                    color="blue"
                                    href="/dashboard/production"
                                    delay={0}
                                />
                                <div className="h-px bg-[var(--border-divider)] mx-3" />
                                <StatusItem
                                    icon={Package}
                                    label="Material Status"
                                    count={0}
                                    color="cyan"
                                    href="/dashboard/inventory"
                                    delay={0.05}
                                />
                                <div className="h-px bg-[var(--border-divider)] mx-3" />
                                <StatusItem
                                    icon={Cpu}
                                    label="Machine Status"
                                    count={0}
                                    color="purple"
                                    href="/dashboard/production"
                                    delay={0.1}
                                />
                                <div className="h-px bg-[var(--border-divider)] mx-3" />
                                <StatusItem
                                    icon={Users2}
                                    label="Worker Status"
                                    count={0}
                                    color="green"
                                    delay={0.15}
                                />
                            </div>

                            {/* Quick Navigation links */}
                            <div className="mt-5 pt-4 border-t border-[var(--border-divider)]">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)] px-1 mb-2">
                                    Quick Links
                                </p>
                                <div className="space-y-0.5">
                                    {[
                                        { label: "My Orders", icon: ClipboardList, href: "/dashboard/orders", color: "blue" },
                                        { label: "Production", icon: Activity, href: "/dashboard/production", color: "green" },
                                        { label: "Inventory", icon: Package, href: "/dashboard/inventory", color: "orange" },
                                    ].map((action, idx, arr) => (
                                        <Link key={action.label} href={action.href}>
                                            <div className="flex items-center gap-2.5 p-2.5 rounded-[10px] hover:bg-[var(--muted)] transition-colors cursor-pointer group">
                                                <action.icon className="h-[14px] w-[14px] text-[var(--muted-foreground)] group-hover:text-[var(--muted-foreground)] transition-colors" />
                                                <span className="text-[13px] font-medium text-[var(--foreground)] flex-1">
                                                    {action.label}
                                                </span>
                                                <ChevronRight className="h-3 w-3 text-[var(--muted-foreground)] group-hover:text-[var(--muted-foreground)] transition-colors" />
                                            </div>
                                            {idx < arr.length - 1 && (
                                                <div className="h-px bg-[var(--border-divider)] mx-3" />
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </IOSCardContent>
                    </IOSCard>
                </motion.div>
            </div>

            {/* ════════════════════════════════════════════════════════
              ── BOTTOM: Detailed Orders + Today's Tasks ──
              ════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* My Assigned Orders */}
                <motion.div variants={staggerItem}>
                    <IOSCard variant="stitch-elevated" padding="lg" className="h-full glass-premium">
                        <IOSCardHeader
                            title="My Assigned Orders"
                            subtitle={`${orders.length} order${orders.length !== 1 ? "s" : ""}`}
                            action={
                                <Link href="/dashboard/orders">
                                    <IOSButton variant="plain" size="small">
                                        View All
                                    </IOSButton>
                                </Link>
                            }
                        />
                        <IOSCardContent>
                            {orders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-[56px] h-[56px] rounded-[16px] bg-[rgba(0,122,255,0.08)] flex items-center justify-center mb-4">
                                        <ClipboardList className="h-[24px] w-[24px] text-[var(--primary)]" />
                                    </div>
                                    <p className="text-[15px] font-medium text-[var(--muted-foreground)]">
                                        No orders assigned yet
                                    </p>
                                    <p className="text-[13px] text-[var(--muted-foreground)] mt-1">
                                        Orders will appear here when assigned to you
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {orders.slice(0, 6).map((order, idx) => (
                                        <Link key={order._id} href="/dashboard/orders">
                                            <motion.div
                                                className="flex items-center gap-3 p-3 rounded-[10px] hover:bg-[var(--muted)] transition-colors cursor-pointer group"
                                                whileTap={{ scale: 0.97 }}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        {order.priority && (
                                                            <div className={cn("w-[6px] h-[6px] rounded-full flex-shrink-0", priorityDots[order.priority] || priorityDots.medium)} />
                                                        )}
                                                        <p className="text-[15px] font-medium text-[var(--foreground)] truncate leading-[20px]">
                                                            {order.orderNumber || `Order #${order._id.slice(-6)}`}
                                                        </p>
                                                    </div>
                                                    <p className="text-[13px] text-[var(--muted-foreground)] truncate leading-[18px] ml-[14px]">
                                                        {order.clientName || "—"} · Due {formatDate(order.dueDate)}
                                                    </p>
                                                </div>
                                                <span
                                                    className={cn(
                                                        "text-[12px] font-medium px-2 py-0.5 rounded-full capitalize",
                                                        order.status === "completed" ? "bg-[rgba(52,199,89,0.12)] text-[var(--erp-success)]" :
                                                            order.status === "pending" ? "bg-[rgba(255,149,0,0.12)] text-[var(--erp-warning)]" :
                                                                order.status === "processing" || order.status === "in_progress" ? "bg-[rgba(0,122,255,0.12)] text-[var(--primary)]" :
                                                                    "bg-[var(--muted)] text-[var(--muted-foreground)]"
                                                    )}
                                                >
                                                    {order.status || "pending"}
                                                </span>
                                                <ChevronRight className="h-[14px] w-[14px] text-[var(--muted-foreground)] group-hover:text-[var(--muted-foreground)] transition-colors flex-shrink-0" />
                                            </motion.div>
                                            {idx < Math.min(orders.length, 6) - 1 && (
                                                <div className="h-px bg-[var(--border-divider)] mx-3" />
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </IOSCardContent>
                    </IOSCard>
                </motion.div>

                {/* Today's Tasks */}
                <motion.div variants={staggerItem}>
                    <IOSCard variant="stitch-elevated" padding="lg" className="h-full glass-premium">
                        <IOSCardHeader
                            title="Today's Tasks"
                            subtitle={`${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
                        />
                        <IOSCardContent>
                            {tasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-[56px] h-[56px] rounded-[16px] bg-[rgba(52,199,89,0.08)] flex items-center justify-center mb-4">
                                        <ListTodo className="h-[24px] w-[24px] text-[var(--erp-success)]" />
                                    </div>
                                    <p className="text-[15px] font-medium text-[var(--muted-foreground)]">
                                        All caught up!
                                    </p>
                                    <p className="text-[13px] text-[var(--muted-foreground)] mt-1">
                                        No tasks scheduled for today
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {tasks.map((task, idx) => {
                                        const TaskIcon = taskTypeIcons[task.type] || ListTodo;
                                        return (
                                            <div key={task.id}>
                                                <motion.div
                                                    className="flex items-center gap-3 p-3 rounded-[10px] hover:bg-[var(--muted)] transition-colors"
                                                    whileTap={{ scale: 0.97 }}
                                                >
                                                    <div
                                                        className={cn(
                                                            "w-[36px] h-[36px] rounded-[8px] flex items-center justify-center flex-shrink-0",
                                                            task.status === "completed"
                                                                ? "bg-[rgba(52,199,89,0.12)] text-[var(--erp-success)]"
                                                                : task.status === "in_progress"
                                                                    ? "bg-[rgba(0,122,255,0.12)] text-[var(--primary)]"
                                                                    : "bg-[rgba(255,149,0,0.12)] text-[var(--erp-warning)]"
                                                        )}
                                                    >
                                                        {task.status === "completed" ? (
                                                            <CheckCircle2 className="h-[16px] w-[16px]" />
                                                        ) : (
                                                            <TaskIcon className="h-[16px] w-[16px]" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p
                                                            className={cn(
                                                                "text-[15px] font-medium truncate leading-[20px]",
                                                                task.status === "completed"
                                                                    ? "text-[var(--muted-foreground)] line-through"
                                                                    : "text-[var(--foreground)]"
                                                            )}
                                                        >
                                                            {task.title}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[12px] text-[var(--muted-foreground)] capitalize">
                                                                {task.type}
                                                            </span>
                                                            {task.dueTime && (
                                                                <>
                                                                    <span className="text-[var(--muted-foreground)]">·</span>
                                                                    <span className="text-[12px] text-[var(--muted-foreground)]">
                                                                        {task.dueTime}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {task.priority && (
                                                        <div className={cn("w-[6px] h-[6px] rounded-full flex-shrink-0", priorityDots[task.priority])} />
                                                    )}
                                                </motion.div>
                                                {idx < tasks.length - 1 && (
                                                    <div className="h-px bg-[var(--border-divider)] mx-3" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </IOSCardContent>
                    </IOSCard>
                </motion.div>
            </div>
        </motion.div>
    );
}
