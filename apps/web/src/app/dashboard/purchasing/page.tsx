"use client";

import { useEffect, useState, useCallback } from "react";
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

  useEffect(() => {
    setMounted(true);
    fetchOrders();
    fetchVendors();
    fetchInventory();
  }, [fetchOrders, fetchVendors, fetchInventory]);

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
        toast.success("Purchase order created");
        setIsPODialogOpen(false);
        fetchOrders();
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

  const totalSpend = orders
    .filter((o) => o.status === "Received")
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const pendingCount = orders.filter((o) => o.status === "Pending").length;
  const orderedCount = orders.filter((o) => o.status === "Ordered").length;
  const receivedCount = orders.filter((o) => o.status === "Received").length;

  const formatCurrency = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  // ─── Loading Skeleton ─────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-[34px] w-[160px] rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
          <div className="h-[20px] w-[280px] rounded-[8px] bg-[var(--fill-tertiary)] shimmer mt-2" />
        </div>
        <div className="kpi-panel">
          <div className="kpi-panel__glow" />
          <div className="kpi-grid !grid-cols-1 md:!grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="kpi-card flex flex-col justify-center min-h-[140px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-[48px] w-[48px] rounded-[14px] bg-[var(--fill-tertiary)] shimmer" />
                  <div className="h-[24px] w-[50px] rounded-full bg-[var(--fill-tertiary)] shimmer" />
                </div>
                <div className="h-[34px] w-[120px] rounded-[8px] bg-[var(--fill-tertiary)] shimmer mb-2" />
                <div className="h-[16px] w-[90px] rounded-[6px] bg-[var(--fill-tertiary)] shimmer" />
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
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[34px] font-bold text-[var(--label-primary)] leading-[41px] tracking-[0.37px]">
            Purchasing
          </h1>
          <p className="text-[15px] text-[var(--label-secondary)] mt-1 leading-[20px]">
            Manage vendors, create purchase orders, and track deliveries.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <StatWidget label="Total Spent" value={totalSpend} icon={IndianRupee} color="blue" prefix="₹" delay={0} />
          <StatWidget label="Pending" value={pendingCount} icon={Clock} color="orange" delay={1} />
          <StatWidget label="In Transit" value={orderedCount} icon={Truck} color="purple" delay={2} />
          <StatWidget label="Received" value={receivedCount} icon={PackageCheck} color="green" delay={3} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <motion.div variants={staggerItem} className="flex items-center gap-1 p-1 rounded-[12px] bg-[var(--fill-tertiary)] max-w-fit">
        {(["orders", "vendors"] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-[10px] text-[14px] font-medium transition-all duration-200 cursor-pointer",
              activeTab === tab
                ? "bg-[var(--bg-card)] text-[var(--label-primary)] shadow-[var(--shadow-sm)]"
                : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]",
            )}
          >
            {tab === "orders" ? (
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Purchase Orders
                {orders.length > 0 && (
                  <span className="text-[11px] bg-[var(--ios-blue)] text-white px-1.5 py-0.5 rounded-full font-bold">
                    {orders.length}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Vendors
                {vendors.length > 0 && (
                  <span className="text-[11px] bg-[var(--fill-secondary)] text-[var(--label-secondary)] px-1.5 py-0.5 rounded-full font-bold">
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
          <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-[var(--label-tertiary)]" />
          <input
            placeholder={activeTab === "orders" ? "Search PO# or vendor..." : "Search vendors..."}
            className="w-full h-[36px] rounded-[10px] bg-[var(--fill-tertiary)] pl-[34px] pr-4 text-[15px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] outline-none border-none focus:ring-2 focus:ring-[var(--ios-blue)] transition-shadow"
            value={activeTab === "orders" ? orderSearch : vendorSearch}
            onChange={(e) =>
              activeTab === "orders" ? setOrderSearch(e.target.value) : setVendorSearch(e.target.value)
            }
          />
        </div>
        <span className="text-[13px] text-[var(--label-tertiary)]">
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
            <IOSCard variant="elevated" padding="none" className="overflow-hidden glass-premium !rounded-[20px]">
              <Table>
                <TableHeader>
                  <TableRow className="glass-table-header hover:bg-transparent border-b border-white/[0.07]">
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--label-secondary)] uppercase tracking-wide pl-5">
                      PO # & Vendor
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--label-secondary)] uppercase tracking-wide">
                      Items
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--label-secondary)] uppercase tracking-wide">
                      Amount
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--label-secondary)] uppercase tracking-wide">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--label-secondary)] uppercase tracking-wide">
                      Date
                    </TableHead>
                    <TableHead className="w-[100px] py-3" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--fill-tertiary)] shimmer" /></TableCell>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--fill-tertiary)] shimmer" /></TableCell>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--fill-tertiary)] shimmer" /></TableCell>
                        <TableCell><div className="h-8 w-20 rounded-[6px] bg-[var(--fill-tertiary)] shimmer" /></TableCell>
                        <TableCell><div className="h-8 w-16 rounded-[6px] bg-[var(--fill-tertiary)] shimmer" /></TableCell>
                        <TableCell><div className="h-8 w-8 rounded-full bg-[var(--fill-tertiary)] shimmer ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-[56px] h-[56px] rounded-[14px] bg-[var(--fill-tertiary)] flex items-center justify-center">
                            <ShoppingCart className="h-6 w-6 text-[var(--label-tertiary)]" />
                          </div>
                          <p className="text-[17px] font-medium text-[var(--label-secondary)]">No purchase orders yet</p>
                          <p className="text-[13px] text-[var(--label-tertiary)]">
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
                          className="group glass-table-row hover:bg-[var(--fill-quaternary)] border-b border-[var(--border-card)] transition-colors"
                        >
                          <TableCell className="py-3.5 pl-5">
                            <div className="flex items-center gap-3">
                              <div className="w-[40px] h-[40px] rounded-[10px] bg-[var(--fill-tertiary)] flex items-center justify-center flex-shrink-0">
                                <ShoppingCart className="h-[18px] w-[18px] text-[var(--label-secondary)]" />
                              </div>
                              <div>
                                <span className="text-[15px] font-bold text-[var(--ios-blue)] block leading-[20px]">
                                  {order.poNumber}
                                </span>
                                <span className="text-[13px] text-[var(--label-secondary)] mt-0.5 block">
                                  {order.vendorName}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <span className="text-[15px] font-medium text-[var(--label-primary)]">
                              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <span className="text-[15px] font-semibold text-[var(--label-primary)]">
                              {formatCurrency(order.totalAmount)}
                            </span>
                            <span className="text-[11px] text-[var(--label-tertiary)] block">
                              Tax: {formatCurrency(order.taxAmount)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <IOSBadge color={statusConfig.color} variant="tinted" dot size="medium">
                              {statusConfig.label}
                            </IOSBadge>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <span className="text-[13px] text-[var(--label-secondary)]">
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
                                  className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center hover:bg-[var(--fill-tertiary)] transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="h-[18px] w-[18px] text-[var(--label-secondary)]" />
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
                                    className="rounded-[8px] text-[var(--ios-blue)]"
                                  >
                                    <Send className="mr-2 h-4 w-4" /> Mark as Ordered
                                  </DropdownMenuItem>
                                )}
                                {(order.status === "Pending" || order.status === "Ordered") && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(order.id, "Received")}
                                    className="rounded-[8px] text-[var(--ios-green)]"
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Received
                                  </DropdownMenuItem>
                                )}
                                {order.status !== "Received" && isAdmin && (
                                  <DropdownMenuItem
                                    className="text-[var(--ios-red)] rounded-[8px]"
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
            <IOSCard variant="elevated" padding="none" className="overflow-hidden glass-premium !rounded-[20px]">
              <Table>
                <TableHeader>
                  <TableRow className="glass-table-header hover:bg-transparent border-b border-white/[0.07]">
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--label-secondary)] uppercase tracking-wide pl-5">
                      Vendor & Contact
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--label-secondary)] uppercase tracking-wide">
                      Phone
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--label-secondary)] uppercase tracking-wide">
                      Email
                    </TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--label-secondary)] uppercase tracking-wide">
                      GSTIN
                    </TableHead>
                    <TableHead className="w-[80px] py-3" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--fill-tertiary)] shimmer" /></TableCell>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--fill-tertiary)] shimmer" /></TableCell>
                        <TableCell><div className="h-12 w-full rounded-[10px] bg-[var(--fill-tertiary)] shimmer" /></TableCell>
                        <TableCell><div className="h-8 w-20 rounded-[6px] bg-[var(--fill-tertiary)] shimmer" /></TableCell>
                        <TableCell><div className="h-8 w-8 rounded-full bg-[var(--fill-tertiary)] shimmer" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredVendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-[56px] h-[56px] rounded-[14px] bg-[var(--fill-tertiary)] flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-[var(--label-tertiary)]" />
                          </div>
                          <p className="text-[17px] font-medium text-[var(--label-secondary)]">No vendors added</p>
                          <p className="text-[13px] text-[var(--label-tertiary)]">Add your first vendor to start purchasing</p>
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
                        className="group glass-table-row hover:bg-[var(--fill-quaternary)] border-b border-[var(--border-card)] transition-colors"
                      >
                        <TableCell className="py-3.5 pl-5">
                          <div className="flex items-center gap-3">
                            <div className="w-[40px] h-[40px] rounded-[10px] bg-[rgba(88,86,214,0.1)] flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-[18px] w-[18px] text-[var(--ios-indigo)]" />
                            </div>
                            <div>
                              <span className="text-[15px] font-semibold text-[var(--label-primary)] block leading-[20px]">
                                {vendor.name}
                              </span>
                              <span className="text-[13px] text-[var(--label-secondary)] block mt-0.5">
                                {vendor.contactPerson}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-[15px] text-[var(--ios-blue)] font-medium">{vendor.phone}</span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-[13px] text-[var(--label-secondary)]">{vendor.email || "—"}</span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-[13px] text-[var(--label-secondary)] font-mono">{vendor.gstin || "—"}</span>
                        </TableCell>
                        <TableCell className="py-3.5 text-right pr-4">
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center hover:bg-[var(--fill-tertiary)] transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="h-[18px] w-[18px] text-[var(--label-secondary)]" />
                                </motion.button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-[12px]">
                                <DropdownMenuItem
                                  className="text-[var(--ios-red)] rounded-[8px]"
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
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[24px] border-white/10 glass-dialog">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle className="text-[20px] font-bold text-[var(--label-primary)]">
                  New Vendor
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleVendorSubmit} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-[var(--label-secondary)]">Vendor Name *</Label>
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
                    <Label className="text-[13px] text-[var(--label-secondary)]">Contact Person *</Label>
                    <Input
                      value={vendorForm.contactPerson}
                      onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                      placeholder="Full name"
                      required
                      className="glass-input h-[44px] px-3"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--label-secondary)]">Phone *</Label>
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
                    <Label className="text-[13px] text-[var(--label-secondary)]">Email</Label>
                    <Input
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      placeholder="vendor@company.com"
                      className="glass-input h-[44px] px-3"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--label-secondary)]">GSTIN</Label>
                    <Input
                      value={vendorForm.gstin}
                      onChange={(e) => setVendorForm({ ...vendorForm, gstin: e.target.value })}
                      placeholder="22AAAAA0000A1Z5"
                      className="glass-input h-[44px] px-3"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-[var(--label-secondary)]">Address</Label>
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
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-[24px] border-white/10 glass-dialog">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle className="text-[20px] font-bold text-[var(--label-primary)]">
                  New Purchase Order
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePOSubmit} className="space-y-5 pt-4">
                {/* Vendor Select */}
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-[var(--label-secondary)]">Select Vendor *</Label>
                  <select
                    value={poVendorId}
                    onChange={(e) => setPoVendorId(e.target.value)}
                    required
                    className="w-full h-[44px] rounded-[10px] bg-[var(--fill-tertiary)] px-3 text-[15px] text-[var(--label-primary)] outline-none border-none focus:ring-2 focus:ring-[var(--ios-blue)] transition-shadow appearance-none cursor-pointer"
                  >
                    <option value="">Choose vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {v.contactPerson}
                      </option>
                    ))}
                  </select>
                  {vendors.length === 0 && (
                    <p className="text-[12px] text-[var(--ios-orange)]">
                      No vendors found. Add a vendor first.
                    </p>
                  )}
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px] font-semibold text-[var(--label-primary)]">Materials *</Label>
                    <button
                      type="button"
                      onClick={addPOItem}
                      className="text-[13px] text-[var(--ios-blue)] font-medium hover:underline cursor-pointer"
                    >
                      + Add Item
                    </button>
                  </div>

                  {poItems.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-[12px] bg-[var(--fill-quaternary)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-[var(--label-tertiary)] uppercase">
                          Item {idx + 1}
                        </span>
                        {poItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePOItem(idx)}
                            className="p-1 hover:bg-[var(--fill-tertiary)] rounded-[6px] cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5 text-[var(--ios-red)]" />
                          </button>
                        )}
                      </div>
                      <select
                        value={item.inventoryItemId}
                        onChange={(e) => updatePOItem(idx, "inventoryItemId", e.target.value)}
                        className="w-full h-[40px] rounded-[8px] bg-[var(--fill-tertiary)] px-3 text-[14px] text-[var(--label-primary)] outline-none border-none focus:ring-2 focus:ring-[var(--ios-blue)] appearance-none cursor-pointer"
                      >
                        <option value="">Select material...</option>
                        {inventoryItems.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} ({inv.quantity} {inv.unit} in stock)
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[11px] text-[var(--label-tertiary)]">Qty</Label>
                          <NumericInput
                            value={item.quantity}
                            onValueChange={(v) => updatePOItem(idx, "quantity", v)}
                            placeholder="0"
                            allowDecimal
                            min={0}
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-[var(--label-tertiary)]">Unit</Label>
                          <Input
                            value={item.unit}
                            onChange={(e) => updatePOItem(idx, "unit", e.target.value)}
                            className="glass-input h-[40px] px-2 text-[14px]"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-[var(--label-tertiary)]">₹/Unit</Label>
                          <NumericInput
                            value={item.unitPrice}
                            onValueChange={(v) => updatePOItem(idx, "unitPrice", v)}
                            placeholder="0.00"
                            prefix="₹"
                            allowDecimal
                            min={0}
                          />
                        </div>
                      </div>
                      {item.quantity && item.unitPrice && (
                        <div className="text-right text-[13px] font-semibold text-[var(--ios-blue)]">
                          Line Total: {formatCurrency(parseNumericValue(item.quantity) * parseNumericValue(item.unitPrice))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tax & Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--label-secondary)]">Tax %</Label>
                    <NumericInput
                      value={poTaxPercent}
                      onValueChange={setPoTaxPercent}
                      placeholder="18"
                      allowDecimal
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--label-secondary)]">Notes</Label>
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
                  <div className="p-3 rounded-[12px] bg-[rgba(0,122,255,0.06)] border border-[var(--ios-blue)]/20">
                    <div className="flex justify-between text-[13px] text-[var(--label-secondary)]">
                      <span>Subtotal</span>
                      <span>
                        {formatCurrency(
                          poItems.reduce((a, i) => a + parseNumericValue(i.quantity) * parseNumericValue(i.unitPrice), 0),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px] text-[var(--label-secondary)] mt-1">
                      <span>Tax ({poTaxPercent}%)</span>
                      <span>
                        {formatCurrency(
                          poItems.reduce((a, i) => a + parseNumericValue(i.quantity) * parseNumericValue(i.unitPrice), 0) *
                            (parseNumericValue(poTaxPercent, 18) / 100),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-[17px] font-bold text-[var(--label-primary)] mt-2 pt-2 border-t border-[var(--border-card)]">
                      <span>Total</span>
                      <span className="text-[var(--ios-blue)]">
                        {formatCurrency(
                          poItems.reduce((a, i) => a + parseNumericValue(i.quantity) * parseNumericValue(i.unitPrice), 0) *
                            (1 + parseNumericValue(poTaxPercent, 18) / 100),
                        )}
                      </span>
                    </div>
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <button type="submit" className="glow-btn w-full h-[50px] text-[17px] flex items-center justify-center gap-2">
                    <ShoppingCart className="h-5 w-5" /> Create Purchase Order
                  </button>
                </DialogFooter>
              </form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ════════════ ORDER DETAIL DIALOG ════════════ */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[24px] border-white/10 glass-dialog">
          {detailOrder && (
            <ScrollArea className="max-h-[90vh]">
              <div className="p-6 space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-[20px] font-bold text-[var(--label-primary)]">
                    {detailOrder.poNumber}
                  </DialogTitle>
                  <DialogDescription className="text-[15px] text-[var(--label-secondary)]">
                    Vendor: {detailOrder.vendorName}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-2">
                  <IOSBadge color={STATUS_CONFIG[detailOrder.status].color} variant="tinted" size="medium">
                    {detailOrder.status}
                  </IOSBadge>
                  <span className="text-[13px] text-[var(--label-tertiary)]">
                    Created: {new Date(detailOrder.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                  <h4 className="text-[13px] font-semibold text-[var(--label-secondary)] uppercase tracking-wide">
                    Materials
                  </h4>
                  {detailOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-[10px] bg-[var(--fill-quaternary)]"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-[var(--label-tertiary)]" />
                        <div>
                          <span className="text-[14px] font-medium text-[var(--label-primary)] block">
                            {item.materialName}
                          </span>
                          <span className="text-[12px] text-[var(--label-tertiary)]">
                            {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                          </span>
                        </div>
                      </div>
                      <span className="text-[14px] font-semibold text-[var(--label-primary)]">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="p-3 rounded-[12px] bg-[var(--fill-quaternary)] space-y-1">
                  <div className="flex justify-between text-[13px] text-[var(--label-secondary)]">
                    <span>Subtotal</span>
                    <span>{formatCurrency(detailOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-[var(--label-secondary)]">
                    <span>Tax</span>
                    <span>{formatCurrency(detailOrder.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[17px] font-bold text-[var(--label-primary)] pt-2 border-t border-[var(--border-card)]">
                    <span>Total</span>
                    <span className="text-[var(--ios-blue)]">{formatCurrency(detailOrder.totalAmount)}</span>
                  </div>
                </div>

                {detailOrder.notes && (
                  <div className="text-[13px] text-[var(--label-tertiary)]">
                    <span className="font-medium">Notes:</span> {detailOrder.notes}
                  </div>
                )}

                {detailOrder.orderedAt && (
                  <div className="text-[13px] text-[var(--label-tertiary)]">
                    Ordered: {new Date(detailOrder.orderedAt).toLocaleDateString("en-IN")}
                  </div>
                )}
                {detailOrder.receivedAt && (
                  <div className="text-[13px] text-[var(--ios-green)] font-medium">
                    ✓ Received: {new Date(detailOrder.receivedAt).toLocaleDateString("en-IN")}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════ DELETE CONFIRM ════════════ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-[350px] rounded-[24px] border-white/10 glass-dialog">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-[var(--label-primary)]">
              Delete {deleteTarget?.type === "order" ? "Purchase Order" : "Vendor"}
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[var(--label-secondary)]">
              Are you sure? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <IOSButton variant="gray" size="large" onClick={() => setIsDeleteDialogOpen(false)} fullWidth>
              Cancel
            </IOSButton>
            <IOSButton variant="destructive" size="large" onClick={handleDelete} fullWidth>
              Delete
            </IOSButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
