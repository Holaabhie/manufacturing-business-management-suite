"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    Download,
    IndianRupee,
    Package,
    ShoppingCart,
    Factory,
    BarChart3,
    PieChart,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart as RechartsPie,
    Pie,
    Cell,
} from "recharts";
import { IOSCard, IOSCardHeader, IOSCardContent } from "@/components/ui/ios/IOSCard";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { staggerContainer, staggerItem } from "@/styles/animations";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/excel-export";
import { toast } from "sonner";
import { useRole } from "@/lib/hooks/use-role";
import { AccessDenied } from "@/components/AccessDenied";

// ─── Types ───────────────────────────────────────────────
interface RevenuePoint {
    month: string;
    revenue: number;
    lastYear: number;
}

interface ProductionPoint {
    month: string;
    efficiency: number;
}

interface OrderStatusPoint {
    name: string;
    value: number;
    color: string;
}

interface TopProduct {
    name: string;
    units: number;
    revenue: number;
}

interface InventoryPoint {
    category: string;
    value: number;
}

interface AnalyticsKPIs {
    totalRevenue: number;
    revenueGrowth: number;
    avgEfficiency: number;
    completionRate: number;
    inventoryTurnover: number;
}

interface AnalyticsData {
    revenueData: RevenuePoint[];
    productionData: ProductionPoint[];
    orderStatusData: OrderStatusPoint[];
    topProducts: TopProduct[];
    inventoryData: InventoryPoint[];
    kpis: AnalyticsKPIs;
}

// ─── Chart Tooltip ───────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass rounded-[12px] px-4 py-3 shadow-[var(--shadow-lg)] border border-[var(--border-card)]">
            <p className="text-[13px] font-medium text-[var(--label-secondary)] mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-[15px] font-semibold text-[var(--label-primary)]">
                    {p.name}: {typeof p.value === "number" && p.value > 1000
                        ? `₹${(p.value / 1000).toFixed(0)}K`
                        : `${p.value}%`}
                </p>
            ))}
        </div>
    );
}

// ─── Format Currency ─────────────────────────────────────
function formatCurrency(value: number): string {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
}

// ─── KPI Card ────────────────────────────────────────────
function KPICard({
    label,
    value,
    rawValue,
    change,
    icon: Icon,
    color,
}: {
    label: string;
    value: string;
    rawValue?: number;
    change: number;
    icon: any;
    color: "blue" | "green" | "orange" | "purple";
}) {
    const isPositive = change >= 0;
    const isZero = rawValue === 0 || rawValue === undefined || rawValue === null;
    const hasComparison = change !== 0 && !isZero;
    const displayValue = isZero ? "—" : value;
    const bgMap = {
        blue: "bg-[rgba(0,122,255,0.1)] dark:bg-[rgba(10,132,255,0.15)]",
        green: "bg-[rgba(52,199,89,0.1)] dark:bg-[rgba(48,209,88,0.15)]",
        orange: "bg-[rgba(255,149,0,0.1)] dark:bg-[rgba(255,159,10,0.15)]",
        purple: "bg-[rgba(175,82,222,0.1)] dark:bg-[rgba(191,90,242,0.15)]",
    };
    const iconColorMap = {
        blue: "text-[var(--ios-blue)]",
        green: "text-[var(--ios-green)]",
        orange: "text-[var(--ios-orange)]",
        purple: "text-[var(--ios-purple)]",
    };

    return (
        <motion.div variants={staggerItem}>
            <IOSCard variant="elevated" padding="lg" interactive>
                <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-[40px] h-[40px] rounded-[10px] flex items-center justify-center", bgMap[color])}>
                        <Icon className={cn("h-[18px] w-[18px]", iconColorMap[color])} />
                    </div>
                    <span className="text-[13px] text-[var(--label-secondary)] leading-[18px]">{label}</span>
                </div>
                <div className="flex items-end justify-between">
                    <span className={cn(
                        "text-[28px] font-bold tracking-[0.36px]",
                        isZero ? "text-[var(--label-quaternary)]" : "text-[var(--label-primary)]"
                    )}>{displayValue}</span>
                    {hasComparison && (
                        <span className={cn(
                            "flex items-center gap-0.5 text-[13px] font-semibold px-2 py-0.5 rounded-full",
                            isPositive ? "bg-[rgba(52,199,89,0.12)] text-[var(--ios-green)]" : "bg-[rgba(255,59,48,0.12)] text-[var(--ios-red)]"
                        )}>
                            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(change)}%
                        </span>
                    )}
                </div>
            </IOSCard>
        </motion.div>
    );
}

