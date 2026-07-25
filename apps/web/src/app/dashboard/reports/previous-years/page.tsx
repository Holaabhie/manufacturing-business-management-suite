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
        <IOSCard variant="elevated" padding="lg" className="bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)] shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] dark:shadow-none">
            <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-[40px] h-[40px] rounded-[10px] flex items-center justify-center", bgMap[color])}>
                    <Icon className={cn("h-[18px] w-[18px]", iconColorMap[color])} />
                </div>
                <span className="text-[13px] text-[var(--muted-foreground)] leading-[18px]">{label}</span>
            </div>
            <span className="text-[28px] font-bold tracking-[0.36px] text-[var(--foreground)]">{value}</span>
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
            className="space-y-6 max-w-[1200px] mx-auto"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
        >
            {/* ─── Header ──────────────────────────────────── */}
            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-bold tracking-[0.36px] text-[var(--foreground)]">
                        Previous Years
                    </h1>
                    <p className="text-[15px] text-[var(--muted-foreground)] mt-1">
                        Browse archived financial year data — read-only view
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* FY Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFYDropdown(!showFYDropdown)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-white dark:bg-[var(--card)] border border-black/[0.09] dark:border-[var(--border)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-200 text-[15px] font-medium text-[var(--foreground)] min-w-[160px]"
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
                <motion.div variants={staggerItem} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="flex gap-1.5 p-1.5 bg-[var(--accent)]/50 dark:bg-[var(--accent)]/30 rounded-[14px] overflow-x-auto">
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
                                    "flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[14px] font-medium whitespace-nowrap transition-all duration-200",
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
                        <div className="overflow-x-auto">
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

const thClass = "px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--accent)]/30";
const tdClass = "px-4 py-3.5 text-[14px] text-[var(--foreground)] border-t border-[var(--border)]/50";

function OrdersTable({ data }: { data: any[] }) {
    if (data.length === 0) return <EmptyState label="orders" />;
    return (
        <table className="w-full">
            <thead>
                <tr>
                    <th className={thClass}>Product</th>
                    <th className={thClass}>Quantity</th>
                    <th className={thClass}>Amount</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Payment</th>
                    <th className={thClass}>Date</th>
                </tr>
            </thead>
            <tbody>
                {data.map((o) => (
                    <tr key={o.id} className="hover:bg-[var(--accent)]/20 transition-colors">
                        <td className={cn(tdClass, "font-medium")}>{o.product_name}</td>
                        <td className={tdClass}>{o.quantity} {o.unit}</td>
                        <td className={cn(tdClass, "font-semibold tabular-nums")}>{formatCurrency(o.total_amount || 0)}</td>
                        <td className={tdClass}><StatusBadge status={(() => {
                            const ps = o.production_status || o.status;
                            if (ps === "completed" && o.payment_status === "paid") return "completed";
                            if (ps === "completed") return "awaiting_payment";
                            return ps || "pending";
                        })()} /></td>
                        <td className={tdClass}><StatusBadge status={o.payment_status} /></td>
                        <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums")}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function ProductionsTable({ data }: { data: any[] }) {
    if (data.length === 0) return <EmptyState label="production records" />;
    return (
        <table className="w-full">
            <thead>
                <tr>
                    <th className={thClass}>Batch</th>
                    <th className={thClass}>Product</th>
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
                        <td className={cn(tdClass, "font-mono text-[13px]")}>{p.batchNumber}</td>
                        <td className={cn(tdClass, "font-medium")}>{p.orderProductName}</td>
                        <td className={cn(tdClass, "tabular-nums")}>{p.orderQuantity}</td>
                        <td className={cn(tdClass, "tabular-nums font-semibold text-[var(--erp-success)]")}>{p.producedQuantity}</td>
                        <td className={cn(tdClass, "tabular-nums", p.rejectQuantity > 0 ? "text-[var(--erp-danger)]" : "")}>{p.rejectQuantity}</td>
                        <td className={tdClass}><StatusBadge status={p.status} /></td>
                        <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums")}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function BillsTable({ data }: { data: any[] }) {
    if (data.length === 0) return <EmptyState label="bills/invoices" />;
    return (
        <table className="w-full">
            <thead>
                <tr>
                    <th className={thClass}>Invoice #</th>
                    <th className={thClass}>Client</th>
                    <th className={thClass}>Amount</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Date</th>
                </tr>
            </thead>
            <tbody>
                {data.map((b) => (
                    <tr key={b.id} className="hover:bg-[var(--accent)]/20 transition-colors">
                        <td className={cn(tdClass, "font-mono text-[13px] font-medium")}>{b.billNumber}</td>
                        <td className={cn(tdClass, "font-medium")}>{b.clientName}</td>
                        <td className={cn(tdClass, "font-semibold tabular-nums")}>{formatCurrency(b.totalAmount || 0)}</td>
                        <td className={tdClass}><StatusBadge status={b.status} /></td>
                        <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums")}>{b.billDate || "—"}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function PaymentsTable({ data }: { data: any[] }) {
    if (data.length === 0) return <EmptyState label="payments" />;
    return (
        <table className="w-full">
            <thead>
                <tr>
                    <th className={thClass}>Amount</th>
                    <th className={thClass}>Method</th>
                    <th className={thClass}>Notes</th>
                    <th className={thClass}>Date</th>
                </tr>
            </thead>
            <tbody>
                {data.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--accent)]/20 transition-colors">
                        <td className={cn(tdClass, "font-semibold tabular-nums text-[var(--erp-success)]")}>{formatCurrency(p.amount || 0)}</td>
                        <td className={cn(tdClass, "capitalize")}>{(p.payment_method || "").replace(/_/g, " ")}</td>
                        <td className={cn(tdClass, "text-[var(--muted-foreground)] max-w-[250px] truncate")}>{p.notes || "—"}</td>
                        <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums")}>
                            {p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-IN") : (p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—")}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
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
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className={thClass}>Material</th>
                                <th className={thClass}>Qty Deducted</th>
                                <th className={thClass}>Order ID</th>
                                <th className={thClass}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usage.map((u) => (
                                <tr key={u.id} className="hover:bg-[var(--accent)]/20 transition-colors">
                                    <td className={cn(tdClass, "font-medium")}>{u.item_name || "—"}</td>
                                    <td className={cn(tdClass, "tabular-nums font-semibold")}>{u.quantity_deducted}</td>
                                    <td className={cn(tdClass, "font-mono text-[12px] text-[var(--muted-foreground)]")}>{u.order_id?.slice(0, 8)}...</td>
                                    <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums")}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            ) : (
                traceability.length === 0 ? (
                    <EmptyState label="batch traceability records" />
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className={thClass}>Material</th>
                                <th className={thClass}>Qty Used</th>
                                <th className={thClass}>Unit</th>
                                <th className={thClass}>Production Job</th>
                                <th className={thClass}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {traceability.map((m) => (
                                <tr key={m.id} className="hover:bg-[var(--accent)]/20 transition-colors">
                                    <td className={cn(tdClass, "font-medium")}>{m.itemName || "—"}</td>
                                    <td className={cn(tdClass, "tabular-nums font-semibold")}>{m.quantityUsed}</td>
                                    <td className={tdClass}>{m.unit || "—"}</td>
                                    <td className={cn(tdClass, "font-mono text-[12px] text-[var(--muted-foreground)]")}>{m.productionJobId?.slice(0, 8)}...</td>
                                    <td className={cn(tdClass, "text-[var(--muted-foreground)] tabular-nums")}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            )}
        </div>
    );
}
