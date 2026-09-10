"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Calendar,
    ShoppingCart,
    Factory,
    FileText,
    IndianRupee,
    Package,
    Download,
    ChevronDown,
    TrendingUp,
    Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IOSCard } from "@/components/ui/ios/IOSCard";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { staggerContainer, staggerItem } from "@/styles/animations";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/excel-export";
import { toast } from "sonner";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { AccessDenied } from "@/components/AccessDenied";
import { MobileTableCards } from "@/components/ui/MobileTableCards";

// ─── Types ───────────────────────────────────────────────
interface FYData {
    financialYear: string;
    orders?: any[];
    productions?: any[];
    bills?: any[];
    payments?: any[];
    inventoryUsage?: any[];
    batchTraceability?: any[];
    summary?: {
        totalOrders: number;
        totalProductions: number;
        totalBills: number;
        totalPayments: number;
        totalRevenue: number;
        totalBilled: number;
        totalPaid: number;
        totalMaterialDeducted: number;
    };
}

const TAB_CONFIG = [
    { id: "orders", key: "orders", icon: ShoppingCart },
    { id: "productions", key: "productions", icon: Factory },
    { id: "bills", key: "bills", icon: FileText },
    { id: "payments", key: "payments", icon: IndianRupee },
    { id: "inventory", key: "inventory", icon: Package },
] as const;

type TabId = typeof TAB_CONFIG[number]["id"];

