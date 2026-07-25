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
  X,
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
import dynamic from "next/dynamic";
import type { ActivityItem } from "@/components/dashboard/activity-detail-types";
import { useCachedPage } from "@/hooks/useCachedPage";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/hooks/use-orders";

const ActivityDetailPopup = dynamic(
  () => import("@/components/dashboard/ActivityDetailPopup"),
  { ssr: false },
);
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
  { id: "Total Revenue", icon: IndianRupee, color: "blue", prefix: "\u20B9" },
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
  entityId: string;
  entityType: string;
}

interface ChartDataPoint {
  name: string;
  revenue: number;
}

interface WeeklyDataPoint {
  day: string;
  value: number;
}

// ─── Enterprise Chart Tooltip ────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2.5 shadow-lg">
      <p className="text-[12px] font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: p.color || 'var(--primary)' }}
          />
          <p className="text-[13px] font-semibold text-foreground tabular-nums">
            {p.name === "revenue" ? `\u20B9${p.value.toLocaleString()}` : p.value}
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
  const { restoreState, persist, restoreScroll } = useCachedPage({
    pageKey: "dashboard",
    maxAgeMs: 5 * 60 * 1000,
  });

  const stateRestoredRef = useRef(false);
  const [hasRestored, setHasRestored] = useState(false);

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

  // ─── Stats via React Query (auto-refetch on window focus + mutation invalidation) ───
  const { data: stats = null } = useQuery<DashboardStats | null>({
    queryKey: queryKeys.stats,
    queryFn: async (): Promise<DashboardStats> => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const statsRes = await res.json();
      if (statsRes.error) throw new Error(statsRes.error);
      return {
        totalRevenue: statsRes.totalRevenue || 0,
        totalOrders: statsRes.activeOrders || 0,
        totalClients: statsRes.totalClients || 0,
        lowStockItems: statsRes.lowStockItems || 0,
        revenueGrowth: statsRes.revenueGrowth || 0,
        pendingPayments: statsRes.pendingPayments || 0,
        ordersInProduction: statsRes.ordersInProduction || 0,
        ordersReady: statsRes.ordersReady || 0,
        todaysProduction: statsRes.todaysProduction || 0,
      };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    enabled: userRole !== "Staff" && !roleLoading,
  });

  // Widget State
  const [widgetLayout, setWidgetLayout] = useState<WidgetConfig[]>([]);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [savingWidgets, setSavingWidgets] = useState(false);

  // Activity Detail Popup state
  const [activityPopupOpen, setActivityPopupOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  // Export State
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cached = restoreState();
    if (cached) {
      if (cached.activities) setActivities(cached.activities as RecentActivity[]);
      if (cached.revenueData) setRevenueData(cached.revenueData as ChartDataPoint[]);
      if (cached.weeklyData) setWeeklyData(cached.weeklyData as WeeklyDataPoint[]);
      if (cached.widgetLayout) setWidgetLayout(cached.widgetLayout as WidgetConfig[]);
      setLoading(false);
      stateRestoredRef.current = true;
      if (typeof cached.scrollY === "number") {
        restoreScroll(cached.scrollY);
      }
    }
    setHasRestored(true);
  }, [restoreState, restoreScroll]);

  useEffect(() => {
    return () => {
      if (stats || activities.length > 0 || revenueData.length > 0 || weeklyData.length > 0 || widgetLayout.length > 0) {
        persist({
          stats,
          activities,
          revenueData,
          weeklyData,
          widgetLayout,
          scrollY: window.scrollY,
        });
      }
    };
  }, [stats, activities, revenueData, weeklyData, widgetLayout, persist]);

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
        .then((res) => res.ok ? res.json() : { success: false })
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
    if (!hasRestored) return;

    const fetchDashboardData = async () => {
      try {
        const [revenueRes, activityRes, weeklyOrdersRes] = await Promise.all([
          fetch("/api/dashboard/revenue-chart?range=monthly").then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/dashboard/activity").then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/dashboard/weekly-orders").then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);

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
            const typeMap: Record<string, RecentActivity["type"]> = { order: "order", inventory: "inventory", client: "client", payment: "payment", production: "production" };
            const statusMap: Record<string, RecentActivity["status"]> = { order: "info", inventory: "warning", client: "success", payment: "success", production: "info" };
            return {
              id: String(index),
              type: typeMap[item.type] || "order",
              title: item.message?.split(":")[0] || item.type,
              description: item.message?.split(":").slice(1).join(":").trim() || item.message || "",
              time: item.createdAt || new Date().toISOString(),
              status: statusMap[item.type] || "info",
              entityId: item.entityId || "",
              entityType: item.type || "order",
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
    success: "bg-[rgba(52,199,89,0.12)] text-[var(--erp-success)]",
    warning: "bg-[rgba(255,149,0,0.12)] text-[var(--erp-warning)]",
    info: "bg-[rgba(0,122,255,0.12)] text-[var(--primary)]",
    pending: "bg-muted text-muted-foreground",
  };

  // ─── Export Helpers ────────────────────────────────────
  const fetchExportData = useCallback(async () => {
    const unwrap = async (url: string) => {
      try {
        const r = await fetch(url);
        if (!r.ok) return [];
        const json = await r.json();
        // v1 envelope: { success, data }
        const payload = json?.data ?? json;
        return Array.isArray(payload) ? payload : [];
      } catch {
        return [];
      }
    };

    const [orders, payments, statsRes] = await Promise.all([
      unwrap("/api/v1/orders"),
      (userRole === "Admin" || userRole === "Owner")
        ? unwrap("/api/v1/payments")
        : Promise.resolve([]),
      fetch("/api/dashboard/stats").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    return {
      orders,
      payments,
      stats: statsRes && !statsRes.error ? statsRes : null,
    };
  }, [userRole]);

  const fmtDate = (d: any) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "—"; }
  };
  const fmtCurrency = (v: any) => {
    const n = Number(v);
    return isNaN(n) ? "\u20B90" : `\u20B9${n.toLocaleString("en-IN")}`;
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
          <div className="h-[34px] w-[200px] rounded-[10px] bg-[var(--muted)] shimmer" />
          <div className="h-[20px] w-[300px] rounded-[8px] bg-[var(--muted)] shimmer" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[140px] rounded-[16px] bg-[var(--muted)] shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-[340px] rounded-[16px] bg-[var(--muted)] shimmer" />
          <div className="h-[340px] rounded-[16px] bg-[var(--muted)] shimmer" />
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
      className="space-y-6 hero-glow bg-[#F1F4F9] dark:bg-transparent min-h-screen -m-6 p-6"
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
          <h1 className="text-[34px] font-bold text-[var(--foreground)] leading-[41px] tracking-[0.37px]">
            {t("title")}
          </h1>
          <p className="text-[15px] text-[var(--muted-foreground)] mt-1 leading-[20px]">
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
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[8px] text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors text-left"
                >
                  <FileSpreadsheet className="h-4 w-4 text-[#34C759]" />
                  {t("exportAsExcel")}
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[8px] text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors text-left"
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
          <IOSCard variant="stitch-elevated" padding="lg" className="bg-white dark:bg-[#1C1C1E] !rounded-2xl shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 !border !border-black/[0.09] dark:!border-[var(--border)] dark:shadow-none dark:hover:shadow-none">
            <IOSCardHeader title={t("revenueOverview")} subtitle={t("last6Months")} />
            <IOSCardContent>
              <div className="h-[260px] -ml-4" style={{ minWidth: 0, overflow: 'hidden' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "var(--muted-foreground)", fontSize: 13, fontWeight: 500 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "var(--muted-foreground)", fontSize: 13, fontWeight: 500 }} 
                      tickFormatter={(v) => `\u20B9${v / 1000}K`} 
                      dx={-10} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#2563EB" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#revenueGradient)"
                      activeDot={{ r: 5, fill: "#2563EB", stroke: "#FFFFFF", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </IOSCardContent>
          </IOSCard>
        </motion.div>

        <motion.div variants={staggerItem}>
          <IOSCard variant="stitch-elevated" padding="lg" className="h-full bg-white dark:bg-[#1C1C1E] !rounded-2xl shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 !border !border-black/[0.09] dark:!border-[var(--border)] dark:shadow-none dark:hover:shadow-none">
            <IOSCardHeader title={t("quickActions")} />
            <IOSCardContent className="space-y-1">
              {[
                { label: t("createOrder"), icon: ShoppingCart, href: "/dashboard/orders", bg: "bg-blue-50 dark:bg-[rgba(10,132,255,0.12)]", text: "text-blue-600 dark:text-[var(--primary)]" },
                { label: t("addProduct"), icon: Package, href: "/dashboard/inventory", bg: "bg-green-50 dark:bg-[rgba(48,209,88,0.12)]", text: "text-green-600 dark:text-[var(--erp-success)]" },
                { label: t("generateInvoice"), icon: FileText, href: "/dashboard/billing", bg: "bg-purple-50 dark:bg-[rgba(191,90,242,0.12)]", text: "text-purple-600 dark:text-[var(--chart-4)]" },
                { label: t("viewAnalytics"), icon: BarChart3, href: "/dashboard/analytics", bg: "bg-orange-50 dark:bg-[rgba(255,159,10,0.12)]", text: "text-orange-600 dark:text-[var(--erp-warning)]" },
              ].map((action, idx, arr) => (
                <Link key={action.label} href={action.href}>
                  <motion.div className="flex items-center gap-3 p-3 rounded-[10px] hover:bg-slate-50 dark:hover:bg-[var(--muted)] transition-colors cursor-pointer group" whileTap={{ scale: 0.97 }}>
                    <div className={cn("w-[36px] h-[36px] flex items-center justify-center rounded-xl flex-shrink-0 transition-colors", action.bg)}>
                      <action.icon className={cn("h-[18px] w-[18px]", action.text)} />
                    </div>
                    <span className="text-[15px] font-medium text-[var(--foreground)] flex-1">{action.label}</span>
                    <ChevronRight className="h-[16px] w-[16px] text-[var(--muted-foreground)] group-hover:text-[var(--muted-foreground)] transition-colors" />
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
        <motion.div variants={staggerItem} className="lg:w-1/3" style={{ minWidth: 0, minHeight: 0 }}>
          <IOSCard variant="elevated" padding="lg" className="h-full bg-white dark:bg-[#1C1C1E] !rounded-2xl shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 !border !border-black/[0.09] dark:!border-[var(--border)] dark:shadow-none dark:hover:shadow-none">
            <IOSCardHeader title={t("thisWeek")} subtitle={t("ordersByDay")} />
            <IOSCardContent>
              <div className="h-[200px] -ml-4" style={{ minWidth: 0, overflow: 'hidden' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 13 }} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--primary)" opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </IOSCardContent>
          </IOSCard>
        </motion.div>

        <motion.div variants={staggerItem} className="lg:flex-1">
          <IOSCard variant="elevated" padding="lg" className="h-full bg-white dark:bg-[#1C1C1E] !rounded-2xl shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 !border !border-black/[0.09] dark:!border-[var(--border)] dark:shadow-none dark:hover:shadow-none">
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
                      onClick={() => {
                        setSelectedActivity({
                          id: activity.id,
                          type: activity.type,
                          title: activity.title,
                          description: activity.description,
                          time: activity.time,
                          status: activity.status,
                          entityId: activity.entityId,
                          entityType: activity.entityType,
                        });
                        setActivityPopupOpen(true);
                      }}
                      style={{ cursor: "pointer" }}
                      className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-[#F8FAFC] dark:hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150 ease-in-out"
                    >
                      <div className={cn("w-[36px] h-[36px] rounded-[8px] flex items-center justify-center flex-shrink-0", activityColors[activity.status])}>
                        <Icon className="h-[16px] w-[16px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-[var(--foreground)] truncate leading-[20px]">{activity.title}</p>
                        <p className="text-[13px] text-[var(--muted-foreground)] truncate leading-[18px]">{activity.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={`activity-dot activity-dot--${activity.status}`} />
                        <span className="text-[13px] text-[var(--muted-foreground)]">{formatTimeAgo(activity.time)}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
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
          <IOSCard variant="glass" padding="lg" className="bg-white dark:bg-[#1C1C1E] !rounded-2xl shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] !border !border-black/[0.09] dark:!border-[var(--border)] dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="w-[44px] h-[44px] rounded-[12px] bg-[rgba(255,149,0,0.12)] flex items-center justify-center flex-shrink-0 pulse-glow">
                <AlertTriangle className="h-[20px] w-[20px] text-[var(--erp-warning)]" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-[var(--foreground)] leading-[20px]">
                  {t("lowStockAlert", { count: stats.lowStockItems })}
                </p>
                <p className="text-[13px] text-[var(--muted-foreground)] leading-[18px]">
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

      {/* ── Activity Detail Popup ── */}
      <ActivityDetailPopup
        activity={selectedActivity}
        open={activityPopupOpen}
        onOpenChange={setActivityPopupOpen}
      />

      {/* ── Widget Selection Modal ── */}
      <Dialog open={isWidgetModalOpen} onOpenChange={setIsWidgetModalOpen}>
        <DialogContent
          className="sm:max-w-[500px] md:max-w-2xl glass-dialog !p-0 !overflow-hidden"
        >
          {/* Fixed Header */}
          <DialogHeader className="px-5 pt-5 pb-3 md:px-6 md:pt-6 md:pb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl md:text-2xl font-semibold -tracking-[0.5px]">{t("selectWidget")}</DialogTitle>
              {/* Desktop X close button */}
              <DialogClose asChild>
                <button className="hidden md:flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>
          </DialogHeader>

          {/* Scrollable Cards Section */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 md:px-6 md:pb-6 md:max-h-[60vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {AVAILABLE_WIDGETS.map((widget) => {
                const isUsed = widgetLayout.some((w) => w.widget_type === widget.id && w.is_visible);
                return (
                  <button
                    key={widget.id}
                    onClick={() => handleAddWidget(widget.id)}
                    disabled={isUsed || savingWidgets}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-2xl text-left transition-all duration-150 border",
                      isUsed
                        ? "bg-gray-100 dark:bg-white/5 border-transparent opacity-50 cursor-not-allowed"
                        : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-white/10 hover:border-blue-200 dark:hover:border-white/20 cursor-pointer"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-xl mb-3 shadow-sm",
                      isUsed
                        ? "bg-gray-200 dark:bg-white/10"
                        : "bg-white dark:bg-white/10"
                    )}>
                      <widget.icon className={cn("h-5 w-5", isUsed ? "text-gray-400 dark:text-gray-500" : ({
                        blue: "text-blue-500",
                        green: "text-green-500",
                        orange: "text-amber-500",
                        purple: "text-violet-500",
                        red: "text-red-500",
                        pink: "text-pink-500",
                      } as Record<string, string>)[widget.color] || "text-blue-500")} />
                    </div>
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">{widget.id}</span>
                    <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {isUsed ? t("alreadyAdded") : t("clickToAdd")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fixed Footer — mobile only (desktop uses X button in header) */}
          <DialogFooter className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-white/10 flex-shrink-0 md:hidden">
            <DialogClose asChild>
              <IOSButton variant="gray" size="large" className="w-full sm:w-auto">{tCommon("cancel")}</IOSButton>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
