"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  ShoppingCart,
  Truck,
  PackageCheck,
  Clock,
  IndianRupee,
  Building2,
  ChevronRight,
  ClipboardList,
  X,
  UserPlus,
  Send,
  CheckCircle2,
  Package,
  Eye,
  FileText,
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
import { useRole } from "@/lib/hooks/use-role";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NumericInput, parseNumericValue } from "@/components/ui/numeric-input";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { IOSCard } from "@/components/ui/ios/IOSCard";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { staggerContainer, staggerItem } from "@/styles/animations";
import { StatWidget } from "@/components/ui/StatWidget";
import { MobileTableCards } from "@/components/ui/MobileTableCards";
import { useCachedPage } from "@/hooks/useCachedPage";
import { ConfirmDeleteSheet } from "@/components/ui/ConfirmDeleteSheet";

// ─── Types ──────────────────────────────────────────────────────

interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
}

interface PurchaseOrderItem {
  inventoryItemId: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  items: PurchaseOrderItem[];
  status: "Pending" | "Ordered" | "Received";
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  orderedAt?: string;
  receivedAt?: string;
  createdAt: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  purchase_cost_per_unit: number;
  purchaseCostPerUnit?: number;
}

type TabKey = "orders" | "vendors";

// ─── Status Config ──────────────────────────────────────────────

const STATUS_CONFIG = {
  Pending: { color: "orange" as const, icon: Clock, label: "Pending" },
  Ordered: { color: "blue" as const, icon: Truck, label: "Ordered" },
  Received: { color: "green" as const, icon: PackageCheck, label: "Received" },
};

// ─── Component ──────────────────────────────────────────────────