// ─── Format Currency ─────────────────────────────────────
function formatCurrency(value: number): string {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString("en-IN")}`;
}

// ─── Status Badge ────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const t = useTranslations("previousYears.statuses");
    const s = status?.toLowerCase() || "";
    let variant: "default" | "success" | "warning" | "error" = "default";
    if (["completed", "paid", "delivered"].includes(s)) variant = "success";
    else if (["processing", "in_progress", "partial", "draft", "awaiting_payment", "awaiting payment"].includes(s)) variant = "warning";
    else if (["cancelled", "on_hold", "overdue", "rejected"].includes(s)) variant = "error";

    const getStatusLabel = (key: string) => {
        switch (key) {
            case "awaiting_payment":
            case "awaiting payment":
                return t("awaitingPayment");
            case "on_hold":
                return t("onHold");
            case "in_progress":
                return t("in_progress");
            case "completed":
                return t("completed");
            case "paid":
                return t("paid");
            case "delivered":
                return t("delivered");
            case "processing":
                return t("processing");
            case "partial":
                return t("partial");
            case "draft":
                return t("draft");
            case "cancelled":
                return t("cancelled");
            case "overdue":
                return t("overdue");
            case "rejected":
                return t("rejected");
            case "pending":
                return t("pending");
            default:
                return status;
        }
    };

    return <IOSBadge variant={variant}>{getStatusLabel(s)}</IOSBadge>;
}

// ─── KPI Card ────────────────────────────────────────────
function KPICard({ label, value, icon: Icon, color }: {
    label: string;
    value: string;
    icon: any;
    color: "blue" | "green" | "orange" | "purple";
}) {
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
        <IOSCard variant="elevated" padding="none" className="p-2.5 sm:p-4 md:p-5 bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)] shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] dark:shadow-none min-w-0 w-full overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className={cn("w-7 h-7 sm:w-[40px] sm:h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0", bgMap[color])}>
                    <Icon className={cn("h-4 w-4 sm:h-[18px] sm:w-[18px]", iconColorMap[color])} />
                </div>
                <span className="text-[11px] sm:text-[13px] text-[var(--muted-foreground)] leading-[16px] sm:leading-[18px] min-w-0 truncate">{label}</span>
            </div>
            <span className="text-[16px] sm:text-[24px] md:text-[28px] font-bold tracking-tight tabular-nums text-[var(--foreground)] block truncate">{value}</span>
        </IOSCard>
    );
}

// ─── Page Component ──────────────────────────────────────
export default function PreviousYearsPage() {
    const t = useTranslations("previousYears");
    const tToasts = useTranslations("previousYears.toasts");
    const tKpi = useTranslations("previousYears.kpi");
    const tTabs = useTranslations("previousYears.tabs");
    const tExport = useTranslations("previousYears.exportSections");

    const { isOwner, loading: roleLoading } = usePermissions();
    const [financialYears, setFinancialYears] = useState<string[]>([]);
    const [selectedFY, setSelectedFY] = useState<string>("");
    const [currentFY, setCurrentFY] = useState<string>("");
    const [activeTab, setActiveTab] = useState<TabId>("orders");
    const [data, setData] = useState<FYData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [showFYDropdown, setShowFYDropdown] = useState(false);

    // Load available financial years
    useEffect(() => {
        async function loadYears() {
            try {
                const res = await fetch("/api/v1/reports/financial-years");
                if (res.ok) {
                    const json = await res.json();
                    setFinancialYears(json.financialYears || []);
                    setCurrentFY(json.currentFY || "");

                    // Default to most recent non-current FY
                    const pastYears = (json.financialYears || []).filter(
                        (y: string) => y !== json.currentFY
                    );
                    if (pastYears.length > 0) {
                        setSelectedFY(pastYears[0]);
                    } else if (json.financialYears?.length > 0) {
                        setSelectedFY(json.financialYears[0]);
                    }
                }
            } catch {
                toast.error(tToasts("loadYearsError"));
            } finally {
                setLoading(false);
            }
        }
        loadYears();
    }, [tToasts]);

    // Load data for selected FY
    const loadData = useCallback(async (fy: string) => {
        if (!fy) return;
        setDataLoading(true);
        try {
            const res = await fetch(`/api/v1/reports/previous-years?fy=${fy}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            } else {
                toast.error(tToasts("loadDataError"));
            }
        } catch {
            toast.error(tToasts("networkError"));
        } finally {
            setDataLoading(false);
        }
    }, [tToasts]);

    useEffect(() => {
        if (selectedFY) loadData(selectedFY);
    }, [selectedFY, loadData]);

    // Export handler
    const handleExport = useCallback(() => {
        if (!data) return;
        const sections: Record<string, any[]> = {};
        if (data.orders?.length) sections[tExport("orders")] = data.orders;
        if (data.productions?.length) sections[tExport("productions")] = data.productions;
        if (data.bills?.length) sections[tExport("bills")] = data.bills;
        if (data.payments?.length) sections[tExport("payments")] = data.payments;
        if (data.inventoryUsage?.length) sections[tExport("inventoryUsage")] = data.inventoryUsage;

        const activeData = sections[Object.keys(sections)[0]] || [];
        if (activeData.length === 0) {
            toast.error(tToasts("noDataToExport"));
            return;
        }

        exportToExcel(activeData, `FY-${selectedFY}-report`);
        toast.success(tToasts("exportSuccess"));
    }, [data, selectedFY, tExport, tToasts]);

    if (roleLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-[3px] border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[15px] text-[var(--muted-foreground)]">{t("loading")}</span>
                </div>
            </div>
        );
    }

    if (!isOwner) return <AccessDenied />;

    return (
        <div
            className={[
                "w-full min-w-0 overflow-x-clip",
                // let the offending row wrap instead of inflating
                "[&_.justify-between.items-start]:flex-wrap",
                "[&_.justify-between.items-start]:gap-x-3",
                "[&_.justify-between.items-start]:gap-y-1",
                "[&_.justify-between.items-start]:min-w-0",
                // allow both children to shrink below min-content
                "[&_.justify-between.items-start>*]:min-w-0",
                "[&_.justify-between.items-start>*]:max-w-full",
                // stop long IDs / currency from setting the min-content floor
                "[&_.justify-between.items-start_*]:!whitespace-normal",
                "[&_.justify-between.items-start_.font-mono]:truncate",
            ].join(" ")}
        >
            <motion.div
                className="w-full min-w-0 overflow-x-clip space-y-4 sm:space-y-6 max-w-[1200px] mx-auto scroll-mt-14 sm:scroll-mt-16 pb-28 sm:pb-8"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
            >
            {/* ─── Header ──────────────────────────────────── */}
            <motion.div variants={staggerItem} className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
                <div className="min-w-0 flex-1">
                    <h1 className="text-[22px] sm:text-[24px] md:text-[28px] font-bold tracking-[0.36px] text-[var(--foreground)] truncate">
                        {t("title")}
                    </h1>
                    <p className="text-[15px] text-[var(--muted-foreground)] mt-1 break-words">
                        {t("subtitle")}
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap min-w-0">
                    {/* FY Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFYDropdown(!showFYDropdown)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-[12px] bg-white dark:bg-[var(--card)] border border-black/[0.09] dark:border-[var(--border)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] text-[14px] sm:text-[15px] font-medium text-[var(--foreground)] sm:min-w-[160px] shrink-0 cursor-pointer"
                        >
                            <Calendar className="h-4 w-4 text-[var(--primary)]" />
                            <span>{selectedFY ? t("selectFY", { year: selectedFY }) : t("selectPlaceholder")}</span>
                            {selectedFY === currentFY && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[rgba(0,122,255,0.1)] text-[var(--primary)] font-medium">
                                    {t("currentBadge")}
                                </span>
                            )}
                            <ChevronDown className="h-4 w-4 ml-auto text-[var(--muted-foreground)]" />
                        </button>

                        {showFYDropdown && (
                            <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-[var(--card)] rounded-[14px] border border-black/[0.09] dark:border-[var(--border)] shadow-[0_10px_40px_rgba(0,0,0,0.12)] min-w-[200px] py-2 overflow-hidden">
                                {financialYears.map((fy) => (
                                    <button
                                        key={fy}
                                        onClick={() => {
                                            setSelectedFY(fy);
                                            setShowFYDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full px-4 py-2.5 text-left text-[15px] transition-colors flex items-center justify-between",
                                            fy === selectedFY
                                                ? "bg-[var(--primary)] text-white font-semibold"
                                                : "text-[var(--foreground)] hover:bg-[var(--accent)]"
                                        )}
                                    >
                                        <span>{t("selectFY", { year: fy })}</span>
                                        {fy === currentFY && (
                                            <span className={cn(
                                                "text-[11px] px-1.5 py-0.5 rounded-full font-medium",
                                                fy === selectedFY
                                                    ? "bg-white/20 text-white"
                                                    : "bg-[rgba(0,122,255,0.1)] text-[var(--primary)]"
                                            )}>
                                                {t("currentBadge")}
                                            </span>
                                        )}
                                    </button>
                                ))}
                                {financialYears.length === 0 && (
                                    <p className="px-4 py-3 text-[13px] text-[var(--muted-foreground)]">
                                        {t("noYearsFound")}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <IOSButton
                        variant="secondary"
                        size="sm"
                        onClick={handleExport}
                        disabled={!data}
                    >
                        <Download className="h-4 w-4 mr-1.5" />
                        {t("exportBtn")}
                    </IOSButton>
                </div>
            </motion.div>

            {/* ─── KPI Summary Cards ─────────────────────── */}
            {data?.summary && (
                <motion.div variants={staggerItem} className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full min-w-0">
                    <KPICard
                        label={tKpi("totalRevenue")}
                        value={formatCurrency(data.summary.totalRevenue)}
                        icon={TrendingUp}
                        color="blue"
                    />
                    <KPICard
                        label={tKpi("totalBilled")}
                        value={formatCurrency(data.summary.totalBilled)}
                        icon={FileText}
                        color="green"
                    />
                    <KPICard
                        label={tKpi("totalCollected")}
                        value={formatCurrency(data.summary.totalPaid)}
                        icon={IndianRupee}
                        color="orange"
                    />
                    <KPICard
                        label={tKpi("paymentsToCollect")}
                        value={formatCurrency(Math.max(0, data.summary.totalRevenue - data.summary.totalPaid))}
                        icon={Wallet}
                        color="purple"
                    />
                </motion.div>
            )}

            {/* ─── Tab Navigation (Pill Style) ───────────── */}
            <motion.div variants={staggerItem} className="w-full min-w-0">
                <div className="w-full min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-1 sm:p-1.5 bg-[var(--accent)]/50 dark:bg-[var(--accent)]/30 rounded-[14px]">
                  <div className="flex gap-1 sm:gap-1.5 w-max">
                    {TAB_CONFIG.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const count = tab.id === "inventory"
                            ? data?.inventoryUsage?.length
                            : data?.[tab.id as keyof FYData]
                                ? (data[tab.id as keyof FYData] as any[])?.length
                                : 0;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-[10px] text-[13px] sm:text-[14px] font-medium transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95 shrink-0 whitespace-nowrap cursor-pointer",
                                    isActive
                                        ? "bg-white dark:bg-[var(--card)] text-[var(--foreground)] shadow-[0_1px_4px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
                                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/50 dark:hover:bg-white/5"
                                )}
                            >
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{tTabs(tab.key)}</span>
                                {(count ?? 0) > 0 && (
                                    <span className={cn(
                                        "text-[11px] px-1.5 py-0.5 rounded-full font-medium",
                                        isActive
                                            ? "bg-[var(--primary)] text-white"
                                            : "bg-[var(--accent)] text-[var(--muted-foreground)]"
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                  </div>
                </div>
            </motion.div>

            {/* ─── Data Table ─────────────────────────────── */}
            <motion.div variants={staggerItem} className="w-full min-w-0 overflow-x-clip">
                {dataLoading ? (
                    <div key="loading-state" className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-[3px] border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !data ? (
                    <IOSCard key="empty-state" variant="elevated" padding="lg" className="text-center py-16 min-w-0 w-full overflow-hidden">
                        <Calendar className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4 opacity-50" />
                        <p className="text-[17px] font-semibold text-[var(--foreground)]">{t("emptySelectTitle")}</p>
                        <p className="text-[15px] text-[var(--muted-foreground)] mt-1">{t("emptySelectDesc")}</p>
                    </IOSCard>
                ) : (
                    <IOSCard key="data-loaded" variant="elevated" padding="none" className="overflow-x-clip bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)]">
                        <div className="w-full min-w-0">
                            {activeTab === "orders" && <OrdersTable data={data.orders || []} />}
                            {activeTab === "productions" && <ProductionsTable data={data.productions || []} />}
                            {activeTab === "bills" && <BillsTable data={data.bills || []} />}
                            {activeTab === "payments" && <PaymentsTable data={data.payments || []} />}
                            {activeTab === "inventory" && (
                                <InventoryUsageTable
                                    usage={data.inventoryUsage || []}
                                    traceability={data.batchTraceability || []}
                                />
                            )}
                        </div>
                    </IOSCard>
                )}
            </motion.div>
        </motion.div>
        </div>
    );
}

// ─── Table Components ────────────────────────────────────

function EmptyState({ message }: { message: string }) {
    return (
        <div className="text-center py-16">
            <p className="text-[15px] text-[var(--muted-foreground)]">{message}</p>
        </div>
    );
}

const thClass = "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--accent)]/30 whitespace-nowrap";
const tdClass = "px-3 sm:px-4 py-3 sm:py-3.5 text-[13px] sm:text-[14px] text-[var(--foreground)] border-t border-[var(--border)]/50";

function OrdersTable({ data }: { data: any[] }) {
    const tEmpty = useTranslations("previousYears.empty");
    const tOrders = useTranslations("previousYears.orders");

    if (data.length === 0) return <EmptyState message={tEmpty("orders")} />;
    return (
        <>
            {/* Mobile cards */}
            <MobileTableCards
                data={data}
                className="md:hidden"
                emptyMessage={tEmpty("orders")}
                fields={[
                    { key: "product_name", label: tOrders("product"), primary: true },
                    { key: "quantity", label: tOrders("quantity"), render: (_v, o) => `${o.quantity} ${o.unit || ""}` },
                    { key: "total_amount", label: tOrders("amount"), render: (_v, o) => formatCurrency(o.total_amount || 0) },
                    {
                        key: "status", label: tOrders("status"), render: (_v, o) => {
                            const ps = o.production_status || o.status;
                            const s = ps === "completed" && o.payment_status === "paid" ? "completed" : ps === "completed" ? "awaiting_payment" : ps || "pending";
                            return <StatusBadge status={s} />;
                        }
                    },
                    { key: "payment_status", label: tOrders("payment"), render: (_v, o) => <StatusBadge status={o.payment_status} /> },
                    { key: "createdAt", label: tOrders("date"), render: (_v, o) => o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "—" },
                ]}
            />
            {/* Desktop table */}
            <div className="w-full min-w-0 overflow-x-auto">
                <table className="hidden md:table min-w-[600px] w-full">
                    <thead>
                        <tr>
                            <th className={cn(thClass, "sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{tOrders("product")}</th>
                            <th className={thClass}>{tOrders("quantity")}</th>
                            <th className={cn(thClass, "text-right")}>{tOrders("amount")}</th>
                            <th className={thClass}>{tOrders("status")}</th>
                            <th className={thClass}>{tOrders("payment")}</th>
                            <th className={thClass}>{tOrders("date")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((o) => (
                            <tr key={o.id} className="hover:bg-[var(--accent)]/20 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                <td className={cn(tdClass, "font-medium max-w-[180px] truncate sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{o.product_name}</td>
                                <td className={cn(tdClass, "whitespace-nowrap")}>{o.quantity} {o.unit}</td>
                                <td className={cn(tdClass, "font-semibold tabular-nums text-right whitespace-nowrap")}>{formatCurrency(o.total_amount || 0)}</td>
                                <td className={tdClass}><StatusBadge status={(() => {
                                    const ps = o.production_status || o.status;
                                    if (ps === "completed" && o.payment_status === "paid") return "completed";
                                    if (ps === "completed") return "awaiting_payment";
                                    return ps || "pending";
                                })()} /></td>
                                <td className={tdClass}><StatusBadge status={o.payment_status} /></td>
                                <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums whitespace-nowrap")}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function ProductionsTable({ data }: { data: any[] }) {
    const tEmpty = useTranslations("previousYears.empty");
    const tProd = useTranslations("previousYears.productions");

    if (data.length === 0) return <EmptyState message={tEmpty("productions")} />;
    return (
        <>
            {/* Mobile cards */}
            <MobileTableCards
                data={data}
                className="md:hidden"
                emptyMessage={tEmpty("productions")}
                fields={[
                    { key: "batchNumber", label: tProd("batch"), primary: true, render: (v) => <span className="font-mono text-[13px]">{v}</span> },
                    { key: "orderProductName", label: tProd("product") },
                    { key: "orderQuantity", label: tProd("target") },
                    { key: "producedQuantity", label: tProd("produced"), render: (v) => <span className="font-semibold text-[var(--erp-success)]">{v}</span> },
                    { key: "rejectQuantity", label: tProd("rejected"), render: (v) => <span className={v > 0 ? "text-[var(--erp-danger)]" : ""}>{v}</span> },
                    { key: "status", label: tProd("status"), render: (_v, p) => <StatusBadge status={p.status} /> },
                    { key: "createdAt", label: tProd("date"), render: (_v, p) => p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—" },
                ]}
            />
            {/* Desktop table */}
            <div className="w-full min-w-0 overflow-x-auto">
                <table className="hidden md:table min-w-[650px] w-full">
                    <thead>
                        <tr>
                            <th className={thClass}>{tProd("batch")}</th>
                            <th className={cn(thClass, "sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{tProd("product")}</th>
                            <th className={thClass}>{tProd("target")}</th>
                            <th className={thClass}>{tProd("produced")}</th>
                            <th className={thClass}>{tProd("rejected")}</th>
                            <th className={thClass}>{tProd("status")}</th>
                            <th className={thClass}>{tProd("date")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((p) => (
                            <tr key={p.id} className="hover:bg-[var(--accent)]/20 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                <td className={cn(tdClass, "font-mono text-[13px] whitespace-nowrap")}>{p.batchNumber}</td>
                                <td className={cn(tdClass, "font-medium max-w-[180px] truncate sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{p.orderProductName}</td>
                                <td className={cn(tdClass, "tabular-nums whitespace-nowrap")}>{p.orderQuantity}</td>
                                <td className={cn(tdClass, "tabular-nums font-semibold text-[var(--erp-success)] whitespace-nowrap")}>{p.producedQuantity}</td>
                                <td className={cn(tdClass, "tabular-nums whitespace-nowrap", p.rejectQuantity > 0 ? "text-[var(--erp-danger)]" : "")}>{p.rejectQuantity}</td>
                                <td className={tdClass}><StatusBadge status={p.status} /></td>
                                <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums whitespace-nowrap")}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function BillsTable({ data }: { data: any[] }) {
    const tEmpty = useTranslations("previousYears.empty");
    const tBills = useTranslations("previousYears.bills");

    if (data.length === 0) return <EmptyState message={tEmpty("bills")} />;
    return (
        <>
            {/* Mobile cards */}
            <MobileTableCards
                data={data}
                className="md:hidden"
                emptyMessage={tEmpty("bills")}
                fields={[
                    { key: "billNumber", label: tBills("invoiceNum"), primary: true, render: (v) => <span className="font-mono text-[13px] font-medium">{v}</span> },
                    { key: "clientName", label: tBills("client") },
                    { key: "totalAmount", label: tBills("amount"), render: (_v, b) => formatCurrency(b.totalAmount || 0) },
                    { key: "status", label: tBills("status"), render: (_v, b) => <StatusBadge status={b.status} /> },
                    { key: "billDate", label: tBills("date"), render: (v) => v || "—" },
                ]}
            />
            {/* Desktop table */}
            <div className="w-full min-w-0 overflow-x-auto">
                <table className="hidden md:table min-w-[550px] w-full">
                    <thead>
                        <tr>
                            <th className={thClass}>{tBills("invoiceNum")}</th>
                            <th className={cn(thClass, "sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{tBills("client")}</th>
                            <th className={cn(thClass, "text-right")}>{tBills("amount")}</th>
                            <th className={thClass}>{tBills("status")}</th>
                            <th className={thClass}>{tBills("date")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((b) => (
                            <tr key={b.id} className="hover:bg-[var(--accent)]/20 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                <td className={cn(tdClass, "font-mono text-[13px] font-medium whitespace-nowrap")}>{b.billNumber}</td>
                                <td className={cn(tdClass, "font-medium max-w-[180px] truncate sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{b.clientName}</td>
                                <td className={cn(tdClass, "font-semibold tabular-nums text-right whitespace-nowrap")}>{formatCurrency(b.totalAmount || 0)}</td>
                                <td className={tdClass}><StatusBadge status={b.status} /></td>
                                <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums whitespace-nowrap")}>{b.billDate || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function PaymentsTable({ data }: { data: any[] }) {
    const tEmpty = useTranslations("previousYears.empty");
    const tPayments = useTranslations("previousYears.payments");

    const renderMethod = (method: string) => {
        const m = (method || "").toLowerCase().replace(/ /g, "_");
        if (m === "cash") return tPayments("methods.cash");
        if (m === "bank_transfer" || m === "bank") return tPayments("methods.bank_transfer");
        if (m === "upi") return tPayments("methods.upi");
        if (m === "cheque" || m === "check") return tPayments("methods.cheque");
        if (m === "card") return tPayments("methods.card");
        return (method || "").replace(/_/g, " ");
    };

    if (data.length === 0) return <EmptyState message={tEmpty("payments")} />;
    return (
        <>
            {/* Mobile cards */}
            <MobileTableCards
                data={data}
                className="md:hidden"
                emptyMessage={tEmpty("payments")}
                fields={[
                    {
                        key: "amount", label: tPayments("amount"), primary: true, render: (_v, p) => (
                            <span className="font-semibold text-[var(--erp-success)]">{formatCurrency(p.amount || 0)}</span>
                        )
                    },
                    { key: "payment_method", label: tPayments("method"), render: (v) => <span className="capitalize">{renderMethod(v)}</span> },
                    { key: "notes", label: tPayments("notes"), render: (v) => v || "—" },
                    {
                        key: "payment_date", label: tPayments("date"), render: (_v, p) => {
                            const d = p.payment_date || p.createdAt;
                            return d ? new Date(d).toLocaleDateString("en-IN") : "—";
                        }
                    },
                ]}
            />
            {/* Desktop table */}
            <div className="w-full min-w-0 overflow-x-auto">
                <table className="hidden md:table min-w-[500px] w-full">
                    <thead>
                        <tr>
                            <th className={cn(thClass, "text-right")}>{tPayments("amount")}</th>
                            <th className={thClass}>{tPayments("method")}</th>
                            <th className={thClass}>{tPayments("notes")}</th>
                            <th className={thClass}>{tPayments("date")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((p) => (
                            <tr key={p.id} className="hover:bg-[var(--accent)]/20 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                <td className={cn(tdClass, "font-semibold tabular-nums text-[var(--erp-success)] text-right whitespace-nowrap")}>{formatCurrency(p.amount || 0)}</td>
                                <td className={cn(tdClass, "capitalize whitespace-nowrap")}>{renderMethod(p.payment_method)}</td>
                                <td className={cn(tdClass, "text-[var(--muted-foreground)] max-w-[200px] truncate")}>{p.notes || "—"}</td>
                                <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums whitespace-nowrap")}>
                                    {p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-IN") : (p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—")}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function InventoryUsageTable({ usage, traceability }: { usage: any[]; traceability: any[] }) {
    const [showTraceability, setShowTraceability] = useState(false);
    const tEmpty = useTranslations("previousYears.empty");
    const tInv = useTranslations("previousYears.inventory");

    return (
        <div>
            {/* Section toggle */}
            <div className="flex gap-2 p-4 border-b border-[var(--border)]/50 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                    onClick={() => setShowTraceability(false)}
                    className={cn(
                        "px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95 shrink-0 whitespace-nowrap cursor-pointer",
                        !showTraceability
                            ? "bg-[var(--primary)] text-white"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                    )}
                >
                    {tInv("materialDeductionsTab", { count: usage.length })}
                </button>
                <button
                    onClick={() => setShowTraceability(true)}
                    className={cn(
                        "px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95 shrink-0 whitespace-nowrap cursor-pointer",
                        showTraceability
                            ? "bg-[var(--primary)] text-white"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                    )}
                >
                    {tInv("batchTraceabilityTab", { count: traceability.length })}
                </button>
            </div>

            {!showTraceability ? (
                usage.length === 0 ? (
                    <EmptyState message={tEmpty("materialDeductions")} />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <MobileTableCards
                            data={usage}
                            className="md:hidden"
                            emptyMessage={tEmpty("materialDeductions")}
                            fields={[
                                { key: "item_name", label: tInv("material"), primary: true, render: (v) => v || "—" },
                                { key: "quantity_deducted", label: tInv("qtyDeducted"), render: (v) => <span className="font-semibold tabular-nums">{v}</span> },
                                { key: "order_id", label: tInv("orderId"), render: (v) => <span className="font-mono text-[12px]">{v?.slice(0, 8)}...</span> },
                                { key: "createdAt", label: tInv("date"), render: (v) => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
                            ]}
                        />
                        {/* Desktop table */}
                        <div className="w-full min-w-0 overflow-x-auto">
                            <table className="hidden md:table min-w-[500px] w-full">
                                <thead>
                                    <tr>
                                        <th className={cn(thClass, "sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{tInv("material")}</th>
                                        <th className={thClass}>{tInv("qtyDeducted")}</th>
                                        <th className={thClass}>{tInv("orderId")}</th>
                                        <th className={thClass}>{tInv("date")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usage.map((u) => (
                                        <tr key={u.id} className="hover:bg-[var(--accent)]/20 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                            <td className={cn(tdClass, "font-medium max-w-[180px] truncate sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{u.item_name || "—"}</td>
                                            <td className={cn(tdClass, "tabular-nums font-semibold whitespace-nowrap")}>{u.quantity_deducted}</td>
                                            <td className={cn(tdClass, "font-mono text-[12px] text-[var(--muted-foreground)] whitespace-nowrap")}>{u.order_id?.slice(0, 8)}...</td>
                                            <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums whitespace-nowrap")}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )
            ) : (
                traceability.length === 0 ? (
                    <EmptyState message={tEmpty("batchTraceability")} />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <MobileTableCards
                            data={traceability}
                            className="md:hidden"
                            emptyMessage={tEmpty("batchTraceability")}
                            fields={[
                                { key: "itemName", label: tInv("material"), primary: true, render: (v) => v || "—" },
                                { key: "quantityUsed", label: tInv("qtyUsed"), render: (v) => <span className="font-semibold tabular-nums">{v}</span> },
                                { key: "unit", label: tInv("unit"), render: (v) => v || "—" },
                                { key: "productionJobId", label: tInv("productionJob"), render: (v) => <span className="font-mono text-[12px]">{v?.slice(0, 8)}...</span> },
                                { key: "createdAt", label: tInv("date"), render: (v) => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
                            ]}
                        />
                        {/* Desktop table */}
                        <div className="w-full min-w-0 overflow-x-auto">
                            <table className="hidden md:table min-w-[550px] w-full">
                                <thead>
                                    <tr>
                                        <th className={cn(thClass, "sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{tInv("material")}</th>
                                        <th className={thClass}>{tInv("qtyUsed")}</th>
                                        <th className={thClass}>{tInv("unit")}</th>
                                        <th className={thClass}>{tInv("productionJob")}</th>
                                        <th className={thClass}>{tInv("date")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {traceability.map((m) => (
                                        <tr key={m.id} className="hover:bg-[var(--accent)]/20 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                            <td className={cn(tdClass, "font-medium max-w-[180px] truncate sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{m.itemName || "—"}</td>
                                            <td className={cn(tdClass, "tabular-nums font-semibold whitespace-nowrap")}>{m.quantityUsed}</td>
                                            <td className={cn(tdClass, "whitespace-nowrap")}>{m.unit || "—"}</td>
                                            <td className={cn(tdClass, "font-mono text-[12px] text-[var(--muted-foreground)] whitespace-nowrap")}>{m.productionJobId?.slice(0, 8)}...</td>
                                            <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums whitespace-nowrap")}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )
            )}
        </div>
    );
}
