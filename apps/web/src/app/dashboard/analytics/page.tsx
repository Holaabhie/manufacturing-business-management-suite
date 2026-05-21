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
    ChevronDown,
    AlertTriangle,
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
import { useTranslations } from "next-intl";
import { useFormatters } from "@/hooks/useFormatters";

const AVATAR_COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0',
  '#00BCD4', '#FF5722', '#3F51B5', '#009688', '#FFC107',
];

function getAvatarColor(identifier: string): string {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
        <div className="bg-white dark:bg-[var(--card)] rounded-[12px] px-4 py-3 shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] dark:shadow-[var(--shadow-lg)] border border-black/[0.09] dark:border-[var(--border)]">
            <p className="text-[13px] font-medium text-[var(--muted-foreground)] mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-[15px] font-semibold text-[var(--foreground)]">
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
        blue: "text-[var(--primary)]",
        green: "text-[var(--erp-success)]",
        orange: "text-[var(--erp-warning)]",
        purple: "text-[var(--chart-4)]",
    };

    return (
        <motion.div variants={staggerItem}>
            <IOSCard variant="elevated" padding="lg" interactive className="bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)] shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 dark:shadow-none dark:hover:shadow-none">
                <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-[40px] h-[40px] rounded-[10px] flex items-center justify-center", bgMap[color])}>
                        <Icon className={cn("h-[18px] w-[18px]", iconColorMap[color])} />
                    </div>
                    <span className="text-[13px] text-[var(--muted-foreground)] leading-[18px]">{label}</span>
                </div>
                <div className="flex items-end justify-between">
                    <span className={cn(
                        "text-[28px] font-bold tracking-[0.36px]",
                        isZero ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)]"
                    )}>{displayValue}</span>
                    {hasComparison && (
                        <span className={cn(
                            "flex items-center gap-0.5 text-[13px] font-semibold px-2 py-0.5 rounded-full",
                            isPositive ? "bg-[rgba(52,199,89,0.12)] text-[var(--erp-success)]" : "bg-[rgba(255,59,48,0.12)] text-[var(--destructive)]"
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
    const t = useTranslations("analytics");
    const { formatINR } = useFormatters();
    const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);

    // ── Profit Margin State ──
    const [marginData, setMarginData] = useState<any>(null);
    const [marginLoading, setMarginLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [expandedCosts, setExpandedCosts] = useState<Record<string, boolean>>({});
    const [extraCosts, setExtraCosts] = useState<Record<string, { labour: number; machinery: number; other: number }>>({});
    const [savingCost, setSavingCost] = useState<string | null>(null);

    const fetchMargins = useCallback(async () => {
        setMarginLoading(true);
        try {
            const res = await fetch("/api/v1/orders/profit-margins");
            const json = await res.json();
            if (json.success) {
                setMarginData(json.data);
                // Initialize extraCosts from fetched data
                const costs: Record<string, { labour: number; machinery: number; other: number }> = {};
                for (const o of json.data.orders) {
                    costs[o.id] = {
                        labour: o.labourCost || 0,
                        machinery: o.machineryCost || 0,
                        other: o.overheadCost || 0,
                    };
                }
                setExtraCosts(costs);
            }
        } catch {
            console.error("Failed to fetch margins");
        } finally {
            setMarginLoading(false);
        }
    }, []);

    const saveExtraCost = useCallback(async (orderId: string, field: string, value: number) => {
        setSavingCost(orderId);
        const fieldMap: Record<string, string> = { labour: "labour_cost", machinery: "machinery_cost", other: "overhead_cost" };
        try {
            await fetch(`/api/v1/orders/${orderId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [fieldMap[field]]: value }),
            });
            // Silently refetch to update totals
            fetchMargins();
        } catch {
            toast.error("Failed to save cost");
        } finally {
            setSavingCost(null);
        }
    }, [fetchMargins]);

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
                title={t("accessRestricted")}
                description={t("accessRestrictedDesc")}
            />
        );
    }

    // ─── Loading State ─────────────────────────────────────
    if (loading || !data) {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="h-[34px] w-[200px] rounded-[10px] bg-[var(--muted)] shimmer" />
                    <div className="h-[20px] w-[320px] rounded-[8px] bg-[var(--muted)] shimmer" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-[120px] rounded-[16px] bg-[var(--muted)] shimmer" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 h-[340px] rounded-[16px] bg-[var(--muted)] shimmer" />
                    <div className="h-[340px] rounded-[16px] bg-[var(--muted)] shimmer" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="h-[300px] rounded-[16px] bg-[var(--muted)] shimmer" />
                    <div className="h-[300px] rounded-[16px] bg-[var(--muted)] shimmer" />
                </div>
            </div>
        );
    }

    const { revenueData, productionData, orderStatusData, topProducts, inventoryData, kpis } = data;

    return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6 bg-[#F1F4F9] dark:bg-transparent min-h-screen -m-6 p-6">
            {/* Header */}
            <motion.div variants={staggerItem} className="flex items-end justify-between">
                <div>
                    <h1 className="text-[34px] font-bold text-[var(--foreground)] leading-[41px] tracking-[0.37px]">
                        {t("title")}
                    </h1>
                    <p className="text-[15px] text-[var(--muted-foreground)] mt-1 leading-[20px]">
                        {t("subtitle")}
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    {/* Date Range Picker */}
                    <div className="flex bg-[var(--muted)] rounded-[10px] p-0.5">
                        {(["7d", "30d", "90d", "1y"] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={cn(
                                    "px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-200 cursor-pointer",
                                    dateRange === range
                                        ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
                            toast.success(t("revenueExcelDownloaded"));

                        } catch(e) {
                            toast.error(t("failedToExport"));
                        }
                    }}>
                        <Download className="h-4 w-4 mr-1.5" />
                        {t("excelExport")}
                    </IOSButton>
                </div>
            </motion.div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    label={t("totalRevenue")}
                    value={formatCurrency(kpis.totalRevenue)}
                    rawValue={kpis.totalRevenue}
                    change={kpis.revenueGrowth}
                    icon={IndianRupee}
                    color="blue"
                />
                <KPICard
                    label={t("productionEfficiency")}
                    value={`${kpis.avgEfficiency}%`}
                    rawValue={kpis.avgEfficiency}
                    change={kpis.avgEfficiency > 0 ? kpis.avgEfficiency - 80 : 0}
                    icon={Factory}
                    color="green"
                />
                <KPICard
                    label={t("orderCompletion")}
                    value={`${kpis.completionRate}%`}
                    rawValue={kpis.completionRate}
                    change={kpis.completionRate > 0 ? kpis.completionRate - 75 : 0}
                    icon={ShoppingCart}
                    color="purple"
                />
                <KPICard
                    label={t("inventoryTurnover")}
                    value={`${kpis.inventoryTurnover}x`}
                    rawValue={kpis.inventoryTurnover}
                    change={kpis.inventoryTurnover > 0 ? Math.round((kpis.inventoryTurnover - 3) * 10) / 10 : 0}
                    icon={Package}
                    color="orange"
                />
            </div>
            {revenueData.length < 2 && (
                <p className="text-[13px] text-[var(--muted-foreground)] text-center italic">
                    {t("moreDataNeeded")}
                </p>
            )}

            {/* Revenue Trend + Order Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <motion.div variants={staggerItem} className="lg:col-span-2">
                    <IOSCard variant="elevated" padding="lg" className="bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)] shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 dark:shadow-none dark:hover:shadow-none">
                        <IOSCardHeader title={t("revenueTrend")} subtitle={t("currentVsLastYear")} />
                        <IOSCardContent>
                            {revenueData.length > 0 ? (
                                <div className="h-[280px] -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revenueData}>
                                            <defs>
                                                <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
                                                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 13 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 13 }} tickFormatter={(v) => `₹${v / 1000}K`} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area type="monotone" dataKey="lastYear" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" name="Last Year" />
                                            <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2.5} fill="url(#currentGradient)" name="This Year" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[280px] flex items-center justify-center">
                                    <p className="text-[15px] text-[var(--muted-foreground)]">{t("noRevenueData")}</p>
                                </div>
                            )}
                        </IOSCardContent>
                    </IOSCard>
                </motion.div>

                {/* Order Status Donut */}
                <motion.div variants={staggerItem}>
                    <IOSCard variant="elevated" padding="lg" className="h-full bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)] shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 dark:shadow-none dark:hover:shadow-none">
                        <IOSCardHeader title={t("orderStatus")} subtitle={t("distribution")} />
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
                                                <span className="text-[13px] text-[var(--muted-foreground)]">{item.name}</span>
                                                <span className="text-[13px] font-semibold text-[var(--foreground)] ml-auto">{item.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="h-[240px] flex items-center justify-center">
                                    <p className="text-[15px] text-[var(--muted-foreground)]">{t("noOrdersInPeriod")}</p>
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
                    <IOSCard variant="elevated" padding="lg" className="bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)] shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 dark:shadow-none dark:hover:shadow-none">
                        <IOSCardHeader title={t("productionEfficiencyChart")} subtitle={t("monthlyTrend")} />
                        <IOSCardContent>
                            {productionData.length > 0 ? (
                                <div className="h-[240px] -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={productionData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 13 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 13 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line type="monotone" dataKey="efficiency" stroke="var(--erp-success)" strokeWidth={2.5} name="Efficiency" dot={{ fill: "var(--erp-success)", r: 4, strokeWidth: 2, stroke: "var(--card)" }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[240px] flex items-center justify-center">
                                    <p className="text-[15px] text-[var(--muted-foreground)]">{t("noProductionData")}</p>
                                </div>
                            )}
                        </IOSCardContent>
                    </IOSCard>
                </motion.div>

                {/* Top Products */}
                <motion.div variants={staggerItem}>
                    <IOSCard variant="elevated" padding="lg" className="bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)] shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 dark:shadow-none dark:hover:shadow-none">
                        <IOSCardHeader title={t("topProducts")} subtitle={t("byRevenue")} />
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
                                                        <span className="text-[13px] font-semibold text-[var(--muted-foreground)] w-[20px]">
                                                            {index + 1}
                                                        </span>
                                                        <span className="text-[15px] font-medium text-[var(--foreground)]">
                                                            {product.name}
                                                        </span>
                                                    </div>
                                                    <span className="text-[15px] font-semibold text-[var(--foreground)]">
                                                        {formatCurrency(product.revenue)}
                                                    </span>
                                                </div>
                                                <div className="h-[6px] bg-[var(--muted)] rounded-full overflow-hidden ml-[28px]">
                                                    <motion.div
                                                        className="h-full rounded-full"
                                                        style={{ background: "var(--primary)" }}
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
                                    <p className="text-[15px] text-[var(--muted-foreground)]">{t("noProductData")}</p>
                                </div>
                            )}
                        </IOSCardContent>
                    </IOSCard>
                </motion.div>
            </div>

            {/* Inventory Breakdown */}
            <motion.div variants={staggerItem}>
                <IOSCard variant="elevated" padding="lg" className="bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)] shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 dark:shadow-none dark:hover:shadow-none">
                    <IOSCardHeader title={t("inventoryBreakdown")} subtitle={t("stockDistribution")} />
                    <IOSCardContent>
                        {inventoryData.length > 0 ? (
                            <div className="h-[200px] -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={inventoryData} layout="vertical">
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 13 }} tickFormatter={(v) => `${v}%`} />
                                        <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{ fill: "var(--foreground)", fontSize: 13 }} width={120} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="var(--chart-4)" opacity={0.8} barSize={24} name="Percentage" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center">
                                <p className="text-[15px] text-[var(--muted-foreground)]">{t("noInventoryData")}</p>
                            </div>
                        )}
                    </IOSCardContent>
                </IOSCard>
            </motion.div>

            {/* ══════════════════════════════════════════════════════
                PROFIT MARGINS — Per-Order Cost Breakdown
               ══════════════════════════════════════════════════════ */}
            <motion.div variants={staggerItem} className="ind-page">
                <IOSCard variant="elevated" padding="lg" className="bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)] shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 dark:shadow-none dark:hover:shadow-none">
                    <IOSCardHeader title={t("profitMargins")} subtitle={t("profitMarginsSubtitle")} />
                    <IOSCardContent>
                        {marginLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-[60px] rounded-[12px] bg-[var(--muted)] shimmer" />
                                ))}
                            </div>
                        ) : marginData ? (
                            <>
                                {/* Summary Stats */}
                                <div className="ind-stats-row" style={{ marginBottom: 20 }}>
                                    <div className="ind-stat-card">
                                        <span className="ind-stat-card__label">{t("totalRevenue")}</span>
                                        <span className="ind-stat-card__value ind-mono" style={{ color: "var(--ind-blue)", fontSize: 22 }}>
                                            {formatINR(marginData.summary.totalRevenue, { compact: true })}
                                        </span>
                                    </div>
                                    <div className="ind-stat-card">
                                        <span className="ind-stat-card__label">{t("totalCost")}</span>
                                        <span className="ind-stat-card__value ind-mono" style={{ color: "var(--ind-orange)", fontSize: 22 }}>
                                            {formatINR(marginData.summary.totalCost || 0, { compact: true })}
                                        </span>
                                    </div>
                                    <div className="ind-stat-card">
                                        <span className="ind-stat-card__label">{t("netProfit")}</span>
                                        <span className="ind-stat-card__value ind-mono" style={{ color: marginData.summary.totalProfit >= 0 ? "var(--ind-green)" : "var(--ind-red)", fontSize: 22 }}>
                                            {formatINR(marginData.summary.totalProfit, { compact: true })}
                                        </span>
                                    </div>
                                    <div className="ind-stat-card">
                                        <span className="ind-stat-card__label">{t("avgMargin")}</span>
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

                                {/* Order Margin Cards */}
                                <div className="space-y-2" style={{ maxHeight: 500, overflowY: "auto" }}>
                                    {marginData.orders.slice(0, 30).map((order: any) => {
                                        const isSelected = selectedOrder?.id === order.id;
                                        const isCostExpanded = expandedCosts[order.id] || false;
                                        const costs = extraCosts[order.id] || { labour: 0, machinery: 0, other: 0 };
                                        const liveTotalCost = order.materialCost + costs.labour + costs.machinery + costs.other;
                                        const liveProfit = order.revenue - liveTotalCost;
                                        const liveMargin = order.revenue > 0 ? (liveProfit / order.revenue) * 100 : 0;
                                        const hasCostData = liveTotalCost > 0;
                                        const isLoss = hasCostData && liveProfit < 0;
                                        const marginColor = !hasCostData ? "var(--ind-text-muted)" : isLoss ? "var(--ind-red)" : (
                                            liveMargin >= 30 ? "var(--ind-green)"
                                            : liveMargin >= 15 ? "var(--ind-orange)"
                                            : liveMargin > 0 ? "var(--ind-red)" : "var(--ind-text-muted)"
                                        );

                                        return (
                                            <div
                                                key={order.id}
                                                className={cn("ind-card ind-card--interactive shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] dark:shadow-none", isSelected && "ind-card--selected")}
                                                style={{ padding: 14 }}
                                                onClick={() => setSelectedOrder(isSelected ? null : order)}
                                            >
                                                {/* Header row */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div style={{ backgroundColor: getAvatarColor(order.productName || order.id), width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
                                                            {(order.productName || '?')[0].toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="text-[14px] font-semibold block truncate" style={{ color: "var(--ind-text)" }}>{order.productName}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[12px]" style={{ color: "var(--ind-text-muted)" }}>{order.clientName}</span>
                                                                {!order.hasProduction && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,159,10,0.15)", color: "var(--erp-warning)" }}>{t("noProduction")}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-3">
                                                        <span className="text-[13px] ind-mono block" style={{ color: "var(--ind-text-muted)" }}>{formatINR(order.revenue)}</span>
                                                        {!hasCostData ? (
                                                            <span className="text-[12px] font-bold ind-mono" style={{ color: "var(--ind-text-muted)" }}>—</span>
                                                        ) : (
                                                            <span className="text-[14px] font-bold ind-mono" style={{ color: marginColor }}>
                                                                {isLoss ? t("loss") : `${Math.round(liveMargin * 10) / 10}%`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expanded Cost Breakdown */}
                                                {isSelected && (
                                                    <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--ind-border)" }} onClick={(e) => e.stopPropagation()}>
                                                        {/* Material Cost (auto) */}
                                                        <div className="mb-3">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[12px] font-medium" style={{ color: "var(--ind-text-muted)" }}>
                                                                    {t("materialCost")} <span className="text-[10px]" style={{ color: "var(--ind-text-muted)", opacity: 0.6 }}>({t("materialCostAuto")})</span>
                                                                </span>
                                                                <span className="text-[13px] font-bold ind-mono" style={{ color: "var(--ind-text)" }}>{formatINR(order.materialCost)}</span>
                                                            </div>
                                                            <div className="ind-cost-bar">
                                                                <div className="ind-cost-bar__fill" style={{ width: order.revenue > 0 ? `${Math.min((order.materialCost / order.revenue) * 100, 100)}%` : "0%", background: "var(--ind-blue)" }} />
                                                            </div>
                                                            {order.materialWarnings && order.materialWarnings.length > 0 && (
                                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                                    {order.materialWarnings.map((name: string) => (
                                                                        <span key={name} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,159,10,0.12)", color: "var(--erp-warning)" }}>
                                                                            <AlertTriangle className="h-2.5 w-2.5" /> {t("costMissingFor", { name })}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Extra Costs Toggle */}
                                                        <button
                                                            className="flex items-center gap-1.5 text-[12px] font-semibold mb-2 transition-colors"
                                                            style={{ color: "var(--ind-blue)" }}
                                                            onClick={() => setExpandedCosts(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                                                        >
                                                            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isCostExpanded && "rotate-180")} />
                                                            {isCostExpanded ? t("hideExtraCosts") : t("addExtraCosts")}
                                                        </button>

                                                        {/* Extra Cost Inputs */}
                                                        {isCostExpanded && (
                                                            <div className="space-y-2 mb-3 p-2.5 rounded-[10px] bg-[#F8FAFC] dark:bg-[rgba(255,255,255,0.03)]" style={{ border: "1px solid var(--ind-border)" }}>
                                                                {([
                                                                    { key: "labour", label: t("labourCost") },
                                                                    { key: "machinery", label: t("machineryCost") },
                                                                    { key: "other", label: t("otherCost") },
                                                                ] as const).map(({ key, label }) => (
                                                                    <div key={key} className="flex items-center justify-between gap-3">
                                                                        <span className="text-[12px]" style={{ color: "var(--ind-text-muted)" }}>{label}</span>
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-[12px]" style={{ color: "var(--ind-text-muted)" }}>₹</span>
                                                                            <input
                                                                                type="number"
                                                                                className="w-[90px] h-[28px] px-2 rounded-[6px] text-[13px] font-semibold text-right ind-mono bg-[#F1F4F9] dark:bg-[rgba(255,255,255,0.06)]"
                                                                                style={{ border: "1px solid var(--ind-border)", color: "var(--ind-text)", outline: "none" }}
                                                                                value={costs[key] || ""}
                                                                                onChange={(e) => {
                                                                                    const val = Number(e.target.value) || 0;
                                                                                    setExtraCosts(prev => ({ ...prev, [order.id]: { ...prev[order.id], [key]: val } }));
                                                                                }}
                                                                                onBlur={(e) => saveExtraCost(order.id, key, Number(e.target.value) || 0)}
                                                                                min={0}
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {savingCost === order.id && (
                                                                    <p className="text-[10px] text-right" style={{ color: "var(--ind-text-muted)" }}>Saving...</p>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Net Profit Box */}
                                                        <div className="p-3 rounded-[10px]" style={{
                                                            background: !hasCostData ? "rgba(128,128,128,0.08)" : liveProfit >= 0 ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
                                                            border: `1px solid ${!hasCostData ? "rgba(128,128,128,0.2)" : liveProfit >= 0 ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
                                                        }}>
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[12px]" style={{ color: "var(--ind-text-muted)" }}>{t("totalCost")}</span>
                                                                    <span className="text-[13px] font-bold ind-mono" style={{ color: "var(--ind-text)" }}>{formatINR(liveTotalCost)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[13px] font-semibold" style={{ color: "var(--ind-text)" }}>{t("netProfit")}</span>
                                                                    {!hasCostData ? (
                                                                        <span className="text-[14px] font-bold ind-mono" style={{ color: "var(--ind-text-muted)" }}>—</span>
                                                                    ) : (
                                                                        <span className="text-[16px] font-bold ind-mono" style={{ color: liveProfit >= 0 ? "var(--ind-green)" : "var(--ind-red)" }}>
                                                                            {formatINR(liveProfit)} ({Math.round(liveMargin * 10) / 10}%)
                                                                        </span>
                                                                    )}
                                                                </div>
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
                                <p className="text-[15px] text-[var(--muted-foreground)]">{t("noMarginData")}</p>
                            </div>
                        )}
                    </IOSCardContent>
                </IOSCard>
            </motion.div>
        </motion.div>
    );
}