export default function PurchasingPage() {
  const { isAdmin } = useRole();
  const [activeTab, setActiveTab] = useState<TabKey>("orders");
  const [mounted, setMounted] = useState(false);

  // Purchase Orders state
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");

  // Vendors state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorSearch, setVendorSearch] = useState("");

  // Inventory items for PO creation
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Server-side stats
  const [stats, setStats] = useState<{
    totalSpent: number;
    pendingCount: number;
    orderedCount: number;
    receivedCount: number;
  } | null>(null);

  // Dialogs
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "order" | "vendor"; id: string } | null>(null);
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null);

  // Vendor form
  const emptyVendorForm = {
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
  };
  const [vendorForm, setVendorForm] = useState(emptyVendorForm);

  // PO form
  const [poVendorId, setPoVendorId] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poTaxPercent, setPoTaxPercent] = useState("18");
  const [poItems, setPoItems] = useState<
    { inventoryItemId: string; materialName: string; quantity: string; unit: string; unitPrice: string }[]
  >([]);
  const [addToInventory, setAddToInventory] = useState(false);

  // ─── Data Fetching ────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/purchasing");
      const data = await res.json();
      if (data.success) setOrders(data.data || []);
      else toast.error("Failed to fetch purchase orders");
    } catch {
      toast.error("Failed to fetch purchase orders");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/purchasing/vendors");
      const data = await res.json();
      if (data.success) setVendors(data.data || []);
      else toast.error("Failed to fetch vendors");
    } catch {
      toast.error("Failed to fetch vendors");
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/inventory");
      const data = await res.json();
      if (data.success) setInventoryItems(data.data || []);
    } catch {
      // silent
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/purchasing/stats");
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {
      // Fall back to client-side computation
    }
  }, []);

  // ── Page State Persistence ────────────────────────────
  const [restoredFromCache, setRestoredFromCache] = useState(false);
  const { restoreState, persist, scrollYRef } = useCachedPage({ pageKey: "purchasing" });
  const persistRef = useRef({ activeTab, orderSearch, vendorSearch, orders, vendors, stats });
  useEffect(() => { persistRef.current = { activeTab, orderSearch, vendorSearch, orders, vendors, stats }; });
  useEffect(() => {
    const cached = restoreState();
    if (cached) {
      if (cached.activeTab) setActiveTab(cached.activeTab as TabKey);
      if (cached.orderSearch) setOrderSearch(cached.orderSearch as string);
      if (cached.vendorSearch) setVendorSearch(cached.vendorSearch as string);
      if (Array.isArray(cached.orders) && (cached.orders as any[]).length > 0) {
        setOrders(cached.orders as PurchaseOrder[]);
        setOrdersLoading(false);
      }
      if (Array.isArray(cached.vendors) && (cached.vendors as any[]).length > 0) {
        setVendors(cached.vendors as Vendor[]);
        setVendorsLoading(false);
      }
      if (cached.stats) setStats(cached.stats as any);
      setRestoredFromCache(true);
    }
    return () => {
      persist({ ...persistRef.current, scrollY: scrollYRef.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMounted(true);
    // Always fetch fresh data (cached data is shown instantly while this runs)
    fetchOrders();
    fetchVendors();
    fetchInventory();
    fetchStats();
  }, [fetchOrders, fetchVendors, fetchInventory, fetchStats]);

  // ─── Vendor Actions ───────────────────────────────────────────

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/purchasing/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vendor added successfully");
        setIsVendorDialogOpen(false);
        setVendorForm(emptyVendorForm);
        fetchVendors();
      } else {
        toast.error(data.error || "Failed to add vendor");
      }
    } catch {
      toast.error("Failed to add vendor");
    }
  };

  // ─── PO Actions ───────────────────────────────────────────────

  const openNewPO = () => {
    setPoVendorId("");
    setPoNotes("");
    setPoTaxPercent("18");
    setPoItems([{ inventoryItemId: "", materialName: "", quantity: "", unit: "kg", unitPrice: "" }]);
    setAddToInventory(false);
    setIsPODialogOpen(true);
  };

  const addPOItem = () => {
    setPoItems((prev) => [
      ...prev,
      { inventoryItemId: "", materialName: "", quantity: "", unit: "kg", unitPrice: "" },
    ]);
  };

  const removePOItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePOItem = (index: number, field: string, value: string) => {
    setPoItems((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;

      // Auto-fill from inventory
      if (field === "inventoryItemId" && value) {
        const item = inventoryItems.find((i) => i.id === value);
        if (item) {
          updated[index].materialName = item.name;
          updated[index].unit = item.unit;
          updated[index].unitPrice = String(item.purchaseCostPerUnit || item.purchase_cost_per_unit || 0);
        }
      }
      return updated;
    });
  };

  const handlePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poVendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (poItems.length === 0 || !poItems[0].inventoryItemId) {
      toast.error("Please add at least one material");
      return;
    }

    const vendor = vendors.find((v) => v.id === poVendorId);

    const payload = {
      vendorId: poVendorId,
      vendorName: vendor?.name || "",
      taxPercent: parseNumericValue(poTaxPercent, 18),
      notes: poNotes,
      addToInventory,
      items: poItems
        .filter((item) => item.inventoryItemId)
        .map((item) => ({
          inventoryItemId: item.inventoryItemId,
          materialName: item.materialName,
          quantity: parseNumericValue(item.quantity),
          unit: item.unit,
          unitPrice: parseNumericValue(item.unitPrice),
        })),
    };

    try {
      const res = await fetch("/api/purchasing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          data.inventorySynced
            ? "Purchase order created & materials added to inventory"
            : "Purchase order created",
        );
        setIsPODialogOpen(false);
        fetchOrders();
        if (data.inventorySynced) fetchInventory();
      } else {
        toast.error(data.error || "Failed to create PO");
      }
    } catch {
      toast.error("Failed to create purchase order");
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: "Ordered" | "Received") => {
    try {
      const res = await fetch(`/api/purchasing/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          newStatus === "Received"
            ? "Order received — inventory updated!"
            : "Order marked as sent",
        );
        fetchOrders();
        fetchStats();
        if (newStatus === "Received") fetchInventory();
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const url =
        deleteTarget.type === "order"
          ? `/api/purchasing/${deleteTarget.id}`
          : `/api/purchasing/vendors/${deleteTarget.id}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success(`${deleteTarget.type === "order" ? "Purchase order" : "Vendor"} deleted`);
        if (deleteTarget.type === "order") fetchOrders();
        else fetchVendors();
      } else {
        toast.error(data.error || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  // ─── Computed ─────────────────────────────────────────────────

  const filteredOrders = orders.filter(
    (o) =>
      o.poNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.vendorName.toLowerCase().includes(orderSearch.toLowerCase()),
  );

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(vendorSearch.toLowerCase()),
  );

  // Use server-side stats if available, otherwise fall back to client-side
  const totalSpend = stats?.totalSpent ?? orders
    .filter((o) => o.status === "Received")
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const pendingCount = stats?.pendingCount ?? orders.filter((o) => o.status === "Pending").length;
  const orderedCount = stats?.orderedCount ?? orders.filter((o) => o.status === "Ordered").length;
  const receivedCount = stats?.receivedCount ?? orders.filter((o) => o.status === "Received").length;

  const formatCurrency = (n: number) => `\u20B9${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  // ─── Loading Skeleton ─────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-[34px] w-[160px] rounded-[10px] bg-[var(--muted)] shimmer" />
          <div className="h-[20px] w-[280px] rounded-[8px] bg-[var(--muted)] shimmer mt-2" />
        </div>
        <div className="kpi-panel">
          <div className="kpi-panel__glow" />
          <div className="kpi-grid !grid-cols-1 md:!grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
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
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      {/* ── Header ── */}
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] sm:text-[28px] md:text-[34px] font-bold text-[var(--foreground)] leading-[1.2] md:leading-[41px] tracking-[0.37px] truncate">
            Purchasing
          </h1>
          <p className="text-[15px] text-[var(--muted-foreground)] mt-1 leading-[20px] break-words">
            Manage vendors, create purchase orders, and track deliveries.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <IOSButton
            variant="tinted"
            color="green"
            size="medium"
            onClick={() => { setVendorForm(emptyVendorForm); setIsVendorDialogOpen(true); }}
            icon={<UserPlus className="h-4 w-4" />}
          >
            Add Vendor
          </IOSButton>
          <IOSButton
            variant="filled"
            color="blue"
            size="medium"
            onClick={openNewPO}
            className="glow-btn !bg-none shadow-none"
            icon={<Plus className="h-4 w-4" />}
          >
            New Purchase
          </IOSButton>
        </div>
      </motion.div>

      {/* ── Stats Row ── */}
      <div className="kpi-panel">
        <div className="kpi-panel__glow" />
        <div className="kpi-grid !grid-cols-1 md:!grid-cols-4">
          <StatWidget label="Total Spent" value={totalSpend} icon={IndianRupee} color="blue" prefix={"\u20B9"} delay={0} />
          <StatWidget label="Pending" value={pendingCount} icon={Clock} color="orange" delay={1} />
          <StatWidget label="In Transit" value={orderedCount} icon={Truck} color="purple" delay={2} />
          <StatWidget label="Received" value={receivedCount} icon={PackageCheck} color="green" delay={3} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <motion.div variants={staggerItem} className="flex items-center gap-1 p-1 rounded-[12px] bg-[var(--muted)] max-w-fit">
        {(["orders", "vendors"] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-[10px] text-[14px] font-medium transition-all duration-200 cursor-pointer",
              activeTab === tab
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            )}
          >
            {tab === "orders" ? (
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Purchase Orders
                {orders.length > 0 && (
                  <span className="text-[11px] bg-[var(--primary)] text-white px-1.5 py-0.5 rounded-full font-bold">
                    {orders.length}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Vendors
                {vendors.length > 0 && (
                  <span className="text-[11px] bg-[var(--accent)] text-[var(--muted-foreground)] px-1.5 py-0.5 rounded-full font-bold">
                    {vendors.length}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* ── Search Bar ── */}
      <motion.div variants={staggerItem} className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-[var(--muted-foreground)]" />
          <input
            placeholder={activeTab === "orders" ? "Search PO# or vendor..." : "Search vendors..."}
            className="w-full h-[36px] rounded-[10px] bg-[var(--muted)] pl-[34px] pr-4 text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none border-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
            value={activeTab === "orders" ? orderSearch : vendorSearch}
            onChange={(e) =>
              activeTab === "orders" ? setOrderSearch(e.target.value) : setVendorSearch(e.target.value)
            }
          />
        </div>
        <span className="text-[13px] text-[var(--muted-foreground)]">
          {activeTab === "orders" ? `${filteredOrders.length} orders` : `${filteredVendors.length} vendors`}
        </span>
      </motion.div>

      {/* ════════════ PURCHASE ORDERS TAB ════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === "orders" && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── Mobile Card View ── */}
            {!ordersLoading && filteredOrders.length > 0 && (
              <MobileTableCards
                data={filteredOrders}
                className="md:hidden"
                fields={[
                  { key: "poNumber", label: "PO #", primary: true, render: (_v, o) => (
                    <span className="text-[var(--primary)] font-bold">{o.poNumber} <span className="text-[var(--muted-foreground)] font-normal">— {o.vendorName}</span></span>
                  )},
                  { key: "items", label: "Items", render: (_v, o) => `${o.items.length} item${o.items.length !== 1 ? "s" : ""}` },
                  { key: "totalAmount", label: "Amount", render: (_v, o) => (
                    <span className="font-semibold">{formatCurrency(o.totalAmount)}</span>
                  )},
                  { key: "status", label: "Status", render: (_v, o) => (
                    <IOSBadge color={STATUS_CONFIG[o.status].color} variant="tinted" dot size="medium">{STATUS_CONFIG[o.status].label}</IOSBadge>
                  )},
                  { key: "createdAt", label: "Date", render: (_v, o) => new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) },
                ]}
                emptyMessage="No purchase orders yet"
              />
            )}
            {/* ── Desktop Table ── */}
            <IOSCard variant="elevated" padding="none" className="overflow-hidden glass-premium !rounded-[20px] hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="glass-table-header hover:bg-transparent border-b border-white/[0.07]">
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide pl-5">
                      PO # & Vendor
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                      Items
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                      Amount
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                      Date
                    </TableHead>
                    <TableHead className="w-[100px] py-3" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-8 w-20 rounded-[6px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-8 w-16 rounded-[6px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-8 w-8 rounded-full bg-[var(--muted)] shimmer ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-[56px] h-[56px] rounded-[14px] bg-[var(--muted)] flex items-center justify-center">
                            <ShoppingCart className="h-6 w-6 text-[var(--muted-foreground)]" />
                          </div>
                          <p className="text-[17px] font-medium text-[var(--muted-foreground)]">No purchase orders yet</p>
                          <p className="text-[13px] text-[var(--muted-foreground)]">
                            Create your first purchase order to get started
                          </p>
                          <IOSButton variant="filled" size="small" onClick={openNewPO} icon={<Plus className="h-3.5 w-3.5" />}>
                            New Purchase Order
                          </IOSButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order, index) => {
                      const statusConfig = STATUS_CONFIG[order.status];
                      const StatusIcon = statusConfig.icon;
                      return (
                        <motion.tr
                          key={order.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="group glass-table-row hover:bg-[var(--muted)] border-b border-[var(--border)] transition-colors"
                        >
                          <TableCell className="py-3.5 pl-5">
                            <div className="flex items-center gap-3">
                              <div className="w-[40px] h-[40px] rounded-[10px] bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                                <ShoppingCart className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                              </div>
                              <div>
                                <span className="text-[15px] font-bold text-[var(--primary)] block leading-[20px]">
                                  {order.poNumber}
                                </span>
                                <span className="text-[13px] text-[var(--muted-foreground)] mt-0.5 block">
                                  {order.vendorName}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <span className="text-[15px] font-medium text-[var(--foreground)]">
                              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <span className="text-[15px] font-semibold text-[var(--foreground)]">
                              {formatCurrency(order.totalAmount)}
                            </span>
                            <span className="text-[11px] text-[var(--muted-foreground)] block">
                              Tax: {formatCurrency(order.taxAmount)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <IOSBadge color={statusConfig.color} variant="tinted" dot size="medium">
                              {statusConfig.label}
                            </IOSBadge>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <span className="text-[13px] text-[var(--muted-foreground)]">
                              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "2-digit",
                              })}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 text-right pr-4">
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
                                <DropdownMenuItem
                                  onClick={() => { setDetailOrder(order); setIsDetailDialogOpen(true); }}
                                  className="rounded-[8px]"
                                >
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                {order.status === "Pending" && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(order.id, "Ordered")}
                                    className="rounded-[8px] text-[var(--primary)]"
                                  >
                                    <Send className="mr-2 h-4 w-4" /> Mark as Ordered
                                  </DropdownMenuItem>
                                )}
                                {(order.status === "Pending" || order.status === "Ordered") && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(order.id, "Received")}
                                    className="rounded-[8px] text-[var(--erp-success)]"
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Received
                                  </DropdownMenuItem>
                                )}
                                {order.status !== "Received" && isAdmin && (
                                  <DropdownMenuItem
                                    className="text-[var(--destructive)] rounded-[8px]"
                                    onClick={() => {
                                      setDeleteTarget({ type: "order", id: order.id });
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </IOSCard>
          </motion.div>
        )}

        {/* ════════════ VENDORS TAB ════════════ */}
        {activeTab === "vendors" && (
          <motion.div
            key="vendors"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── Mobile Card View ── */}
            {!vendorsLoading && filteredVendors.length > 0 && (
              <MobileTableCards
                data={filteredVendors}
                className="md:hidden"
                fields={[
                  { key: "name", label: "Vendor", primary: true, render: (_v, vendor) => (
                    <span>{vendor.name} <span className="text-[var(--muted-foreground)] font-normal text-[13px]">({vendor.contactPerson})</span></span>
                  )},
                  { key: "phone", label: "Phone", render: (_v, vendor) => (
                    <span className="text-[var(--primary)] font-medium">{vendor.phone}</span>
                  )},
                  { key: "email", label: "Email" },
                  { key: "gstin", label: "GSTIN", render: (v) => v || "—" },
                ]}
                emptyMessage="No vendors added"
              />
            )}
            {/* ── Desktop Table ── */}
            <IOSCard variant="elevated" padding="none" className="overflow-hidden glass-premium !rounded-[20px] hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="glass-table-header hover:bg-transparent border-b border-white/[0.07]">
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide pl-5">
                      Vendor & Contact
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                      Phone
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                      Email
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                      GSTIN
                    </TableHead>
                    <TableHead className="w-[80px] py-3" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-8 w-20 rounded-[6px] bg-[var(--muted)] shimmer" /></TableCell>
                        <TableCell><div className="h-8 w-8 rounded-full bg-[var(--muted)] shimmer" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredVendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-[56px] h-[56px] rounded-[14px] bg-[var(--muted)] flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-[var(--muted-foreground)]" />
                          </div>
                          <p className="text-[17px] font-medium text-[var(--muted-foreground)]">No vendors added</p>
                          <p className="text-[13px] text-[var(--muted-foreground)]">Add your first vendor to start purchasing</p>
                          <IOSButton
                            variant="filled"
                            size="small"
                            onClick={() => { setVendorForm(emptyVendorForm); setIsVendorDialogOpen(true); }}
                            icon={<UserPlus className="h-3.5 w-3.5" />}
                          >
                            Add Vendor
                          </IOSButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendors.map((vendor, index) => (
                      <motion.tr
                        key={vendor.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="group glass-table-row hover:bg-[var(--muted)] border-b border-[var(--border)] transition-colors"
                      >
                        <TableCell className="py-3.5 pl-5">
                          <div className="flex items-center gap-3">
                            <div className="w-[40px] h-[40px] rounded-[10px] bg-[rgba(88,86,214,0.1)] flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-[18px] w-[18px] text-[var(--chart-5)]" />
                            </div>
                            <div>
                              <span className="text-[15px] font-semibold text-[var(--foreground)] block leading-[20px]">
                                {vendor.name}
                              </span>
                              <span className="text-[13px] text-[var(--muted-foreground)] block mt-0.5">
                                {vendor.contactPerson}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-[15px] text-[var(--primary)] font-medium">{vendor.phone}</span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-[13px] text-[var(--muted-foreground)]">{vendor.email || "—"}</span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-[13px] text-[var(--muted-foreground)] font-mono">{vendor.gstin || "—"}</span>
                        </TableCell>
                        <TableCell className="py-3.5 text-right pr-4">
                          {isAdmin && (
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
                                <DropdownMenuItem
                                  className="text-[var(--destructive)] rounded-[8px]"
                                  onClick={() => {
                                    setDeleteTarget({ type: "vendor", id: vendor.id });
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Vendor
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </IOSCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════ ADD VENDOR DIALOG ════════════ */}
      <Dialog
        open={isVendorDialogOpen}
        onOpenChange={(open) => {
          setIsVendorDialogOpen(open);
          if (!open) setVendorForm(emptyVendorForm);
        }}
      >
        <DialogContent className="max-w-md md:max-w-lg p-0 overflow-hidden rounded-[24px] border-[var(--glass-border)] glass-dialog">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid var(--glass-border)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(255,255,255,0.06))", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Building2 className="h-[18px] w-[18px] text-[#60a5fa]" />
                </div>
                <div>
                  <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "var(--g-text-primary)", lineHeight: "22px", margin: 0 }}>New Vendor</DialogTitle>
                  <p style={{ fontSize: 13, color: "var(--g-text-secondary)", lineHeight: "18px", margin: "2px 0 0" }}>Add supplier details</p>
                </div>
              </div>
              <form onSubmit={handleVendorSubmit} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-[var(--muted-foreground)]">Vendor Name *</Label>
                  <Input
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    placeholder="e.g. Reliance Industries"
                    required
                    className="glass-input h-[44px] px-3"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--muted-foreground)]">Contact Person *</Label>
                    <Input
                      value={vendorForm.contactPerson}
                      onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                      placeholder="Full name"
                      required
                      className="glass-input h-[44px] px-3"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--muted-foreground)]">Phone *</Label>
                    <Input
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      required
                      className="glass-input h-[44px] px-3"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--muted-foreground)]">Email</Label>
                    <Input
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      placeholder="vendor@company.com"
                      className="glass-input h-[44px] px-3"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--muted-foreground)]">GSTIN</Label>
                    <Input
                      value={vendorForm.gstin}
                      onChange={(e) => setVendorForm({ ...vendorForm, gstin: e.target.value })}
                      placeholder="22AAAAA0000A1Z5"
                      className="glass-input h-[44px] px-3"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-[var(--muted-foreground)]">Address</Label>
                  <Input
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    placeholder="Full address"
                    className="glass-input h-[44px] px-3"
                  />
                </div>
                <DialogFooter className="pt-4">
                  <button type="submit" className="glow-btn w-full h-[50px] text-[17px] flex items-center justify-center gap-2">
                    Save Vendor
                  </button>
                </DialogFooter>
              </form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ════════════ NEW PURCHASE ORDER DIALOG ════════════ */}
      <Dialog open={isPODialogOpen} onOpenChange={setIsPODialogOpen}>
        <DialogContent className="w-full max-w-[420px] sm:max-w-[560px] md:max-w-[680px] lg:max-w-[750px] p-0 max-h-[90vh] overflow-hidden rounded-[24px] border-[var(--glass-border)] glass-dialog flex flex-col">
          <div className="overflow-y-auto flex-1">
            <div className="p-4 sm:p-6 md:p-8">
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid var(--glass-border)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(34,197,94,0.4), rgba(255,255,255,0.06))", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShoppingCart className="h-[18px] w-[18px] text-[#4ade80]" />
                </div>
                <div>
                  <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "var(--g-text-primary)", lineHeight: "22px", margin: 0 }}>New Purchase Order</DialogTitle>
                  <p style={{ fontSize: 13, color: "var(--g-text-secondary)", lineHeight: "18px", margin: "2px 0 0" }}>Create a purchase order</p>
                </div>
              </div>
              <form onSubmit={handlePOSubmit} className="space-y-5 pt-4">
                {/* Vendor Select */}
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-[var(--muted-foreground)]">Select Vendor *</Label>
                  <select
                    value={poVendorId}
                    onChange={(e) => setPoVendorId(e.target.value)}
                    required
                    className="w-full h-[44px] rounded-[10px] bg-[var(--muted)] px-3 text-[15px] text-[var(--foreground)] outline-none border-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow appearance-none cursor-pointer"
                  >
                    <option value="">Choose vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {v.contactPerson}
                      </option>
                    ))}
                  </select>
                  {vendors.length === 0 && (
                    <p className="text-[12px] text-[var(--erp-warning)]">
                      No vendors found. Add a vendor first.
                    </p>
                  )}
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px] font-semibold text-[var(--foreground)]">Materials *</Label>
                    <button
                      type="button"
                      onClick={addPOItem}
                      className="text-[13px] text-[var(--primary)] font-medium hover:underline cursor-pointer"
                    >
                      + Add Item
                    </button>
                  </div>

                  {poItems.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-[12px] bg-[var(--muted)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-[var(--muted-foreground)] uppercase">
                          Item {idx + 1}
                        </span>
                        {poItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePOItem(idx)}
                            className="p-1 hover:bg-[var(--muted)] rounded-[6px] cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5 text-[var(--destructive)]" />
                          </button>
                        )}
                      </div>
                      <select
                        value={item.inventoryItemId}
                        onChange={(e) => updatePOItem(idx, "inventoryItemId", e.target.value)}
                        className="w-full h-[40px] rounded-[8px] bg-[var(--muted)] px-3 text-[14px] text-[var(--foreground)] outline-none border-none focus:ring-2 focus:ring-[var(--primary)] appearance-none cursor-pointer"
                      >
                        <option value="">Select material...</option>
                        {inventoryItems.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} ({inv.quantity} {inv.unit} in stock)
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-3 gap-2 md:gap-4">
                        <div>
                          <Label className="text-[11px] text-[var(--muted-foreground)]">Qty</Label>
                          <NumericInput
                            value={item.quantity}
                            onValueChange={(v) => updatePOItem(idx, "quantity", v)}
                            placeholder="0"
                            allowDecimal
                            min={0}
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-[var(--muted-foreground)]">Unit</Label>
                          <Input
                            value={item.unit}
                            onChange={(e) => updatePOItem(idx, "unit", e.target.value)}
                            className="glass-input h-[40px] px-2 text-[14px]"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-[var(--muted-foreground)]">{"\u20B9"}/Unit</Label>
                          <NumericInput
                            value={item.unitPrice}
                            onValueChange={(v) => updatePOItem(idx, "unitPrice", v)}
                            placeholder="0.00"
                            prefix={"\u20B9"}
                            allowDecimal
                            min={0}
                          />
                        </div>
                      </div>
                      {item.quantity && item.unitPrice && (
                        <div className="text-right text-[13px] font-semibold text-[var(--primary)]">
                          Line Total: {formatCurrency(parseNumericValue(item.quantity) * parseNumericValue(item.unitPrice))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tax & Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--muted-foreground)]">Tax %</Label>
                    <NumericInput
                      value={poTaxPercent}
                      onValueChange={setPoTaxPercent}
                      placeholder="18"
                      allowDecimal
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--muted-foreground)]">Notes</Label>
                    <Input
                      value={poNotes}
                      onChange={(e) => setPoNotes(e.target.value)}
                      placeholder="Optional notes"
                      className="glass-input h-[44px] px-3"
                    />
                  </div>
                </div>

                {/* Grand Total Preview */}
                {poItems.some((i) => i.quantity && i.unitPrice) && (
                  <div className="p-3 rounded-[12px] bg-[rgba(0,122,255,0.06)] border border-[var(--primary)]/20">
                    <div className="flex justify-between text-[13px] text-[var(--muted-foreground)]">
                      <span>Subtotal</span>
                      <span>
                        {formatCurrency(
                          poItems.reduce((a, i) => a + parseNumericValue(i.quantity) * parseNumericValue(i.unitPrice), 0),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px] text-[var(--muted-foreground)] mt-1">
                      <span>Tax ({poTaxPercent}%)</span>
                      <span>
                        {formatCurrency(
                          poItems.reduce((a, i) => a + parseNumericValue(i.quantity) * parseNumericValue(i.unitPrice), 0) *
                            (parseNumericValue(poTaxPercent, 18) / 100),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-[17px] font-bold text-[var(--foreground)] mt-2 pt-2 border-t border-[var(--border)]">
                      <span>Total</span>
                      <span className="text-[var(--primary)]">
                        {formatCurrency(
                          poItems.reduce((a, i) => a + parseNumericValue(i.quantity) * parseNumericValue(i.unitPrice), 0) *
                            (1 + parseNumericValue(poTaxPercent, 18) / 100),
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Add to Inventory Toggle ── */}
                <div
                  className={cn(
                    "p-3 rounded-[14px] border transition-all duration-200 cursor-pointer select-none",
                    addToInventory
                      ? "border-[#2563EB]/40 bg-blue-50 dark:bg-blue-950/30"
                      : "border-[var(--border)] bg-[var(--muted)]"
                  )}
                  onClick={() => setAddToInventory((v) => !v)}
                  role="switch"
                  aria-checked={addToInventory}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAddToInventory((v) => !v); } }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-[32px] h-[32px] rounded-[8px] flex items-center justify-center transition-colors",
                          addToInventory
                            ? "bg-[#2563EB]/15 text-[#2563EB]"
                            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                        )}
                      >
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <span className={cn(
                          "text-[13px] font-semibold block leading-[18px]",
                          addToInventory ? "text-[#2563EB] dark:text-blue-400" : "text-[var(--foreground)]"
                        )}>
                          Add to Inventory
                        </span>
                        <span className="text-[11px] text-[var(--muted-foreground)] leading-[14px] block">
                          Update stock levels on creation
                        </span>
                      </div>
                    </div>
                    {/* Pill toggle */}
                    <div
                      className={cn(
                        "w-[42px] h-[24px] rounded-full p-[2px] transition-colors duration-200",
                        addToInventory ? "bg-[#2563EB]" : "bg-slate-300 dark:bg-[#1C2333]"
                      )}
                    >
                      <div
                        className={cn(
                          "w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform duration-200",
                          addToInventory ? "translate-x-[18px]" : "translate-x-0"
                        )}
                      />
                    </div>
                  </div>
                  {addToInventory && (
                    <p className="text-[11px] text-[#2563EB]/70 dark:text-blue-400/70 mt-2 leading-[15px] pl-[42px]">
                      Stock will be added now. When this PO is later marked as &ldquo;Received&rdquo;, inventory will <strong>not</strong> be incremented again.
                    </p>
                  )}
                </div>

                <DialogFooter className="pt-2">
                  <button type="submit" className="glow-btn w-full h-[50px] text-[17px] flex items-center justify-center gap-2">
                    <ShoppingCart className="h-5 w-5" /> Create Purchase Order
                  </button>
                </DialogFooter>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════ ORDER DETAIL DIALOG ════════════ */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-md md:max-w-lg p-0 overflow-hidden rounded-[24px] border-[var(--glass-border)] glass-dialog">
          {detailOrder && (
            <ScrollArea className="max-h-[90vh]">
              <div className="p-6 space-y-4">
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid var(--glass-border)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(168,85,247,0.4), rgba(255,255,255,0.06))", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText className="h-[18px] w-[18px] text-[#c084fc]" />
                  </div>
                  <div>
                    <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "var(--g-text-primary)", lineHeight: "22px", margin: 0 }}>{detailOrder.poNumber}</DialogTitle>
                    <DialogDescription style={{ fontSize: 13, color: "var(--g-text-secondary)", lineHeight: "18px", margin: "2px 0 0" }}>Vendor: {detailOrder.vendorName}</DialogDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <IOSBadge color={STATUS_CONFIG[detailOrder.status].color} variant="tinted" size="medium">
                    {detailOrder.status}
                  </IOSBadge>
                  <span className="text-[13px] text-[var(--muted-foreground)]">
                    Created: {new Date(detailOrder.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                  <h4 className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                    Materials
                  </h4>
                  {detailOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-[10px] bg-[var(--muted)]"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <div>
                          <span className="text-[14px] font-medium text-[var(--foreground)] block">
                            {item.materialName}
                          </span>
                          <span className="text-[12px] text-[var(--muted-foreground)]">
                            {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                          </span>
                        </div>
                      </div>
                      <span className="text-[14px] font-semibold text-[var(--foreground)]">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="p-3 rounded-[12px] bg-[var(--muted)] space-y-1">
                  <div className="flex justify-between text-[13px] text-[var(--muted-foreground)]">
                    <span>Subtotal</span>
                    <span>{formatCurrency(detailOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-[var(--muted-foreground)]">
                    <span>Tax</span>
                    <span>{formatCurrency(detailOrder.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[17px] font-bold text-[var(--foreground)] pt-2 border-t border-[var(--border)]">
                    <span>Total</span>
                    <span className="text-[var(--primary)]">{formatCurrency(detailOrder.totalAmount)}</span>
                  </div>
                </div>

                {detailOrder.notes && (
                  <div className="text-[13px] text-[var(--muted-foreground)]">
                    <span className="font-medium">Notes:</span> {detailOrder.notes}
                  </div>
                )}

                {detailOrder.orderedAt && (
                  <div className="text-[13px] text-[var(--muted-foreground)]">
                    Ordered: {new Date(detailOrder.orderedAt).toLocaleDateString("en-IN")}
                  </div>
                )}
                {detailOrder.receivedAt && (
                  <div className="text-[13px] text-[var(--erp-success)] font-medium">
                    ✓ Received: {new Date(detailOrder.receivedAt).toLocaleDateString("en-IN")}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════ DELETE CONFIRM ════════════ */}
      <ConfirmDeleteSheet
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        entityLabel={deleteTarget?.type === "order" ? "purchase order" : "vendor"}
        entityName={
          deleteTarget?.type === "order"
            ? orders.find((o) => o.id === deleteTarget.id)?.poNumber
            : vendors.find((v) => v.id === deleteTarget?.id)?.name
        }
        consequenceText={
          deleteTarget?.type === "order"
            ? "will be permanently removed from purchasing records. This cannot be undone."
            : "will be permanently removed along with its purchase history. This cannot be undone."
        }
      />
    </motion.div>
  );
}