export default function AnalyticsPage() {
    const { isStaff, loading: roleLoading } = useRole();
    const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);

    // ── Profit Margin State ──
    const [marginData, setMarginData] = useState<any>(null);
    const [marginLoading, setMarginLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    const fetchMargins = useCallback(async () => {
        setMarginLoading(true);
        try {
            const res = await fetch("/api/v1/orders/profit-margins");
            const json = await res.json();
            if (json.success) setMarginData(json.data);
        } catch {
            console.error("Failed to fetch margins");
        } finally {
            setMarginLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/dashboard/analytics?range=${dateRange}`);
                if (!res.ok) throw new Error("Failed to fetch analytics");
                const json = await res.json();
                if (json.error) throw new Error(json.error);
                setData(json);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
                setData({
                    revenueData: [],
                    productionData: [],
                    orderStatusData: [],
                    topProducts: [],
                    inventoryData: [],
                    kpis: {
                        totalRevenue: 0,
                        revenueGrowth: 0,
                        avgEfficiency: 0,
                        completionRate: 0,
                        inventoryTurnover: 0,
                    },
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [dateRange]);

    useEffect(() => {
        fetchMargins();
    }, [fetchMargins]);

    // Block Staff from analytics (revenue data)
    if (!roleLoading && isStaff) {
        return (
            <AccessDenied
                title="Analytics Access Restricted"
                description="The analytics section contains financial data and is only accessible to business owners. Please contact your admin if you need access."
            />
        );
    }

    // ─── Loading State ─────────────────────────────────────
    if (loading || !data) {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="h-[34px] w-[200px] rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
                    <div className="h-[20px] w-[320px] rounded-[8px] bg-[var(--fill-tertiary)] shimmer" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-[120px] rounded-[16px] bg-[var(--fill-tertiary)] shimmer" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 h-[340px] rounded-[16px] bg-[var(--fill-tertiary)] shimmer" />
                    <div className="h-[340px] rounded-[16px] bg-[var(--fill-tertiary)] shimmer" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="h-[300px] rounded-[16px] bg-[var(--fill-tertiary)] shimmer" />
                    <div className="h-[300px] rounded-[16px] bg-[var(--fill-tertiary)] shimmer" />
                </div>
            </div>
        );
    }

    const { revenueData, productionData, orderStatusData, topProducts, inventoryData, kpis } = data;

    return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
            {/* Header */}
            <motion.div variants={staggerItem} className="flex items-end justify-between">
                <div>
                    <h1 className="text-[34px] font-bold text-[var(--label-primary)] leading-[41px] tracking-[0.37px]">
                        Analytics
                    </h1>
                    <p className="text-[15px] text-[var(--label-secondary)] mt-1 leading-[20px]">
                        Business performance insights and metrics
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    {/* Date Range Picker */}
                    <div className="flex bg-[var(--fill-tertiary)] rounded-[10px] p-0.5">
                        {(["7d", "30d", "90d", "1y"] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={cn(
                                    "px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-200 cursor-pointer",
                                    dateRange === range
                                        ? "bg-[var(--bg-card)] text-[var(--label-primary)] shadow-sm"
                                        : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
                                )}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                    
                    <IOSButton variant="gray" size="medium" onClick={async () => {
                        try {
                            const res = await fetch("/api/v1/orders");
                            const ordersData = await res.json();
                            const ordersList = Array.isArray(ordersData.data) ? ordersData.data : [];
                            
                            // Map revenue data and enrich it with order counts and top client for that month
                            const enrichedData = revenueData.map(rt => {
                                const [monthStr, yearStr] = rt.month.split(" ");
                                // Simple checking: Orders in this month
                                const monthOrders = ordersList.filter(o => {
                                    const d = new Date(o.createdAt);
                                    // if rt.month is just "Jan" it relies on current year logic (like the graph)
                                    // this is a simplified approach to match month names
                                    return d.toLocaleString('default', { month: 'short' }) === rt.month || rt.month.includes(d.toLocaleString('default', { month: 'short' }));
                                });
                                
                                // Group by client to find top client
                                const clientCounts: Record<string, number> = {};
                                monthOrders.forEach(o => {
                                    const cName = o.client?.name || o.clients?.name || "Unknown";
                                    clientCounts[cName] = (clientCounts[cName] || 0) + (o.total_amount || 0);
                                });
                                
                                let topClient = "—";
                                let maxSpend = 0;
                                Object.entries(clientCounts).forEach(([name, spend]) => {
                                    if(spend > maxSpend) {
                                        topClient = name;
                                        maxSpend = spend;
                                    }
                                });

                                return {
                                    month: rt.month,
                                    revenue: rt.revenue,
                                    ordersCount: monthOrders.length,
                                    topClient: topClient
                                };
                            });

                            const columns = [
                                { header: "Month", key: "month" },
                                { header: "Total revenue", key: "revenue" },
                                { header: "Orders count", key: "ordersCount" },
                                { header: "Top client", key: "topClient" },
                            ];
                            
                            exportToExcel(
                                `revenue_${new Date().toISOString().split("T")[0]}.xlsx`,
                                "Revenue",
                                enrichedData,
                                columns
                            );
                            toast.success("Revenue Excel downloaded!");

                        } catch(e) {
                            toast.error("Failed to export Revenue data");
                        }
                    }}>
                        <Download className="h-4 w-4 mr-1.5" />
                        Excel Export
                    </IOSButton>
                </div>
            </motion.div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    label="Total Revenue"
                    value={formatCurrency(kpis.totalRevenue)}
                    rawValue={kpis.totalRevenue}
                    change={kpis.revenueGrowth}
                    icon={IndianRupee}
                    color="blue"
                />
                <KPICard
                    label="Production Efficiency"
                    value={`${kpis.avgEfficiency}%`}
                    rawValue={kpis.avgEfficiency}
                    change={kpis.avgEfficiency > 0 ? kpis.avgEfficiency - 80 : 0}
                    icon={Factory}
                    color="green"
                />
                <KPICard
                    label="Order Completion"
                    value={`${kpis.completionRate}%`}
                    rawValue={kpis.completionRate}
                    change={kpis.completionRate > 0 ? kpis.completionRate - 75 : 0}
                    icon={ShoppingCart}
                    color="purple"
                />
                <KPICard
                    label="Inventory Turnover"
                    value={`${kpis.inventoryTurnover}x`}
                    rawValue={kpis.inventoryTurnover}
                    change={kpis.inventoryTurnover > 0 ? Math.round((kpis.inventoryTurnover - 3) * 10) / 10 : 0}
                    icon={Package}
                    color="orange"
                />
            </div>
            {revenueData.length < 2 && (
                <p className="text-[13px] text-[var(--label-tertiary)] text-center italic">
                    More data needed for trend analysis — add orders to see growth metrics
                </p>
            )}

            {/* Revenue Trend + Order Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <motion.div variants={staggerItem} className="lg:col-span-2">
                    <IOSCard variant="elevated" padding="lg">
                        <IOSCardHeader title="Revenue Trend" subtitle="Current vs Last Year" />
                        <IOSCardContent>
                            {revenueData.length > 0 ? (
                                <div className="h-[280px] -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revenueData}>
                                            <defs>
                                                <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--ios-blue)" stopOpacity={0.2} />
                                                    <stop offset="100%" stopColor="var(--ios-blue)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" vertical={false} />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--label-tertiary)", fontSize: 13 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--label-tertiary)", fontSize: 13 }} tickFormatter={(v) => `₹${v / 1000}K`} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area type="monotone" dataKey="lastYear" stroke="var(--ios-gray3)" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" name="Last Year" />
                                            <Area type="monotone" dataKey="revenue" stroke="var(--ios-blue)" strokeWidth={2.5} fill="url(#currentGradient)" name="This Year" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[280px] flex items-center justify-center">
                                    <p className="text-[15px] text-[var(--label-tertiary)]">No revenue data for this period</p>
                                </div>
                            )}
                        </IOSCardContent>
                    </IOSCard>
                </motion.div>

                {/* Order Status Donut */}
                <motion.div variants={staggerItem}>
                    <IOSCard variant="elevated" padding="lg" className="h-full">
                        <IOSCardHeader title="Order Status" subtitle="Distribution" />
                        <IOSCardContent>
                            {orderStatusData.length > 0 ? (
                                <>
                                    <div className="h-[180px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RechartsPie>
                                                <Pie data={orderStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} strokeWidth={0}>
                                                    {orderStatusData.map((entry, index) => (
                                                        <Cell key={index} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </RechartsPie>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                        {orderStatusData.map((item) => (
                                            <div key={item.name} className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                                                <span className="text-[13px] text-[var(--label-secondary)]">{item.name}</span>
                                                <span className="text-[13px] font-semibold text-[var(--label-primary)] ml-auto">{item.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="h-[240px] flex items-center justify-center">
                                    <p className="text-[15px] text-[var(--label-tertiary)]">No orders in this period</p>
                                </div>
                            )}
                        </IOSCardContent>
                    </IOSCard>
                </motion.div>
            </div>

            {/* Production Efficiency + Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Production Efficiency */}
                <motion.div variants={staggerItem}>
                    <IOSCard variant="elevated" padding="lg">
                        <IOSCardHeader title="Production Efficiency" subtitle="Monthly trend" />
                        <IOSCardContent>
                            {productionData.length > 0 ? (
                                <div className="h-[240px] -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={productionData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" vertical={false} />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--label-tertiary)", fontSize: 13 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--label-tertiary)", fontSize: 13 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line type="monotone" dataKey="efficiency" stroke="var(--ios-green)" strokeWidth={2.5} name="Efficiency" dot={{ fill: "var(--ios-green)", r: 4, strokeWidth: 2, stroke: "var(--bg-card)" }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[240px] flex items-center justify-center">
                                    <p className="text-[15px] text-[var(--label-tertiary)]">No production data for this period</p>
                                </div>
                            )}
                        </IOSCardContent>
                    </IOSCard>
                </motion.div>

                {/* Top Products */}
                <motion.div variants={staggerItem}>
                    <IOSCard variant="elevated" padding="lg">
                        <IOSCardHeader title="Top Products" subtitle="By revenue" />
                        <IOSCardContent>
                            {topProducts.length > 0 ? (
                                <div className="space-y-3">
                                    {topProducts.map((product, index) => {
                                        const maxRevenue = topProducts[0].revenue;
                                        const percentage = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0;
                                        return (
                                            <div key={product.name} className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[13px] font-semibold text-[var(--label-tertiary)] w-[20px]">
                                                            {index + 1}
                                                        </span>
                                                        <span className="text-[15px] font-medium text-[var(--label-primary)]">
                                                            {product.name}
                                                        </span>
                                                    </div>
                                                    <span className="text-[15px] font-semibold text-[var(--label-primary)]">
                                                        {formatCurrency(product.revenue)}
                                                    </span>
                                                </div>
                                                <div className="h-[6px] bg-[var(--fill-quaternary)] rounded-full overflow-hidden ml-[28px]">
                                                    <motion.div
                                                        className="h-full rounded-full"
                                                        style={{ background: "var(--ios-blue)" }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-[200px] flex items-center justify-center">
                                    <p className="text-[15px] text-[var(--label-tertiary)]">No product data for this period</p>
                                </div>
                            )}
                        </IOSCardContent>
                    </IOSCard>
                </motion.div>
            </div>

            {/* Inventory Breakdown */}
            <motion.div variants={staggerItem}>
                <IOSCard variant="elevated" padding="lg">
                    <IOSCardHeader title="Inventory Breakdown" subtitle="Stock distribution by category" />
                    <IOSCardContent>
                        {inventoryData.length > 0 ? (
                            <div className="h-[200px] -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={inventoryData} layout="vertical">
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "var(--label-tertiary)", fontSize: 13 }} tickFormatter={(v) => `${v}%`} />
                                        <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{ fill: "var(--label-primary)", fontSize: 13 }} width={120} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="var(--ios-purple)" opacity={0.8} barSize={24} name="Percentage" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center">
                                <p className="text-[15px] text-[var(--label-tertiary)]">No inventory data available</p>
                            </div>
                        )}
                    </IOSCardContent>
                </IOSCard>
            </motion.div>

            {/* ══════════════════════════════════════════════════════
                PROFIT MARGINS — Per-Order Cost Breakdown
               ══════════════════════════════════════════════════════ */}
            <motion.div variants={staggerItem} className="ind-page">
                <IOSCard variant="elevated" padding="lg">
                    <IOSCardHeader title="Profit Margins" subtitle="Per-order cost breakdown and margin analysis" />
                    <IOSCardContent>
                        {marginLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-[60px] rounded-[12px] bg-[var(--fill-tertiary)] shimmer" />
                                ))}
                            </div>
                        ) : marginData ? (
                            <>
                                {/* Summary Stats */}
                                <div className="ind-stats-row" style={{ marginBottom: 20 }}>
                                    <div className="ind-stat-card">
                                        <span className="ind-stat-card__label">Total Revenue</span>
                                        <span className="ind-stat-card__value ind-mono" style={{ color: "var(--ind-blue)", fontSize: 22 }}>
                                            ₹{marginData.summary.totalRevenue >= 100000
                                                ? `${(marginData.summary.totalRevenue / 100000).toFixed(1)}L`
                                                : marginData.summary.totalRevenue.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                    <div className="ind-stat-card">
                                        <span className="ind-stat-card__label">Total Profit</span>
                                        <span className="ind-stat-card__value ind-mono" style={{ color: marginData.summary.totalProfit >= 0 ? "var(--ind-green)" : "var(--ind-red)", fontSize: 22 }}>
                                            ₹{marginData.summary.totalProfit >= 100000
                                                ? `${(marginData.summary.totalProfit / 100000).toFixed(1)}L`
                                                : marginData.summary.totalProfit.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                    <div className="ind-stat-card">
                                        <span className="ind-stat-card__label">Avg Margin</span>
                                        <span className="ind-stat-card__value ind-mono" style={{
                                            color: marginData.summary.avgMargin >= 30 ? "var(--ind-green)"
                                                : marginData.summary.avgMargin >= 15 ? "var(--ind-orange)"
                                                : "var(--ind-red)",
                                            fontSize: 22
                                        }}>
                                            {marginData.summary.avgMargin}%
                                        </span>
                                    </div>
                                </div>

                                {/* Info Banner */}
                                {marginData.summary.ordersWithCostData === 0 && (
                                    <div className="ind-alert ind-alert--info" style={{ marginBottom: 16 }}>
                                        <div className="text-[13px]" style={{ color: "var(--ind-text-muted)" }}>
                                            💡 Add <strong>material_cost</strong>, <strong>labour_cost</strong>, and <strong>overhead_cost</strong> to your orders to see real margin data.
                                        </div>
                                    </div>
                                )}

                                {/* Order Margin Cards */}
                                <div className="space-y-2" style={{ maxHeight: 400, overflowY: "auto" }}>
                                    {marginData.orders.slice(0, 20).map((order: any) => {
                                        const isSelected = selectedOrder?.id === order.id;
                                        const marginColor = order.margin >= 30 ? "var(--ind-green)"
                                            : order.margin >= 15 ? "var(--ind-orange)"
                                            : order.margin > 0 ? "var(--ind-red)" : "var(--ind-text-muted)";

                                        return (
                                            <div
                                                key={order.id}
                                                className={cn("ind-card ind-card--interactive", isSelected && "ind-card--selected")}
                                                style={{ padding: 14 }}
                                                onClick={() => setSelectedOrder(isSelected ? null : order)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        {/* Mini Donut */}
                                                        <div
                                                            className="ind-donut flex-shrink-0"
                                                            style={{
                                                                width: 40, height: 40,
                                                                background: `conic-gradient(${marginColor} ${order.margin * 3.6}deg, var(--ind-input-bg) 0deg)`,
                                                            }}
                                                        >
                                                            <div className="ind-donut__inner" style={{
                                                                width: 28, height: 28,
                                                                background: "var(--ind-surface)",
                                                                fontSize: 9,
                                                                color: marginColor,
                                                            }}>
                                                                {order.margin}%
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="text-[14px] font-semibold block truncate" style={{ color: "var(--ind-text)" }}>{order.productName}</span>
                                                            <span className="text-[12px]" style={{ color: "var(--ind-text-muted)" }}>{order.clientName}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-3">
                                                        <span className="text-[14px] font-bold ind-mono block" style={{ color: "var(--ind-text)" }}>₹{order.revenue.toLocaleString("en-IN")}</span>
                                                        <span className="text-[12px] font-medium" style={{ color: marginColor }}>₹{order.netProfit.toLocaleString("en-IN")} profit</span>
                                                    </div>
                                                </div>

                                                {/* Expanded Cost Breakdown */}
                                                {isSelected && (
                                                    <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--ind-border)" }}>
                                                        <div className="space-y-3">
                                                            {[
                                                                { label: "Material Cost", value: order.materialCost, color: "var(--ind-blue)" },
                                                                { label: "Labour Cost", value: order.labourCost, color: "var(--ind-orange)" },
                                                                { label: "Overhead Cost", value: order.overheadCost, color: "var(--ind-purple)" },
                                                            ].map((cost) => (
                                                                <div key={cost.label}>
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-[12px] font-medium" style={{ color: "var(--ind-text-muted)" }}>{cost.label}</span>
                                                                        <span className="text-[13px] font-bold ind-mono" style={{ color: "var(--ind-text)" }}>₹{cost.value.toLocaleString("en-IN")}</span>
                                                                    </div>
                                                                    <div className="ind-cost-bar">
                                                                        <div
                                                                            className="ind-cost-bar__fill"
                                                                            style={{
                                                                                width: order.revenue > 0 ? `${(cost.value / order.revenue) * 100}%` : "0%",
                                                                                background: cost.color,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* Net Profit Box */}
                                                        <div className="mt-3 p-3 rounded-[10px]" style={{
                                                            background: order.netProfit >= 0 ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
                                                            border: `1px solid ${order.netProfit >= 0 ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
                                                        }}>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[13px] font-semibold" style={{ color: "var(--ind-text)" }}>Net Profit</span>
                                                                <span className="text-[16px] font-bold ind-mono" style={{ color: order.netProfit >= 0 ? "var(--ind-green)" : "var(--ind-red)" }}>
                                                                    ₹{order.netProfit.toLocaleString("en-IN")} ({order.margin}%)
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center">
                                <p className="text-[15px] text-[var(--label-tertiary)]">No margin data available</p>
                            </div>
                        )}
                    </IOSCardContent>
                </IOSCard>
            </motion.div>
        </motion.div>
    );
}
