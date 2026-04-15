"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  IndianRupee,
  Box,
  Clock,
  AlertTriangle,
  CheckCircle,
  Truck,
  Activity,
  BarChart3,
  Plus,
  FileText,
  ChevronRight,
  ChevronDown,
  Users,
  Factory,
  MoreHorizontal,
  Trash2,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
} from "recharts";
import { IOSCard, IOSCardHeader, IOSCardContent } from "@/components/ui/ios/IOSCard";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { staggerContainer, staggerItem } from "@/styles/animations";
import { StatWidget, AnimatedValue, EmptyWidgetSlot } from "@/components/ui/StatWidget";
import StaffWorkPanel from "@/components/StaffWorkPanel";
import { useTranslations } from "next-intl";
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { SampleDataBanner } from "@/components/SampleDataBanner";

// ─── Types & Definitions ────────────────────────────────
interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalClients: number;
  lowStockItems: number;
  revenueGrowth: number;
  // customizable widget metrics
  pendingPayments: number;
  ordersInProduction: number;
  ordersReady: number;
  todaysProduction: number;
}

interface WidgetConfig {
  widget_type: string;
  widget_position: number;
  is_visible: boolean;
}

// Available widgets registry
const AVAILABLE_WIDGETS: { id: string; icon: any; color: string; prefix?: string; }[] = [
  { id: "Total Revenue", icon: IndianRupee, color: "blue", prefix: "₹" },
  { id: "Active Orders", icon: ShoppingCart, color: "green" },
  { id: "Total Clients", icon: Users, color: "purple" },
  { id: "Low Stock Items", icon: AlertTriangle, color: "orange" },
  { id: "Pending Payments", icon: Clock, color: "red" },
  { id: "Orders in Production", icon: Factory, color: "blue" },
  { id: "Orders Ready for Dispatch", icon: Truck, color: "green" },
  { id: "Today's Production", icon: Activity, color: "blue" },
];

interface RecentActivity {
  id: string;
  type: "order" | "production" | "inventory" | "payment" | "client";
  title: string;
  description: string;
  time: string;
  status: "success" | "warning" | "info" | "pending";
}

interface ChartDataPoint {
  name: string;
  revenue: number;
}

interface WeeklyDataPoint {
  day: string;
  value: number;
}

