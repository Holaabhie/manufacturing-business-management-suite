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
    Layers,
} from "lucide-react";
import { IOSCard, IOSCardHeader, IOSCardContent } from "@/components/ui/ios/IOSCard";
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

const TABS = [
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "productions", label: "Production", icon: Factory },
    { id: "bills", label: "Bills / Invoices", icon: FileText },
    { id: "payments", label: "Payments", icon: IndianRupee },
    { id: "inventory", label: "Inventory Usage", icon: Package },
] as const;

type TabId = typeof TABS[number]["id"];

// ─── Format Currency ─────────────────────────────────────
function formatCurrency(value: number): string {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString("en-IN")}`;
}

// ─── Status Badge ────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const s = status?.toLowerCase() || "";
    let variant: "default" | "success" | "warning" | "error" = "default";
    if (["completed", "paid", "delivered"].includes(s)) variant = "success";
    else if (["processing", "in_progress", "partial", "draft", "awaiting_payment", "awaiting payment"].includes(s)) variant = "warning";
    else if (["cancelled", "on_hold", "overdue", "rejected"].includes(s)) variant = "error";

    const label = s === "awaiting_payment" ? "AWAITING PAYMENT" : s === "on_hold" ? "ON HOLD" : status;
    return <IOSBadge variant={variant}>{label}</IOSBadge>;
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
        <IOSCard variant="elevated" padding="none" className="p-3 sm:p-4 md:p-5 bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)] shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] dark:shadow-none">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className={cn("w-8 h-8 sm:w-[40px] sm:h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0", bgMap[color])}>
                    <Icon className={cn("h-4 w-4 sm:h-[18px] sm:w-[18px]", iconColorMap[color])} />
                </div>
                <span className="text-[12px] sm:text-[13px] text-[var(--muted-foreground)] leading-[16px] sm:leading-[18px] min-w-0 truncate">{label}</span>
            </div>
            <span className="text-[20px] sm:text-[24px] md:text-[28px] font-bold tracking-tight tabular-nums text-[var(--foreground)] block truncate">{value}</span>
        </IOSCard>
    );
}

// ─── Page Component ──────────────────────────────────────
export default function PreviousYearsPage() {
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
                toast.error("Failed to load financial years");
            } finally {
                setLoading(false);
            }
        }
        loadYears();
    }, []);

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
                toast.error("Failed to load data for this financial year");
            }
        } catch {
            toast.error("Network error loading report");
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedFY) loadData(selectedFY);
    }, [selectedFY, loadData]);

    // Export handler
    const handleExport = useCallback(() => {
        if (!data) return;
        const sections: Record<string, any[]> = {};
        if (data.orders?.length) sections["Orders"] = data.orders;
        if (data.productions?.length) sections["Productions"] = data.productions;
        if (data.bills?.length) sections["Bills"] = data.bills;
        if (data.payments?.length) sections["Payments"] = data.payments;
        if (data.inventoryUsage?.length) sections["Inventory Usage"] = data.inventoryUsage;

        const activeData = sections[Object.keys(sections)[0]] || [];
        if (activeData.length === 0) {
            toast.error("No data to export");
            return;
        }

        exportToExcel(activeData, `FY-${selectedFY}-report`);
        toast.success("Exported successfully");
    }, [data, selectedFY]);

    if (roleLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-[3px] border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[15px] text-[var(--muted-foreground)]">Loading...</span>
                </div>
            </div>
        );
    }

    if (!isOwner) return <AccessDenied />;

    return (
        <motion.div
            className="space-y-4 sm:space-y-6 max-w-[1200px] mx-auto scroll-mt-14 sm:scroll-mt-16 pb-28 sm:pb-8"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
        >
            {/* ─── Header ──────────────────────────────────── */}
            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
                <div className="min-w-0 flex-1">
                    <h1 className="text-[22px] sm:text-[24px] md:text-[28px] font-bold tracking-[0.36px] text-[var(--foreground)] truncate">
                        Previous Years
                    </h1>
                    <p className="text-[15px] text-[var(--muted-foreground)] mt-1 break-words">
                        Browse archived financial year data — read-only view
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                    {/* FY Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFYDropdown(!showFYDropdown)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-[12px] bg-white dark:bg-[var(--card)] border border-black/[0.09] dark:border-[var(--border)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-200 text-[14px] sm:text-[15px] font-medium text-[var(--foreground)] min-w-[140px] sm:min-w-[160px]"
                        >
                            <Calendar className="h-4 w-4 text-[var(--primary)]" />
                            <span>FY {selectedFY || "Select"}</span>
                            {selectedFY === currentFY && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[rgba(0,122,255,0.1)] text-[var(--primary)] font-medium">
                                    Current
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
                                        <span>FY {fy}</span>
                                        {fy === currentFY && (
                                            <span className={cn(
                                                "text-[11px] px-1.5 py-0.5 rounded-full font-medium",
                                                fy === selectedFY
                                                    ? "bg-white/20 text-white"
                                                    : "bg-[rgba(0,122,255,0.1)] text-[var(--primary)]"
                                            )}>
                                                Current
                                            </span>
                                        )}
                                    </button>
                                ))}
                                {financialYears.length === 0 && (
                                    <p className="px-4 py-3 text-[13px] text-[var(--muted-foreground)]">
                                        No financial years found. Run the migration script first.
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
                        Export
                    </IOSButton>
                </div>
            </motion.div>

            {/* ─── KPI Summary Cards ─────────────────────── */}
            {data?.summary && (
                <motion.div variants={staggerItem} className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    <KPICard
                        label="Total Revenue"
                        value={formatCurrency(data.summary.totalRevenue)}
                        icon={TrendingUp}
                        color="blue"
                    />
                    <KPICard
                        label="Total Billed"
                        value={formatCurrency(data.summary.totalBilled)}
                        icon={FileText}
                        color="green"
                    />
                    <KPICard
                        label="Total Collected"
                        value={formatCurrency(data.summary.totalPaid)}
                        icon={IndianRupee}
                        color="orange"
                    />
                    <KPICard
                        label="Materials Used"
                        value={data.summary.totalMaterialDeducted.toLocaleString("en-IN")}
                        icon={Layers}
                        color="purple"
                    />
                </motion.div>
            )}

            {/* ─── Tab Navigation (Pill Style) ───────────── */}
            <motion.div variants={staggerItem}>
                <div className="flex gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-[var(--accent)]/50 dark:bg-[var(--accent)]/30 rounded-[14px] overflow-x-auto scrollbar-hide">
                    {TABS.map((tab) => {
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
                                    "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-[10px] text-[13px] sm:text-[14px] font-medium whitespace-nowrap transition-all duration-200",
                                    isActive
                                        ? "bg-white dark:bg-[var(--card)] text-[var(--foreground)] shadow-[0_1px_4px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
                                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/50 dark:hover:bg-white/5"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
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
            </motion.div>

            {/* ─── Data Table ─────────────────────────────── */}
            <motion.div variants={staggerItem}>
                {dataLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-[3px] border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !data ? (
                    <IOSCard variant="elevated" padding="lg" className="text-center py-16">
                        <Calendar className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4 opacity-50" />
                        <p className="text-[17px] font-semibold text-[var(--foreground)]">Select a Financial Year</p>
                        <p className="text-[15px] text-[var(--muted-foreground)] mt-1">Choose a year from the dropdown to view archived data.</p>
                    </IOSCard>
                ) : (
                    <IOSCard variant="elevated" padding="none" className="overflow-hidden bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)]">
                        <div className="overflow-x-auto scrollbar-thin">
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
    );
}

// ─── Table Components ────────────────────────────────────

function EmptyState({ label }: { label: string }) {
    return (
        <div className="text-center py-16">
            <p className="text-[15px] text-[var(--muted-foreground)]">No {label} found for this financial year.</p>
        </div>
    );
}

const thClass = "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--accent)]/30 whitespace-nowrap";
const tdClass = "px-3 sm:px-4 py-3 sm:py-3.5 text-[13px] sm:text-[14px] text-[var(--foreground)] border-t border-[var(--border)]/50";

function OrdersTable({ data }: { data: any[] }) {
    if (data.length === 0) return <EmptyState label="orders" />;
    return (
        <>
            {/* Mobile cards */}
            <MobileTableCards
                data={data}
                className="md:hidden"
                fields={[
                    { key: "product_name", label: "Product", primary: true },
                    { key: "quantity", label: "Quantity", render: (_v, o) => `${o.quantity} ${o.unit || ""}` },
                    { key: "total_amount", label: "Amount", render: (_v, o) => formatCurrency(o.total_amount || 0) },
                    { key: "status", label: "Status", render: (_v, o) => {
                        const ps = o.production_status || o.status;
                        const s = ps === "completed" && o.payment_status === "paid" ? "completed" : ps === "completed" ? "awaiting_payment" : ps || "pending";
                        return <StatusBadge status={s} />;
                    }},
                    { key: "payment_status", label: "Payment", render: (_v, o) => <StatusBadge status={o.payment_status} /> },
                    { key: "createdAt", label: "Date", render: (_v, o) => o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "—" },
                ]}
            />
            {/* Desktop table */}
            <table className="hidden md:table min-w-[600px] w-full">
                <thead>
                    <tr>
                        <th className={cn(thClass, "sticky left-0 z-10 bg-[var(--accent)]/30")}>Product</th>
                        <th className={thClass}>Quantity</th>
                        <th className={cn(thClass, "text-right")}>Amount</th>
                        <th className={thClass}>Status</th>
                        <th className={thClass}>Payment</th>
                        <th className={thClass}>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((o) => (
                        <tr key={o.id} className="hover:bg-[var(--accent)]/20 transition-colors">
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
        </>
    );
}

function ProductionsTable({ data }: { data: any[] }) {
    if (data.length === 0) return <EmptyState label="production records" />;
    return (
        <>
            {/* Mobile cards */}
            <MobileTableCards
                data={data}
                className="md:hidden"
                fields={[
                    { key: "batchNumber", label: "Batch", primary: true, render: (v) => <span className="font-mono text-[13px]">{v}</span> },
                    { key: "orderProductName", label: "Product" },
                    { key: "orderQuantity", label: "Target" },
                    { key: "producedQuantity", label: "Produced", render: (v) => <span className="font-semibold text-[var(--erp-success)]">{v}</span> },
                    { key: "rejectQuantity", label: "Rejected", render: (v) => <span className={v > 0 ? "text-[var(--erp-danger)]" : ""}>{v}</span> },
                    { key: "status", label: "Status", render: (_v, p) => <StatusBadge status={p.status} /> },
                    { key: "createdAt", label: "Date", render: (_v, p) => p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—" },
                ]}
            />
            {/* Desktop table */}
            <table className="hidden md:table min-w-[650px] w-full">
                <thead>
                    <tr>
                        <th className={thClass}>Batch</th>
                        <th className={cn(thClass, "sticky left-0 z-10 bg-[var(--accent)]/30")}>Product</th>
                        <th className={thClass}>Target</th>
                        <th className={thClass}>Produced</th>
                        <th className={thClass}>Rejected</th>
                        <th className={thClass}>Status</th>
                        <th className={thClass}>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((p) => (
                        <tr key={p.id} className="hover:bg-[var(--accent)]/20 transition-colors">
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
        </>
    );
}

function BillsTable({ data }: { data: any[] }) {
    if (data.length === 0) return <EmptyState label="bills/invoices" />;
    return (
        <>
            {/* Mobile cards */}
            <MobileTableCards
                data={data}
                className="md:hidden"
                fields={[
                    { key: "billNumber", label: "Invoice #", primary: true, render: (v) => <span className="font-mono text-[13px] font-medium">{v}</span> },
                    { key: "clientName", label: "Client" },
                    { key: "totalAmount", label: "Amount", render: (_v, b) => formatCurrency(b.totalAmount || 0) },
                    { key: "status", label: "Status", render: (_v, b) => <StatusBadge status={b.status} /> },
                    { key: "billDate", label: "Date", render: (v) => v || "—" },
                ]}
            />
            {/* Desktop table */}
            <table className="hidden md:table min-w-[550px] w-full">
                <thead>
                    <tr>
                        <th className={thClass}>Invoice #</th>
                        <th className={cn(thClass, "sticky left-0 z-10 bg-[var(--accent)]/30")}>Client</th>
                        <th className={cn(thClass, "text-right")}>Amount</th>
                        <th className={thClass}>Status</th>
                        <th className={thClass}>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((b) => (
                        <tr key={b.id} className="hover:bg-[var(--accent)]/20 transition-colors">
                            <td className={cn(tdClass, "font-mono text-[13px] font-medium whitespace-nowrap")}>{b.billNumber}</td>
                            <td className={cn(tdClass, "font-medium max-w-[180px] truncate sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{b.clientName}</td>
                            <td className={cn(tdClass, "font-semibold tabular-nums text-right whitespace-nowrap")}>{formatCurrency(b.totalAmount || 0)}</td>
                            <td className={tdClass}><StatusBadge status={b.status} /></td>
                            <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums whitespace-nowrap")}>{b.billDate || "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}

function PaymentsTable({ data }: { data: any[] }) {
    if (data.length === 0) return <EmptyState label="payments" />;
    return (
        <>
            {/* Mobile cards */}
            <MobileTableCards
                data={data}
                className="md:hidden"
                fields={[
                    { key: "amount", label: "Amount", primary: true, render: (_v, p) => (
                        <span className="font-semibold text-[var(--erp-success)]">{formatCurrency(p.amount || 0)}</span>
                    )},
                    { key: "payment_method", label: "Method", render: (v) => <span className="capitalize">{(v || "").replace(/_/g, " ")}</span> },
                    { key: "notes", label: "Notes", render: (v) => v || "\u2014" },
                    { key: "payment_date", label: "Date", render: (_v, p) => {
                        const d = p.payment_date || p.createdAt;
                        return d ? new Date(d).toLocaleDateString("en-IN") : "\u2014";
                    }},
                ]}
            />
            {/* Desktop table */}
            <table className="hidden md:table min-w-[500px] w-full">
                <thead>
                    <tr>
                        <th className={cn(thClass, "text-right")}>Amount</th>
                        <th className={thClass}>Method</th>
                        <th className={thClass}>Notes</th>
                        <th className={thClass}>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((p) => (
                        <tr key={p.id} className="hover:bg-[var(--accent)]/20 transition-colors">
                            <td className={cn(tdClass, "font-semibold tabular-nums text-[var(--erp-success)] text-right whitespace-nowrap")}>{formatCurrency(p.amount || 0)}</td>
                            <td className={cn(tdClass, "capitalize whitespace-nowrap")}>{(p.payment_method || "").replace(/_/g, " ")}</td>
                            <td className={cn(tdClass, "text-[var(--muted-foreground)] max-w-[200px] truncate")}>{p.notes || "\u2014"}</td>
                            <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums whitespace-nowrap")}>
                                {p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-IN") : (p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "\u2014")}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}

function InventoryUsageTable({ usage, traceability }: { usage: any[]; traceability: any[] }) {
    const [showTraceability, setShowTraceability] = useState(false);

    return (
        <div>
            {/* Section toggle */}
            <div className="flex gap-2 p-4 border-b border-[var(--border)]/50">
                <button
                    onClick={() => setShowTraceability(false)}
                    className={cn(
                        "px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all",
                        !showTraceability
                            ? "bg-[var(--primary)] text-white"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                    )}
                >
                    Material Deductions ({usage.length})
                </button>
                <button
                    onClick={() => setShowTraceability(true)}
                    className={cn(
                        "px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all",
                        showTraceability
                            ? "bg-[var(--primary)] text-white"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                    )}
                >
                    Batch Traceability ({traceability.length})
                </button>
            </div>

            {!showTraceability ? (
                usage.length === 0 ? (
                    <EmptyState label="material deduction records" />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <MobileTableCards
                            data={usage}
                            className="md:hidden"
                            fields={[
                                { key: "item_name", label: "Material", primary: true, render: (v) => v || "\u2014" },
                                { key: "quantity_deducted", label: "Qty Deducted", render: (v) => <span className="font-semibold tabular-nums">{v}</span> },
                                { key: "order_id", label: "Order ID", render: (v) => <span className="font-mono text-[12px]">{v?.slice(0, 8)}...</span> },
                                { key: "createdAt", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString("en-IN") : "\u2014" },
                            ]}
                        />
                        {/* Desktop table */}
                        <table className="hidden md:table min-w-[500px] w-full">
                            <thead>
                                <tr>
                                    <th className={cn(thClass, "sticky left-0 z-10 bg-[var(--accent)]/30")}>Material</th>
                                    <th className={thClass}>Qty Deducted</th>
                                    <th className={thClass}>Order ID</th>
                                    <th className={thClass}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usage.map((u) => (
                                    <tr key={u.id} className="hover:bg-[var(--accent)]/20 transition-colors">
                                        <td className={cn(tdClass, "font-medium max-w-[180px] truncate sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{u.item_name || "\u2014"}</td>
                                        <td className={cn(tdClass, "tabular-nums font-semibold whitespace-nowrap")}>{u.quantity_deducted}</td>
                                        <td className={cn(tdClass, "font-mono text-[12px] text-[var(--muted-foreground)] whitespace-nowrap")}>{u.order_id?.slice(0, 8)}...</td>
                                        <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums whitespace-nowrap")}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "\u2014"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )
            ) : (
                traceability.length === 0 ? (
                    <EmptyState label="batch traceability records" />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <MobileTableCards
                            data={traceability}
                            className="md:hidden"
                            fields={[
                                { key: "itemName", label: "Material", primary: true, render: (v) => v || "\u2014" },
                                { key: "quantityUsed", label: "Qty Used", render: (v) => <span className="font-semibold tabular-nums">{v}</span> },
                                { key: "unit", label: "Unit", render: (v) => v || "\u2014" },
                                { key: "productionJobId", label: "Production Job", render: (v) => <span className="font-mono text-[12px]">{v?.slice(0, 8)}...</span> },
                                { key: "createdAt", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString("en-IN") : "\u2014" },
                            ]}
                        />
                        {/* Desktop table */}
                        <table className="hidden md:table min-w-[550px] w-full">
                            <thead>
                                <tr>
                                    <th className={cn(thClass, "sticky left-0 z-10 bg-[var(--accent)]/30")}>Material</th>
                                    <th className={thClass}>Qty Used</th>
                                    <th className={thClass}>Unit</th>
                                    <th className={thClass}>Production Job</th>
                                    <th className={thClass}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {traceability.map((m) => (
                                    <tr key={m.id} className="hover:bg-[var(--accent)]/20 transition-colors">
                                        <td className={cn(tdClass, "font-medium max-w-[180px] truncate sticky left-0 z-10 bg-white dark:bg-[var(--card)]")}>{m.itemName || "\u2014"}</td>
                                        <td className={cn(tdClass, "tabular-nums font-semibold whitespace-nowrap")}>{m.quantityUsed}</td>
                                        <td className={cn(tdClass, "whitespace-nowrap")}>{m.unit || "\u2014"}</td>
                                        <td className={cn(tdClass, "font-mono text-[12px] text-[var(--muted-foreground)] whitespace-nowrap")}>{m.productionJobId?.slice(0, 8)}...</td>
                                        <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums whitespace-nowrap")}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-IN") : "\u2014"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )
            )}
        </div>
    );
}
