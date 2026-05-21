"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Package,
  AlertCircle,
  Phone,
  IndianRupee,
  Box,
  TrendingUp,
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/lib/hooks/use-role";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateDataExportPDF } from "@/lib/pdf-generator";
import { NumericInput, parseNumericValue } from "@/components/ui/numeric-input";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/excel-export";
import { IOSCard, IOSCardContent } from "@/components/ui/ios/IOSCard";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { staggerContainer, staggerItem } from "@/styles/animations";
import { StatWidget } from "@/components/ui/StatWidget";
import { TogglePill } from "@/components/ui/glass";
import { EmptyState } from "@/components/ui/EmptyState";
import { MaterialUsageDrawer } from "@/components/ui/MaterialUsageDrawer";

export default function InventoryPage() {
  const { isAdmin, isPro } = useRole();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // ── Forecast State ──
  const [viewMode, setViewMode] = useState<"table" | "forecast">("table");
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [expandedForecast, setExpandedForecast] = useState<string | null>(null);

  // ── Usage Drawer State ──
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);

  const fetchForecast = useCallback(async () => {
    setForecastLoading(true);
    try {
      const res = await fetch("/api/v1/inventory/forecast");
      const json = await res.json();
      if (json.success) setForecastData(json.data);
    } catch {
      console.error("Failed to fetch forecast");
    } finally {
      setForecastLoading(false);
    }
  }, []);

  const starterLimit = 5;
  const isDev = process.env.NODE_ENV === "development";
  // In development mode, always bypass the starter tier limit
  const isAtLimit = isDev ? false : (!isAdmin && !isPro && items.length >= starterLimit);

  const emptyFormState = {
    name: "",
    quantity: "" as string,
    unit: "kg",
    min_stock_level: "" as string,
    supplier_whatsapp: "",
    purchase_cost_per_unit: "" as string,
    hsn_code: "",
    tax_rate: "18",
    track_inventory: true,
    track_batches: false,
    item_type: "Goods",
  };

  const [formData, setFormData] = useState(emptyFormState);

  const resetForm = () => {
    setCurrentItem(null);
    setFormData({ ...emptyFormState });
  };

  const handleAddNewClick = () => {
    if (isAtLimit) {
      toast.error(
        `Starter tier limit reached (${starterLimit} items). Please upgrade to Pro for unlimited inventory.`,
        {
          action: {
            label: "Upgrade",
            onClick: () => (window.location.href = "/dashboard/upgrade"),
          },
        }
      );
      return;
    }
    resetForm();
    setIsDialogOpen(true);
  };

  const exportToPDF = () => {
    const headers = ["Name", "Quantity", "Unit", "Min Level", "Supplier", "Landed/Unit", "HSN", "Tax"];
    const rows = items.map((item) => {
      const landedCost = Number(item.purchase_cost_per_unit || 0) * (1 + Number(item.tax_rate || 0) / 100);
      return [
        item.name || "—",
        String(item.quantity),
        item.unit || "—",
        String(item.min_stock_level),
        item.supplier_whatsapp || "—",
        `₹${landedCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
        item.hsn_code || "—",
        `${item.tax_rate || 0}%`,
      ];
    });

    generateDataExportPDF({
      title: "Inventory Report",
      subtitle: "Raw materials, stock levels, and supplier details",
      headers,
      rows,
      filename: `inventory_${new Date().toISOString().split("T")[0]}.pdf`,
    });
    toast.success("Inventory report PDF downloaded!");
  };

  const exportToXLSX = () => {
    const columns = [
      { header: "Material name", key: "name" },
      { header: "Stock level", key: "quantity" },
      { header: "Base cost", key: "purchase_cost_per_unit" },
      { header: "Landed cost", key: "landed_cost" },
      { header: "Critical stock", key: "min_stock_level" },
      { header: "Last updated", key: "updatedAt" },
    ];

    const dataToExport = items.map(item => ({
      ...item,
      landed_cost: Number(item.purchase_cost_per_unit || 0) * (1 + Number(item.tax_rate || 0) / 100),
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("en-IN") : "—"
    }));

    exportToExcel(
      `inventory_${new Date().toISOString().split("T")[0]}.xlsx`,
      "Inventory",
      dataToExport,
      columns
    );
    toast.success("Inventory Excel downloaded!");
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/v1/inventory");
      const data = await res.json();
      if (!data.success) toast.error("Failed to fetch inventory");
      else setItems(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      toast.error("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, []);

  // Fetch forecast when switching to forecast view
  useEffect(() => {
    if (viewMode === "forecast" && !forecastData) {
      fetchForecast();
    }
  }, [viewMode, forecastData, fetchForecast]);

  // Force staff users back to stock view
  useEffect(() => {
    if (!isAdmin && viewMode === "forecast") {
      setViewMode("table");
    }
  }, [isAdmin, viewMode]);

  const totalPurchasingCost = items.reduce(
    (acc, item) => {
      const baseCost = Number(item.purchase_cost_per_unit || 0);
      const taxRate = Number(item.tax_rate || 0);
      const landedCost = baseCost * (1 + taxRate / 100);
      return acc + (Number(item.quantity) * landedCost);
    },
    0
  );

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_whatsapp) {
      toast.error("Supplier WhatsApp is mandatory");
      return;
    }

    try {
      const payload = {
        ...formData,
        quantity: parseNumericValue(formData.quantity),
        min_stock_level: parseNumericValue(formData.min_stock_level, 10),
        purchase_cost_per_unit: parseNumericValue(formData.purchase_cost_per_unit),
        tax_rate: parseNumericValue(formData.tax_rate, 18),
      };

      if (currentItem) {
        const res = await fetch(`/api/v1/inventory/${currentItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) toast.error("Failed to update item");
        else {
          toast.success("Item updated");
          fetchInventory();
          setIsDialogOpen(false);
        }
      } else {
        const res = await fetch("/api/v1/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) toast.error("Failed to add item");
        else {
          toast.success("Item added");
          fetchInventory();
          setIsDialogOpen(false);
        }
      }
    } catch (error) {
      toast.error("Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/inventory/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) toast.error("Failed to delete item");
      else {
        toast.success("Item deleted");
        fetchInventory();
      }
    } catch (error) {
      toast.error("Failed to delete item");
    } finally {
      setIsDeleteDialogOpenConfirm(false);
      setItemToDeleteId(null);
    }
  };

  const openEditDialog = (item: any) => {
    setCurrentItem(item);
    setFormData({
      name: item.name,
      quantity: item.quantity ? String(item.quantity) : "",
      unit: item.unit,
      min_stock_level: item.min_stock_level ? String(item.min_stock_level) : "",
      supplier_whatsapp: item.supplier_whatsapp || "",
      purchase_cost_per_unit: item.purchase_cost_per_unit ? String(item.purchase_cost_per_unit) : "",
      hsn_code: item.hsn_code || "",
      tax_rate: item.tax_rate ? String(item.tax_rate) : "18",
      track_inventory: item.track_inventory ?? true,
      track_batches: item.track_batches ?? false,
      item_type: item.item_type || "Goods",
    });
    setIsDialogOpen(true);
  };

  const handleRestock = (item: any) => {
    const message = `Halo Supplier, I need to restock ${item.name}. My current stock is ${item.quantity} ${item.unit}. Please provide availability and current price.`;
    const whatsappUrl = `https://wa.me/${item.supplier_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = items.filter((i) => i.quantity <= i.min_stock_level).length;

  // ── Stock Level Classification (3-tier) ──
  const getStockStatus = (item: any): { label: string; color: "green" | "orange" | "red"; level: string } => {
    const qty = Number(item.quantity || 0);
    const minLevel = Number(item.min_stock_level || 0);
    if (minLevel <= 0) {
      return qty > 0
        ? { label: "Healthy", color: "green", level: "healthy" }
        : { label: "Out of Stock", color: "red", level: "critical" };
    }
    if (qty <= minLevel) return { label: "Critical", color: "red", level: "critical" };
    if (qty <= minLevel * 2) return { label: "Low", color: "orange", level: "low" };
    return { label: "Healthy", color: "green", level: "healthy" };
  };

  const formatSourceDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "";
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-[34px] w-[160px] rounded-[10px] bg-[var(--muted)] shimmer" />
          <div className="h-[20px] w-[280px] rounded-[8px] bg-[var(--muted)] shimmer mt-2" />
        </div>
        
        {/* ── KPI Skeleton ── */}
        <div className="kpi-panel">
          <div className="kpi-panel__glow"></div>
          <div className="kpi-grid !grid-cols-1 md:!grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="kpi-card flex flex-col justify-center min-h-[140px]">
                 <div className="flex items-center justify-between mb-4">
                   <div className="h-[48px] w-[48px] rounded-[14px] bg-[var(--muted)] shimmer" />
                   <div className="h-[24px] w-[50px] rounded-full bg-[var(--muted)] shimmer" />
                 </div>
                 <div className="h-[34px] w-[120px] rounded-[8px] bg-[var(--muted)] shimmer mb-2" />
                 <div className="h-[16px] w-[90px] rounded-[6px] bg-[var(--muted)] shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6 overflow-x-hidden">
      {/* ── Header ── */}
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[34px] font-bold text-[var(--foreground)] leading-[41px] tracking-[0.37px]">
            Inventory
          </h1>
          <p className="text-[15px] text-[var(--muted-foreground)] mt-1 leading-[20px]">
            Track raw materials, costs, and supplier connectivity.
          </p>
          {/* View Mode Toggle */}
          <div className="flex mt-2 gap-1 bg-[var(--muted)] rounded-[10px] p-0.5 w-fit">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                viewMode === "table"
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <Package className="h-3.5 w-3.5" /> Stock
            </button>
            {isAdmin && (
              <button
                onClick={() => setViewMode("forecast")}
                className={cn(
                  "px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                  viewMode === "forecast"
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                <Activity className="h-3.5 w-3.5" /> Forecast
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* PDF Export */}
          <button
            onClick={exportToPDF}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-[rgba(255,255,255,0.08)] hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-white text-xs font-medium cursor-pointer transition-all duration-150"
            title="Print PDF"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <rect width="24" height="24" rx="4" fill="#FF0000"/>
              <text x="12" y="15" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="8" fill="#fff">PDF</text>
            </svg>
            <span>PDF</span>
          </button>
          {/* Excel Export */}
          <button
            onClick={exportToXLSX}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-[rgba(255,255,255,0.08)] hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-white text-xs font-medium cursor-pointer transition-all duration-150"
            title="Excel Export"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <rect width="24" height="24" rx="4" fill="#217346"/>
              <path d="M14 3v5h4" fill="none" stroke="#fff" strokeWidth="1" opacity="0.5"/>
              <text x="12" y="15" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="8" fill="#fff">XLS</text>
            </svg>
            <span>Export</span>
          </button>
          {/* Add Material */}
          <IOSButton variant="filled" color="blue" size="medium" onClick={handleAddNewClick} className="glow-btn !bg-none shadow-none" icon={<Plus className="h-4 w-4" />}>
            Add Material
          </IOSButton>
        </div>
      </motion.div>

      {/* ── Stats Row ── */}
      <div className="kpi-panel">
        <div className="kpi-panel__glow"></div>
        <div className="kpi-grid !grid-cols-1 md:!grid-cols-3">
          <StatWidget
            label="Total Valuation"
            value={totalPurchasingCost}
            change={8}
            icon={IndianRupee}
            color="blue"
            prefix="₹"
            delay={0}
          />
          <StatWidget
            label="Total Materials"
            value={items.length}
            change={12}
            icon={Box}
            color="purple"
            delay={1}
          />
          <StatWidget
            label="Critical Stock"
            value={lowStockCount}
            change={-5}
            icon={AlertCircle}
            color="red"
            delay={2}
          />
        </div>
      </div>

      {/* ── VIEW: Table ── */}
      {viewMode === "table" && (
        <>
          {/* Search */}
          <motion.div variants={staggerItem} className="workflow-command-bar">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-[var(--muted-foreground)]" />
              <input
                placeholder="Filter by material name..."
                className="w-full h-[36px] rounded-[10px] bg-[var(--muted)] pl-[34px] pr-4 text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none border-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={handleAddNewClick}
              className="h-9 px-3 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 cursor-pointer transition-opacity"
            >
              Quick add
            </button>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="h-9 px-3 rounded-lg text-xs font-medium text-[var(--muted-foreground)] bg-[var(--muted)] hover:bg-[var(--accent)] cursor-pointer"
              >
                Clear
              </button>
            )}
            <span className="text-[13px] text-[var(--muted-foreground)]">{filteredItems.length} items</span>
          </motion.div>

          {/* Table */}
          <motion.div variants={staggerItem}>
            <IOSCard variant="elevated" padding="none" className="hidden md:block overflow-hidden glass-premium !rounded-[20px]">
              <Table>
                <TableHeader>
                  <TableRow className="glass-table-header hover:bg-transparent border-b border-white/[0.07] dark:border-white/[0.07]">
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide pl-5">Item & Supplier</TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">Stock Level</TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">Unit Cost (Landed)</TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">Status</TableHead>
                    <TableHead className="w-[120px] py-3"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-8 w-20 rounded-[6px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-8 w-8 rounded-full bg-[var(--muted)] shimmer ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        {searchTerm ? (
                          <div className="flex flex-col items-center gap-3 py-16">
                            <div className="w-[56px] h-[56px] rounded-[14px] bg-[var(--muted)] flex items-center justify-center">
                              <Package className="h-6 w-6 text-[var(--muted-foreground)]" />
                            </div>
                            <p className="text-[17px] font-medium text-[var(--muted-foreground)]">No materials found</p>
                            <p className="text-[13px] text-[var(--muted-foreground)]">Try a different search term</p>
                          </div>
                        ) : (
                          <EmptyState
                            icon="📦"
                            title="No materials added yet"
                            description="Add your raw materials to start tracking stock and get AI-powered forecasts"
                            actionLabel="+ Add First Material"
                            onAction={handleAddNewClick}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item, index) => {
                      const isLowStock = item.quantity <= item.min_stock_level;
                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="group glass-table-row hover:bg-[var(--muted)] border-b border-[var(--border)] transition-colors cursor-pointer"
                          onClick={() => setSelectedMaterial(item)}
                        >
                          <TableCell className="py-3.5 pl-5">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-[40px] h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0",
                                isLowStock ? "bg-[rgba(255,59,48,0.1)]" : "bg-[var(--muted)]"
                              )}>
                                <Package className={cn("h-[18px] w-[18px]", isLowStock ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]")} />
                              </div>
                              <div>
                                <span className="text-[15px] font-semibold text-[var(--foreground)] block leading-[20px]">{item.name}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <div className="flex items-center text-[13px] text-[var(--primary)] font-medium">
                                    <Phone className="h-3 w-3 mr-1" /> {item.supplier_whatsapp}
                                  </div>
                                  {item.last_source_po_number && (
                                    <span className="text-[11px] text-[var(--muted-foreground)]">
                                      · From {item.last_source_po_number}{formatSourceDate(item.last_received_at) ? ` · ${formatSourceDate(item.last_received_at)}` : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <span className="text-[17px] font-bold text-[var(--foreground)] block">{item.quantity} {item.unit}</span>
                            <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide">Min: {item.min_stock_level} {item.unit}</span>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex flex-col">
                              <span className="text-[15px] font-semibold text-[var(--foreground)]">
                                ₹{(Number(item.purchase_cost_per_unit || 0) * (1 + Number(item.tax_rate || 0) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide">
                                ₹{Number(item.purchase_cost_per_unit || 0).toLocaleString("en-IN")} + {item.tax_rate}% Tax
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            {(() => {
                              const stockStatus = getStockStatus(item);
                              return (
                                <IOSBadge color={stockStatus.color} variant="tinted" dot size="medium">
                                  {stockStatus.label}
                                </IOSBadge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="py-3.5 text-right pr-4">
                            <div className="flex items-center justify-end gap-2">
                              {isLowStock && (
                                <IOSButton
                                  variant="filled"
                                  size="small"
                                  onClick={() => handleRestock(item)}
                                  className="bg-[var(--erp-success)] hover:bg-[#2DB84E]"
                                >
                                  Restock
                                </IOSButton>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center hover:bg-[var(--muted)] transition-colors cursor-pointer"
                                  >
                                    <MoreVertical className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                                  </motion.button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-[12px]">
                                  <DropdownMenuItem onClick={() => openEditDialog(item)} className="rounded-[8px]">
                                    <Edit2 className="mr-2 h-4 w-4" /> Edit Item
                                  </DropdownMenuItem>
                                  {isAdmin && (
                                    <DropdownMenuItem
                                      className="text-[var(--destructive)] rounded-[8px]"
                                      onClick={() => {
                                        setItemToDeleteId(item.id);
                                        setIsDeleteDialogOpenConfirm(true);
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Mark as Removed
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </IOSCard>

            {/* Mobile Inventory Cards — visible only below md (768px) */}
            <div className="block md:hidden px-3 py-2 space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-gray-100 dark:bg-[#1a1f2e] rounded-xl px-4 py-3 border-l-4 border-gray-300 dark:border-gray-600">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-4 w-full rounded mt-2" />
                    <Skeleton className="h-3 w-24 rounded mt-2" />
                  </div>
                ))
              ) : filteredItems.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                  <p className="text-gray-400 text-sm">{searchTerm ? "No materials found" : "No materials added yet"}</p>
                </div>
              ) : filteredItems.map((item) => {
                const isLowStock = item.quantity <= item.min_stock_level;
                const stockStatus = getStockStatus(item);
                const borderColorMap = {
                  critical: 'border-red-500',
                  low: 'border-orange-400',
                  healthy: 'border-green-500',
                };
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "bg-gray-50 dark:bg-[#1a1f2e] rounded-xl px-4 py-3 border-l-4",
                      borderColorMap[stockStatus.level as keyof typeof borderColorMap]
                    )}
                    onClick={() => setSelectedMaterial(item)}
                  >
                    {/* Row 1: Material name + Stock status badge */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900 dark:text-white text-sm font-bold truncate mr-2">{item.name}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap uppercase",
                        stockStatus.color === "green" ? "bg-green-500/15 text-green-500 dark:text-green-400" :
                        stockStatus.color === "orange" ? "bg-orange-500/15 text-orange-500 dark:text-orange-400" :
                        "bg-red-500/15 text-red-500 dark:text-red-400"
                      )}>{stockStatus.label}</span>
                    </div>
                    {/* Row 2: Stock level + Min stock */}
                    <div className="flex justify-between items-center mt-1">
                      <span className={cn("text-sm font-semibold", isLowStock ? "text-red-500 dark:text-red-400" : "text-blue-600 dark:text-blue-400")}>Stock: {item.quantity} {item.unit}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Min: {item.min_stock_level}</span>
                    </div>
                    {/* Row 3: Source PO + Cost */}
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-500 dark:text-gray-400 text-xs truncate mr-2">
                        {item.last_source_po_number
                          ? `From ${item.last_source_po_number}${formatSourceDate(item.last_received_at) ? ` · ${formatSourceDate(item.last_received_at)}` : ""}`
                          : item.supplier_whatsapp || "No supplier"}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">₹{Number(item.purchase_cost_per_unit || 0).toLocaleString('en-IN')} + {item.tax_rate || 0}% TAX</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: Forecast — 6-Week Stock Projection
         ══════════════════════════════════════════════════════ */}
      {viewMode === "forecast" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4 ind-page"
        >
          {/* Forecast Header */}
          <div className="ind-page-header" style={{ marginBottom: 16 }}>
            <div className="ind-label">
              <span className="ind-pulse-dot" style={{ background: "var(--ind-green)" }} />
              AI-Powered Projection
            </div>
            <p className="ind-subtitle">6-week stock forecast based on recent order consumption patterns</p>
          </div>

          {forecastLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[80px] rounded-[16px] bg-[var(--muted)] shimmer" />
              ))}
            </div>
          ) : forecastData ? (
            <>
              {/* Alert Banner */}
              {(forecastData.summary.critical > 0 || forecastData.summary.warning > 0) && (
                <div className={cn(
                  "ind-alert",
                  forecastData.summary.critical > 0 ? "ind-alert--critical" : "ind-alert--warning"
                )}>
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: forecastData.summary.critical > 0 ? "var(--ind-red)" : "var(--ind-orange)" }} />
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: "var(--ind-text)" }}>
                      {forecastData.summary.critical > 0
                        ? `${forecastData.summary.critical} material${forecastData.summary.critical > 1 ? "s" : ""} below reorder level`
                        : `${forecastData.summary.warning} material${forecastData.summary.warning > 1 ? "s" : ""} approaching reorder level`}
                    </p>
                    <p className="text-[13px]" style={{ color: "var(--ind-text-muted)" }}>
                      Review and restock to avoid production delays
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div className="ind-stats-row">
                <div className="ind-stat-card">
                  <span className="ind-stat-card__label">Total Materials</span>
                  <span className="ind-stat-card__value" style={{ color: "var(--ind-blue)" }}>{forecastData.summary.totalMaterials}</span>
                </div>
                <div className="ind-stat-card" style={{ borderColor: forecastData.summary.critical > 0 ? "rgba(248,113,113,0.2)" : undefined }}>
                  <span className="ind-stat-card__label">Need Attention</span>
                  <span className="ind-stat-card__value" style={{ color: "var(--ind-red)" }}>{forecastData.summary.critical + forecastData.summary.warning}</span>
                </div>
                <div className="ind-stat-card">
                  <span className="ind-stat-card__label">Sufficient</span>
                  <span className="ind-stat-card__value" style={{ color: "var(--ind-green)" }}>{forecastData.summary.ok}</span>
                </div>
              </div>

              {/* Material Forecast Cards */}
              <div className="space-y-3">
                {forecastData.forecasts.map((material: any, idx: number) => {
                  const isExpanded = expandedForecast === material.id;
                  const statusColors = {
                    critical: { dot: "var(--ind-red)", glow: "ind-card--glow-red" },
                    warning: { dot: "var(--ind-orange)", glow: "ind-card--glow-orange" },
                    ok: { dot: "var(--ind-green)", glow: "ind-card--glow-green" },
                  };
                  const sc = statusColors[material.status as keyof typeof statusColors];
                  const maxStock = Math.max(material.currentStock, material.minStockLevel * 2, ...material.projectedWeeks.map((w: any) => w.projected));

                  return (
                    <motion.div
                      key={material.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      className={cn("ind-card ind-card--interactive", sc.glow)}
                      onClick={() => setExpandedForecast(isExpanded ? null : material.id)}
                    >
                      {/* Collapsed Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="ind-pulse-dot" style={{ background: sc.dot }} />
                          <div>
                            <span className="text-[15px] font-semibold" style={{ color: "var(--ind-text)" }}>{material.name}</span>
                            <span className="text-[12px] block" style={{ color: "var(--ind-text-muted)" }}>{material.supplierWhatsapp || "No supplier"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[15px] font-bold ind-mono" style={{ color: "var(--ind-text)" }}>
                              {material.currentStock} {material.unit}
                            </span>
                          </div>
                          <span className={cn("ind-badge", {
                            "ind-badge--red": material.status === "critical",
                            "ind-badge--orange": material.status === "warning",
                            "ind-badge--green": material.status === "ok",
                          })}>
                            {material.status === "critical" ? "CRITICAL" : material.status === "warning" ? "WARNING" : "OK"}
                          </span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" style={{ color: "var(--ind-text-muted)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "var(--ind-text-muted)" }} />}
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.3 }}
                          className="mt-5 pt-4" style={{ borderTop: "1px solid var(--ind-border)" }}
                        >
                          {/* Stat Boxes */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                            <div className="ind-stat-card" style={{ padding: 14 }}>
                              <span className="ind-stat-card__label" style={{ fontSize: 10 }}>Weekly Usage</span>
                              <span className="ind-stat-card__value ind-mono" style={{ fontSize: 20, color: "var(--ind-purple)" }}>
                                {material.weeklyConsumption} {material.unit}
                              </span>
                            </div>
                            <div className="ind-stat-card" style={{ padding: 14 }}>
                              <span className="ind-stat-card__label" style={{ fontSize: 10 }}>Days to Reorder</span>
                              <span className="ind-stat-card__value ind-mono" style={{ fontSize: 20, color: material.daysUntilReorder <= 7 ? "var(--ind-red)" : "var(--ind-green)" }}>
                                {material.daysUntilReorder >= 999 ? "∞" : material.daysUntilReorder}
                              </span>
                            </div>
                            <div className="ind-stat-card" style={{ padding: 14 }}>
                              <span className="ind-stat-card__label" style={{ fontSize: 10 }}>Reorder By</span>
                              <span className="ind-stat-card__value" style={{ fontSize: 14, color: "var(--ind-text)" }}>
                                {material.daysUntilReorder >= 999 ? "N/A" : new Date(material.reorderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                            <div className="ind-stat-card" style={{ padding: 14 }}>
                              <span className="ind-stat-card__label" style={{ fontSize: 10 }}>Cost/Unit</span>
                              <span className="ind-stat-card__value ind-mono" style={{ fontSize: 20, color: "var(--ind-blue)" }}>
                                ₹{material.purchaseCostPerUnit}
                              </span>
                            </div>
                          </div>

                          {/* 6-Week Forecast Bar Chart */}
                          <div style={{ marginBottom: 16 }}>
                            <p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ind-text-muted)" }}>6-Week Projection</p>
                            <div className="ind-forecast-bar">
                              {/* Current stock bar */}
                              <div className="ind-forecast-bar__col">
                                <div
                                  className="ind-forecast-bar__bar ind-forecast-bar__bar--current"
                                  style={{ height: `${Math.max(4, (material.currentStock / (maxStock || 1)) * 100)}%` }}
                                />
                                <span className="ind-forecast-bar__label">Now</span>
                              </div>
                              {/* Projected weeks */}
                              {material.projectedWeeks.map((week: any) => (
                                <div key={week.week} className="ind-forecast-bar__col">
                                  <div
                                    className={cn(
                                      "ind-forecast-bar__bar",
                                      week.projected <= material.minStockLevel ? "ind-forecast-bar__bar--danger" : "ind-forecast-bar__bar--ok"
                                    )}
                                    style={{ height: `${Math.max(4, (week.projected / (maxStock || 1)) * 100)}%` }}
                                  />
                                  <span className="ind-forecast-bar__label">{week.label}</span>
                                </div>
                              ))}
                            </div>
                            {/* Min stock line indicator */}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="h-[1px] flex-1" style={{ background: "var(--ind-red)", opacity: 0.3 }} />
                              <span className="text-[10px] font-medium" style={{ color: "var(--ind-red)" }}>Min: {material.minStockLevel} {material.unit}</span>
                            </div>
                          </div>

                          {/* Restock CTA */}
                          {material.status !== "ok" && material.supplierWhatsapp && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const msg = `Hi, I need to restock ${material.name}. Current stock: ${material.currentStock} ${material.unit}. Please share availability and price.`;
                                window.open(`https://wa.me/${material.supplierWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                              }}
                              className="ind-btn ind-btn--primary w-full"
                              style={{ background: "var(--ind-green)", boxShadow: "0 4px 14px rgba(52,211,153,0.35)" }}
                            >
                              <Phone className="h-4 w-4" /> Contact Supplier via WhatsApp
                            </button>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-[56px] h-[56px] rounded-[14px] bg-[var(--muted)] flex items-center justify-center mb-3">
                <Activity className="h-6 w-6 text-[var(--muted-foreground)]" />
              </div>
              <p className="text-[17px] font-medium text-[var(--muted-foreground)]">No forecast data</p>
              <p className="text-[13px] text-[var(--muted-foreground)]">Add inventory items and create orders to generate forecasts</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Add/Edit Dialog ── */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-[480px]" aria-describedby={undefined} showCloseButton={false} fullScreen>
          <DialogDescription className="sr-only">
            Form to add or edit an inventory material item
          </DialogDescription>
          {/* Premium Header */}
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(34,197,94,0.4), rgba(255,255,255,0.06))',
                border: '1px solid rgba(255,255,255,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Package className="h-[18px] w-[18px] text-[#4ade80]" />
              </div>
              <div>
                <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', lineHeight: '22px', margin: 0 }}>
                  {currentItem ? "Edit Material" : "New Material"}
                </DialogTitle>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: '18px', margin: '2px 0 0' }}>
                  {currentItem ? 'Update stock and supplier details' : 'Add raw material to inventory'}
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-0">
            <form id="inventory-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                  Material Name *
                </label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Polyester Yarn" required className="glass-input h-[44px] px-3" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                    Stock Quantity
                  </label>
                  <NumericInput id="quantity" value={formData.quantity} onValueChange={(v) => setFormData({ ...formData, quantity: v })} placeholder="Enter quantity" allowDecimal={true} min={0} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                    Unit
                  </label>
                  <Input id="unit" value={formData.unit} placeholder="kg, pcs, meters" onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="glass-input h-[44px] px-3" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                    Low Stock Alert
                  </label>
                  <NumericInput id="min_stock" value={formData.min_stock_level} onValueChange={(v) => setFormData({ ...formData, min_stock_level: v })} placeholder="e.g. 10" allowDecimal={true} min={0} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                    Landing Cost / Unit
                  </label>
                  <NumericInput id="cost" value={formData.purchase_cost_per_unit} onValueChange={(v) => setFormData({ ...formData, purchase_cost_per_unit: v })} placeholder="0.00" prefix="₹" allowDecimal={true} min={0} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                    HSN Code
                  </label>
                  <Input id="hsn" value={formData.hsn_code} onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })} placeholder="e.g. 5402" className="glass-input h-[44px] px-3" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                    Tax/GST %
                  </label>
                  <NumericInput id="tax" value={formData.tax_rate} onValueChange={(v) => setFormData({ ...formData, tax_rate: v })} placeholder="18" allowDecimal={true} min={0} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--primary)] uppercase block mb-1.5 font-bold">
                  Supplier WhatsApp *
                </label>
                <Input id="whatsapp" value={formData.supplier_whatsapp} onChange={(e) => setFormData({ ...formData, supplier_whatsapp: e.target.value })} placeholder="e.g. +91 9876543210" required className="glass-input h-[44px] px-3" />
              </div>
            </form>
          </div>

          {/* Premium Footer */}
          <div style={{
            flexShrink: 0, padding: '12px 16px 20px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            background: 'linear-gradient(180deg, rgba(14,22,44,0.5) 0%, rgba(8,16,36,0.8) 100%)',
          }}>
            <button
              type="submit"
              form="inventory-form"
              style={{
                width: '100%', height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', border: '1px solid rgba(16,185,129,0.3)',
                boxShadow: '0 4px 16px rgba(16,185,129,0.25)',
                fontFamily: "-apple-system, 'SF Pro Display', 'Segoe UI', sans-serif",
              }}
            >
              {currentItem ? "Update Details" : "Save to Inventory"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={isDeleteDialogOpenConfirm} onOpenChange={setIsDeleteDialogOpenConfirm}>
        <DialogContent className="max-w-[350px]" showCloseButton={false}>
          {/* Premium Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(239,68,68,0.4), rgba(255,255,255,0.06))',
                border: '1px solid rgba(255,255,255,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 className="h-[18px] w-[18px] text-[#f87171]" />
              </div>
              <div>
                <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', lineHeight: '22px', margin: 0 }}>
                  Delete Material
                </DialogTitle>
                <DialogDescription style={{ fontSize: 13, color: '#64748b', lineHeight: '18px', margin: '2px 0 0' }}>
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </div>
          <div style={{ padding: '16px 20px 20px' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setIsDeleteDialogOpenConfirm(false)}
                style={{
                  flex: 1, height: 48, borderRadius: 14,
                  background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.10)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "-apple-system, 'SF Pro Display', 'Segoe UI', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => itemToDeleteId && handleDelete(itemToDeleteId)}
                style={{
                  flex: 1, height: 48, borderRadius: 14,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff', border: '1px solid rgba(239,68,68,0.3)',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.25)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "-apple-system, 'SF Pro Display', 'Segoe UI', sans-serif",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Material Usage Drawer ── */}
      <MaterialUsageDrawer
        material={selectedMaterial ? {
          id: selectedMaterial.id,
          name: selectedMaterial.name,
          quantity: selectedMaterial.quantity,
          unit: selectedMaterial.unit,
        } : null}
        onClose={() => setSelectedMaterial(null)}
      />
    </motion.div>
  );
}