// ─── Glassmorphism Chart Tooltip ─────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[rgba(10,20,50,0.85)] backdrop-blur-md rounded-[12px] px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10">
      <p className="text-[13px] font-medium text-white/70 mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: p.color || '#0A84FF' }}
          />
          <p className="text-[15px] font-bold text-white tracking-tight">
            {p.name === "revenue" ? `₹${p.value.toLocaleString()}` : p.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [revenueData, setRevenueData] = useState<ChartDataPoint[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [roleLoading, setRoleLoading] = useState(true);
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tWidgets = useTranslations("widgets");

  // Widget State
  const [widgetLayout, setWidgetLayout] = useState<WidgetConfig[]>([]);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [savingWidgets, setSavingWidgets] = useState(false);

  // Export State
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // ─── Close export dropdown on outside click ──────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Fetch User Role First ────────────────────────────
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => ({}));
        setUserRole(json?.user?.role || null);
        setUserName(json?.user?.fullName || json?.user?.email?.split("@")[0] || "");
      } catch {
        setUserRole(null);
      } finally {
        setRoleLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  // ─── Fetch Widgets Layout ─────────────────────────────
  useEffect(() => {
    if (userRole === "Admin" || userRole === "Owner") {
      fetch("/api/dashboard/widgets")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.widgets) {
            setWidgetLayout(data.widgets);
          }
        })
        .catch((err) => console.error("Error fetching widgets:", err));
    }
  }, [userRole]);

  useEffect(() => {
    // Staff users don't need admin dashboard data
    if (userRole === "Staff") {
      setLoading(false);
      return;
    }
    // Wait until role is determined before fetching admin data
    if (roleLoading) return;

    const fetchDashboardData = async () => {
      try {
        const [statsRes, revenueRes, activityRes, weeklyOrdersRes] = await Promise.all([
          fetch("/api/dashboard/stats").then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/dashboard/revenue-chart?range=monthly").then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/dashboard/activity").then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/dashboard/weekly-orders").then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);

        if (statsRes && !statsRes.error) {
          setStats({
            totalRevenue: statsRes.totalRevenue || 0,
            totalOrders: statsRes.activeOrders || 0,
            totalClients: statsRes.totalClients || 0,
            lowStockItems: statsRes.lowStockItems || 0,
            revenueGrowth: statsRes.revenueGrowth || 0,
            pendingPayments: statsRes.pendingPayments || 0,
            ordersInProduction: statsRes.ordersInProduction || 0,
            ordersReady: statsRes.ordersReady || 0,
            todaysProduction: statsRes.todaysProduction || 0,
          });
        } else {
          setStats({ totalRevenue: 0, totalOrders: 0, totalClients: 0, lowStockItems: 0, revenueGrowth: 0, pendingPayments: 0, ordersInProduction: 0, ordersReady: 0, todaysProduction: 0 });
        }

        if (Array.isArray(revenueRes) && revenueRes.length > 0) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          setRevenueData(
            revenueRes.map((item: any) => {
              const parts = String(item.date).split("-");
              const monthIdx = parts.length >= 2 ? parseInt(parts[1], 10) - 1 : 0;
              return { name: monthNames[monthIdx] || item.date, revenue: Number(item.revenue) || 0 };
            })
          );
        } else {
          setRevenueData([]);
        }

        if (Array.isArray(activityRes) && activityRes.length > 0) {
          const activityList: RecentActivity[] = activityRes.map((item: any, index: number) => {
            const typeMap: Record<string, RecentActivity["type"]> = { order: "order", inventory: "inventory", client: "inventory", payment: "payment" };
            const statusMap: Record<string, RecentActivity["status"]> = { order: "info", inventory: "warning", client: "success", payment: "success" };
            return {
              id: String(index),
              type: typeMap[item.type] || "order",
              title: item.message?.split(":")[0] || item.type,
              description: item.message?.split(":").slice(1).join(":").trim() || item.message || "",
              time: item.createdAt || new Date().toISOString(),
              status: statusMap[item.type] || "info",
            };
          });
          setActivities(activityList);
        } else {
          setActivities([]);
        }

        if (weeklyOrdersRes && Array.isArray(weeklyOrdersRes.data)) {
          setWeeklyData(weeklyOrdersRes.data);
        } else {
          setWeeklyData(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => ({ day: d, value: 0 })));
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setStats({ totalRevenue: 0, totalOrders: 0, totalClients: 0, lowStockItems: 0, revenueGrowth: 0, pendingPayments: 0, ordersInProduction: 0, ordersReady: 0, todaysProduction: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userRole, roleLoading]);

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const activityIcons: Record<string, any> = {
    order: ShoppingCart, production: Activity, inventory: Package, payment: IndianRupee, client: Users,
  };

  const activityColors: Record<string, string> = {
    success: "bg-[rgba(52,199,89,0.12)] text-[var(--ios-green)]",
    warning: "bg-[rgba(255,149,0,0.12)] text-[var(--ios-orange)]",
    info: "bg-[rgba(0,122,255,0.12)] text-[var(--ios-blue)]",
    pending: "bg-[rgba(142,142,147,0.12)] text-[var(--ios-gray)]",
  };

  // ─── Export Helpers ────────────────────────────────────
  const fetchExportData = useCallback(async () => {
    const [ordersRes, paymentsRes, statsRes] = await Promise.all([
      fetch("/api/orders").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/payments").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/dashboard/stats").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    return {
      orders: Array.isArray(ordersRes) ? ordersRes : [],
      payments: Array.isArray(paymentsRes) ? paymentsRes : [],
      stats: statsRes && !statsRes.error ? statsRes : null,
    };
  }, []);

  const fmtDate = (d: any) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "—"; }
  };
  const fmtCurrency = (v: any) => {
    const n = Number(v);
    return isNaN(n) ? "₹0" : `₹${n.toLocaleString("en-IN")}`;
  };

  const handleExportExcel = useCallback(async () => {
    setExportLoading(true);
    setExportDropdownOpen(false);
    try {
      const { orders, payments, stats: s } = await fetchExportData();

      // Sheet 1 — Summary
      const summaryRows = [
        ["IND Manager — Dashboard Report"],
        ["Generated", new Date().toLocaleString("en-IN")],
        [],
        ["Metric", "Value"],
        ["Total Revenue", s ? fmtCurrency(s.totalRevenue) : "—"],
        ["Total Orders", s?.activeOrders ?? stats?.totalOrders ?? "—"],
        ["Active Clients", s?.totalClients ?? stats?.totalClients ?? "—"],
        ["Orders in Production", s?.ordersInProduction ?? stats?.ordersInProduction ?? "—"],
        ["Pending Payments", s?.pendingPayments ?? stats?.pendingPayments ?? "—"],
        [],
        ["Recent Payments"],
        ["Client", "Amount", "Method", "Date"],
        ...payments.slice(0, 20).map((p: any) => [
          p.clients?.name || "—",
          fmtCurrency(p.amount),
          p.payment_method || "—",
          fmtDate(p.payment_date || p.createdAt),
        ]),
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 18 }];

      // Sheet 2 — Orders
      const orderHeaders = ["Order ID", "Client", "Product", "Qty", "Status", "Amount", "Date"];
      const orderRows = orders.map((o: any) => [
        o.id || "—",
        o.clients?.name || "—",
        o.product_name || "—",
        o.quantity ?? "—",
        o.status || "—",
        fmtCurrency(o.total_amount),
        fmtDate(o.createdAt || o.created_at),
      ]);
      const wsOrders = XLSX.utils.aoa_to_sheet([orderHeaders, ...orderRows]);
      wsOrders["!cols"] = [{ wch: 26 }, { wch: 20 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 16 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
      XLSX.utils.book_append_sheet(wb, wsOrders, "Orders");
      XLSX.writeFile(wb, "IND-Manager-Report.xlsx");
    } catch (err) {
      console.error("Excel export failed:", err);
    } finally {
      setExportLoading(false);
    }
  }, [fetchExportData, stats]);

  const handleExportPDF = useCallback(async () => {
    setExportLoading(true);
    setExportDropdownOpen(false);
    try {
      const { orders, payments, stats: s } = await fetchExportData();

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 36, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("IND Manager", 14, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Dashboard Report — ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`, 14, 28);

      // Summary Stats
      let y = 46;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 14, y);
      y += 8;

      const summaryData = [
        ["Total Revenue", s ? fmtCurrency(s.totalRevenue) : fmtCurrency(stats?.totalRevenue)],
        ["Total Orders", String(s?.activeOrders ?? stats?.totalOrders ?? 0)],
        ["Active Clients", String(s?.totalClients ?? stats?.totalClients ?? 0)],
        ["Orders in Production", String(s?.ordersInProduction ?? stats?.ordersInProduction ?? 0)],
      ];
      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: summaryData,
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 10 },
        bodyStyles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
        tableWidth: "auto",
      });

      // Orders Table
      y = (doc as any).lastAutoTable?.finalY + 14 || y + 50;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Orders", 14, y);
      y += 4;

      const orderTableBody = orders.map((o: any) => [
        (o.id || "").slice(-8).toUpperCase(),
        o.clients?.name || "—",
        o.product_name || "—",
        String(o.quantity ?? "—"),
        (o.status || "—").charAt(0).toUpperCase() + (o.status || "").slice(1),
        fmtCurrency(o.total_amount),
        fmtDate(o.createdAt || o.created_at),
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Order ID", "Client", "Product", "Qty", "Status", "Amount", "Date"]],
        body: orderTableBody,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        margin: { left: 14, right: 14 },
        styles: { cellPadding: 2.5, overflow: "linebreak" },
        columnStyles: {
          0: { cellWidth: 22 },
          3: { cellWidth: 14, halign: "center" },
          5: { halign: "right" },
        },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
        doc.text("IND Manager", 14, 290);
      }

      doc.save("IND-Manager-Report.pdf");
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExportLoading(false);
    }
  }, [fetchExportData, stats]);

  // ─── Widget Handlers ───────────────────────────────────
  const saveWidgetLayout = async (newLayout: WidgetConfig[]) => {
    setSavingWidgets(true);
    try {
      await fetch("/api/dashboard/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgets: newLayout }),
      });
      setWidgetLayout(newLayout);
    } catch (error) {
      console.error("Failed to save widgets", error);
    } finally {
      setSavingWidgets(false);
    }
  };

  const handleRemoveWidget = (position: number) => {
    const updated = widgetLayout.map((w) =>
      w.widget_position === position ? { ...w, is_visible: false } : w
    );
    // If widget didn't exist in layout array yet, add it as hidden
    if (!updated.find((w) => w.widget_position === position)) {
      updated.push({ widget_type: "", widget_position: position, is_visible: false });
    }
    saveWidgetLayout(updated);
  };

  const handleAddWidget = (widgetType: string) => {
    if (activeSlotIndex === null) return;

    // Check if widget is already used elsewhere
    const updated = [...widgetLayout];

    // If this widget type is already active in another slot, remove it from there
    const existingIndex = updated.findIndex((w) => w.widget_type === widgetType && w.is_visible);
    if (existingIndex !== -1) {
      updated[existingIndex].is_visible = false;
    }

    // Assign to the selected slot
    const slotIndex = updated.findIndex((w) => w.widget_position === activeSlotIndex);
    if (slotIndex !== -1) {
      updated[slotIndex] = { widget_type: widgetType, widget_position: activeSlotIndex, is_visible: true };
    } else {
      updated.push({ widget_type: widgetType, widget_position: activeSlotIndex, is_visible: true });
    }

    saveWidgetLayout(updated);
    setIsWidgetModalOpen(false);
    setActiveSlotIndex(null);
  };

  // Route mapping for clickable stat widgets
  const WIDGET_ROUTES: Record<string, string> = {
    "Total Revenue": "/dashboard/analytics",
    "Active Orders": "/dashboard/orders?status=active",
    "Total Clients": "/dashboard/clients",
    "Low Stock Items": "/dashboard/inventory",
    "Pending Payments": "/dashboard/payments",
    "Orders in Production": "/dashboard/orders?status=production",
    "Orders Ready for Dispatch": "/dashboard/orders?status=completed",
    "Today's Production": "/dashboard/production",
  };

  // Helper to map widget ID to actual stat value
  const getWidgetValue = (type: string, s: DashboardStats): number => {
    switch (type) {
      case "Total Revenue": return s.totalRevenue;
      case "Active Orders": return s.totalOrders;
      case "Total Clients": return s.totalClients;
      case "Low Stock Items": return s.lowStockItems;
      case "Pending Payments": return s.pendingPayments;
      case "Orders in Production": return s.ordersInProduction;
      case "Orders Ready for Dispatch": return s.ordersReady;
      case "Today's Production": return s.todaysProduction;
      default: return 0;
    }
  };

  // ─── Loading State ─────────────────────────────────────
  if (loading || roleLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-[34px] w-[200px] rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
          <div className="h-[20px] w-[300px] rounded-[8px] bg-[var(--fill-tertiary)] shimmer" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[140px] rounded-[16px] bg-[var(--fill-tertiary)] shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-[340px] rounded-[16px] bg-[var(--fill-tertiary)] shimmer" />
          <div className="h-[340px] rounded-[16px] bg-[var(--fill-tertiary)] shimmer" />
        </div>
      </div>
    );
  }

  // ─── Staff View: Work Panel ────────────────────────────
  if (userRole === "Staff") {
    return <StaffWorkPanel userName={userName} />;
  }

  // ─── Admin View: Full Dashboard ────────────────────────
  const isEmptyDashboard = stats && stats.totalOrders === 0 && stats.totalClients === 0 && stats.totalRevenue === 0;

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6 hero-glow"
    >
      {/* Onboarding Modal */}
      <OnboardingModal />

      {/* Sample Data Banner (shown when dashboard is empty) */}
      {isEmptyDashboard && (
        <SampleDataBanner
          onSampleLoaded={() => window.location.reload()}
          onSampleCleared={() => window.location.reload()}
        />
      )}
      {/* ── Page Header ── */}
      <motion.div variants={staggerItem} className="flex items-end justify-between">
        <div>
          <h1 className="text-[34px] font-bold text-[var(--label-primary)] leading-[41px] tracking-[0.37px]">
            {t("title")}
          </h1>
          <p className="text-[15px] text-[var(--label-secondary)] mt-1 leading-[20px]">
            {t("welcome")}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {/* ── Export Dropdown ── */}
          <div ref={exportRef} style={{ position: "relative" }}>
            <IOSButton
              variant="gray"
              size="medium"
              icon={exportLoading ? undefined : <Download className="h-4 w-4" />}
              iconRight={<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", exportDropdownOpen && "rotate-180")} />}
              loading={exportLoading}
              loadingText={t("exporting")}
              onClick={() => setExportDropdownOpen((v) => !v)}
            >
              {tCommon("export")}
            </IOSButton>
            {exportDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  minWidth: "190px",
                  background: "var(--bg-elevated, rgba(30,30,40,0.92))",
                  backdropFilter: "blur(20px)",
                  border: "1px solid var(--border-card, rgba(255,255,255,0.12))",
                  borderRadius: "12px",
                  padding: "6px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                  zIndex: 50,
                }}
              >
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[8px] text-[14px] font-medium text-[var(--label-primary)] hover:bg-[var(--fill-tertiary)] transition-colors text-left"
                >
                  <FileSpreadsheet className="h-4 w-4 text-[#34C759]" />
                  {t("exportAsExcel")}
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[8px] text-[14px] font-medium text-[var(--label-primary)] hover:bg-[var(--fill-tertiary)] transition-colors text-left"
                >
                  <FileText className="h-4 w-4 text-[#FF453A]" />
                  {t("exportAsPDF")}
                </button>
              </div>
            )}
          </div>
          <Link href="/dashboard/orders">
            <IOSButton variant="filled" size="medium" icon={<Plus className="h-4 w-4" />}>
              {t("newOrder")}
            </IOSButton>
          </Link>
        </div>
      </motion.div>

      {/* ── Stat Widgets ── */}
      <section className="kpi-panel" aria-label="Key Performance Indicators" style={{ position: "relative" }}>
        {/* ── Container-level 3-dot widget menu ── */}
        {stats && (() => {
          const visibleWidgets = [0, 1, 2, 3]
            .map((pos) => {
              const cfg = widgetLayout.find((w) => w.widget_position === pos && w.is_visible);
              if (!cfg) return null;
              const meta = AVAILABLE_WIDGETS.find((w) => w.id === cfg.widget_type);
              if (!meta) return null;
              return { position: pos, label: meta.id };
            })
            .filter(Boolean) as { position: number; label: string }[];

          return visibleWidgets.length > 0 ? (
            <div
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                zIndex: 10,
              }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,255,255,0.65)",
                      cursor: "pointer",
                      backdropFilter: "blur(8px)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.18)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.9)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.10)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.65)";
                    }}
                    aria-label="Manage widgets"
                  >
                    <MoreHorizontal style={{ width: "18px", height: "18px" }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={8} className="min-w-[200px]">
                  {visibleWidgets.map(({ position, label }) => (
                    <DropdownMenuItem
                      key={position}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveWidget(position);
                      }}
                      className="cursor-pointer gap-2 text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove {label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null;
        })()}

        <div className="kpi-grid">
          {stats && [0, 1, 2, 3].map((position) => {
            const config = widgetLayout.find((w) => w.widget_position === position && w.is_visible);
            if (!config) {
              return (
                <EmptyWidgetSlot
                  key={`empty-${position}`}
                  onAdd={() => {
                    setActiveSlotIndex(position);
                    setIsWidgetModalOpen(true);
                  }}
                  delay={position * 0.05}
                />
              );
            }

            const widgetMeta = AVAILABLE_WIDGETS.find((w) => w.id === config.widget_type);
            if (!widgetMeta) return null;

            return (
              <StatWidget
                key={config.widget_type}
                label={widgetMeta.id}
                value={getWidgetValue(widgetMeta.id, stats)}
                change={widgetMeta.id === "Total Revenue" ? stats.revenueGrowth : 0}
                icon={widgetMeta.icon}
                color={widgetMeta.color as any}
                prefix={widgetMeta.prefix}
                delay={position * 0.05}
                href={WIDGET_ROUTES[widgetMeta.id]}
              />
            );
          })}
        </div>
      </section>

      {/* ── Charts + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={staggerItem} className="lg:col-span-2">
          <IOSCard variant="stitch-elevated" padding="lg" className="bg-white dark:bg-[#1C1C1E] !rounded-2xl shadow-md border-0 dark:border dark:border-[var(--border-card)] dark:shadow-none">
            <IOSCardHeader title={t("revenueOverview")} subtitle={t("last6Months")} />
            <IOSCardContent>
              <div className="h-[260px] -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0A84FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "var(--label-secondary)", fontSize: 13, fontWeight: 500 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "var(--label-secondary)", fontSize: 13, fontWeight: 500 }} 
                      tickFormatter={(v) => `₹${v / 1000}K`} 
                      dx={-10} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-subtle)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#0A84FF" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#revenueGradient)"
                      activeDot={{ r: 6, fill: "#0A84FF", stroke: "#FFFFFF", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </IOSCardContent>
          </IOSCard>
        </motion.div>

        <motion.div variants={staggerItem}>
          <IOSCard variant="stitch-elevated" padding="lg" className="h-full bg-white dark:bg-[#1C1C1E] !rounded-2xl shadow-md border-0 dark:border dark:border-[var(--border-card)] dark:shadow-none">
            <IOSCardHeader title={t("quickActions")} />
            <IOSCardContent className="space-y-1">
              {[
                { label: t("createOrder"), icon: ShoppingCart, href: "/dashboard/orders", bg: "bg-blue-50 dark:bg-[rgba(10,132,255,0.12)]", text: "text-blue-600 dark:text-[var(--ios-blue)]" },
                { label: t("addProduct"), icon: Package, href: "/dashboard/inventory", bg: "bg-green-50 dark:bg-[rgba(48,209,88,0.12)]", text: "text-green-600 dark:text-[var(--ios-green)]" },
                { label: t("generateInvoice"), icon: FileText, href: "/dashboard/billing", bg: "bg-purple-50 dark:bg-[rgba(191,90,242,0.12)]", text: "text-purple-600 dark:text-[var(--ios-purple)]" },
                { label: t("viewAnalytics"), icon: BarChart3, href: "/dashboard/analytics", bg: "bg-orange-50 dark:bg-[rgba(255,159,10,0.12)]", text: "text-orange-600 dark:text-[var(--ios-orange)]" },
              ].map((action, idx, arr) => (
                <Link key={action.label} href={action.href}>
                  <motion.div className="flex items-center gap-3 p-3 rounded-[10px] hover:bg-slate-50 dark:hover:bg-[var(--fill-quaternary)] transition-colors cursor-pointer group" whileTap={{ scale: 0.97 }}>
                    <div className={cn("w-[36px] h-[36px] flex items-center justify-center rounded-xl flex-shrink-0 transition-colors", action.bg)}>
                      <action.icon className={cn("h-[18px] w-[18px]", action.text)} />
                    </div>
                    <span className="text-[15px] font-medium text-[var(--label-primary)] flex-1">{action.label}</span>
                    <ChevronRight className="h-[16px] w-[16px] text-[var(--label-quaternary)] group-hover:text-[var(--label-tertiary)] transition-colors" />
                  </motion.div>
                  {idx < arr.length - 1 && <div className="h-px bg-[var(--border-divider)] mx-3" />}
                </Link>
              ))}
            </IOSCardContent>
          </IOSCard>
        </motion.div>
      </div>

      {/* ── Weekly Orders + Recent Activity ── */}
      <div className="flex flex-col lg:flex-row items-stretch gap-4">
        <motion.div variants={staggerItem} className="lg:w-1/3">
          <IOSCard variant="elevated" padding="lg" className="h-full bg-white dark:bg-[#1C1C1E] !rounded-2xl shadow-md border-0 dark:border dark:border-[var(--border-card)] dark:shadow-none">
            <IOSCardHeader title={t("thisWeek")} subtitle={t("ordersByDay")} />
            <IOSCardContent>
              <div className="h-[200px] -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--label-tertiary)", fontSize: 13 }} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--ios-blue)" opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </IOSCardContent>
          </IOSCard>
        </motion.div>

        <motion.div variants={staggerItem} className="lg:flex-1">
          <IOSCard variant="elevated" padding="lg" className="h-full bg-white dark:bg-[#1C1C1E] !rounded-2xl shadow-md border-0 dark:border dark:border-[var(--border-card)] dark:shadow-none">
            <IOSCardHeader
              title={t("recentActivity")}
              action={
                <Link href="/dashboard/activity">
                  <IOSButton variant="plain" size="small">{tCommon("viewAll")}</IOSButton>
                </Link>
              }
            />
            <IOSCardContent>
              <div className="space-y-1">
                {activities.slice(0, 4).map((activity, index) => {
                  const Icon = activityIcons[activity.type] || Activity;
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                      className="flex items-center gap-3 p-3 rounded-[10px] hover:bg-[var(--fill-quaternary)] transition-colors"
                    >
                      <div className={cn("w-[36px] h-[36px] rounded-[8px] flex items-center justify-center flex-shrink-0", activityColors[activity.status])}>
                        <Icon className="h-[16px] w-[16px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-[var(--label-primary)] truncate leading-[20px]">{activity.title}</p>
                        <p className="text-[13px] text-[var(--label-secondary)] truncate leading-[18px]">{activity.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={`activity-dot activity-dot--${activity.status}`} />
                        <span className="text-[13px] text-[var(--label-tertiary)]">{formatTimeAgo(activity.time)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </IOSCardContent>
          </IOSCard>
        </motion.div>
      </div>

      {/* ── Low Stock Alert ── */}
      {stats && stats.lowStockItems > 0 && (
        <motion.div variants={staggerItem}>
          <IOSCard variant="glass" padding="lg" className="bg-white dark:bg-[#1C1C1E] rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-[44px] h-[44px] rounded-[12px] bg-[rgba(255,149,0,0.12)] flex items-center justify-center flex-shrink-0 pulse-glow">
                <AlertTriangle className="h-[20px] w-[20px] text-[var(--ios-orange)]" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-[var(--label-primary)] leading-[20px]">
                  {t("lowStockAlert", { count: stats.lowStockItems })}
                </p>
                <p className="text-[13px] text-[var(--label-secondary)] leading-[18px]">
                  {t("lowStockDescription")}
                </p>
              </div>
              <Link href="/dashboard/inventory">
                <IOSButton variant="tinted" size="small">{t("viewInventory")}</IOSButton>
              </Link>
            </div>
          </IOSCard>
        </motion.div>
      )}

      {/* ── Widget Selection Modal ── */}
      <Dialog open={isWidgetModalOpen} onOpenChange={setIsWidgetModalOpen}>
        <DialogContent
          className="sm:max-w-[500px] overflow-hidden glass-dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold -tracking-[0.5px]">{t("selectWidget")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 py-2">
            {AVAILABLE_WIDGETS.map((widget) => {
              const isUsed = widgetLayout.some((w) => w.widget_type === widget.id && w.is_visible);
              return (
                <button
                  key={widget.id}
                  onClick={() => handleAddWidget(widget.id)}
                  disabled={isUsed || savingWidgets}
                  className={cn(
                    "flex flex-col items-start gap-2 p-4 rounded-[16px] text-left transition-all border",
                    isUsed
                      ? "bg-[var(--fill-quaternary)] border-transparent opacity-50 cursor-not-allowed"
                      : "bg-[var(--fill-tertiary)] border-[var(--border-subtle)] hover:bg-[var(--fill-secondary)] hover:border-[var(--border-card)] hover:shadow-sm"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 flex items-center justify-center rounded-full",
                    isUsed ? "bg-[var(--fill-tertiary)] text-[var(--label-tertiary)]" : `kpi-card__icon--${widget.color} bg-[var(--fill-tertiary)]`
                  )}>
                    <widget.icon className={cn("h-5 w-5", isUsed ? "" : `text-[var(--ios-${widget.color})]`)} />
                  </div>
                  <div>
                    <span className="block font-medium text-[15px] text-[var(--label-primary)]">{widget.id}</span>
                    <span className="block mt-0.5 text-[12px] text-[var(--label-secondary)]">
                      {isUsed ? t("alreadyAdded") : t("clickToAdd")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-[var(--border-card)]">
            <DialogClose asChild>
              <IOSButton variant="gray" size="large" className="w-full sm:w-auto">{tCommon("cancel")}</IOSButton>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
