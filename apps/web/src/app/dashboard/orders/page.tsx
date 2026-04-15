"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit2,
  Box,
  Download,
  AlertCircle,
  X,
  IndianRupee,
  Factory,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  ClipboardList,
  Timer,
  Inbox,
  ChevronRight,
  Activity,
  Layers,
  Cpu,
  Users2,
  ArrowUpRight,
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  generatePurchaseOrderPDF,
  generateDataExportPDF,
  type CompanyInfo as PDFCompanyInfo,
  type PurchaseOrderData,
} from "@/lib/pdf-generator";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/hooks/use-role";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NumericInput, parseNumericValue } from "@/components/ui/numeric-input";
import { motion } from "framer-motion";
import { exportToExcel } from "@/lib/excel-export";
import { IOSCard } from "@/components/ui/ios/IOSCard";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { staggerContainer, staggerItem } from "@/styles/animations";
import { StatWidget } from "@/components/ui/StatWidget";
import { TogglePill } from "@/components/ui/glass";

// ─── React Query Hooks ──────────────────────────────────
import {
  useOrders,
  useClients,
  useInventory,
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
  useRecordPayment,
  useUpdateOrderStatus,
} from "@/lib/hooks/use-orders";

function OrdersContent() {
  const { role, isAdmin, isStaff, isPro, loading: roleLoading } = useRole();

  // ─── React Query: data fetching ────────────────────────
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
    error: ordersErrorObj,
  } = useOrders();
  const { data: clients = [] } = useClients();
  const { data: inventory = [] } = useInventory();

  // ─── React Query: mutations ────────────────────────────
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const recordPayment = useRecordPayment();
  const updateOrderStatus = useUpdateOrderStatus();

  // ─── Local UI state ────────────────────────────────────
  const [clientProducts, setClientProducts] = useState<any[]>([]);
  const [clientProductMaterials, setClientProductMaterials] = useState<any[]>(
    [],
  );
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] =
    useState(false);
  const [orderToDeleteId, setOrderToDeleteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // ─── URL-based status filtering ────────────────────────
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [paymentFormData, setPaymentFormData] = useState({
    amount: "",
    payment_mode: "Bank Transfer",
    payment_date: new Date().toISOString().split("T")[0],
    transaction_ref: "",
    tds_applicable: false,
    tds_rate: "",
    notes: "",
  });

  const starterLimit = 5;
  const isDev = process.env.NODE_ENV === "development";
  const isAtLimit =
    !isDev && !isAdmin && !isPro && orders.length >= starterLimit;

  const handleAddNewClick = () => {
    if (isAtLimit) {
      toast.error(
        `Starter tier limit reached (${starterLimit} orders). Upgrade to Pro for unlimited.`,
        {
          action: {
            label: "Upgrade",
            onClick: () => (window.location.href = "/dashboard/upgrade"),
          },
        },
      );
      return;
    }
    setIsDialogOpen(true);
  };

  const exportToPDF = () => {
    const headers = [
      "Product",
      "Client",
      "Qty",
      "Rate",
      "Total",
      "Status",
      "Delivery",
    ];
    const rows = orders.map((order: any) => [
      order.product_name || order.productName,
      order.client?.name || order.clients?.name || "—",
      String(order.quantity),
      `₹${Number(order.rate).toLocaleString("en-IN")}`,
      `₹${Number(order.total_amount || order.totalAmount).toLocaleString("en-IN")}`,
      order.status,
      order.delivery_date || order.deliveryDate
        ? new Date(
            order.delivery_date || order.deliveryDate,
          ).toLocaleDateString("en-IN")
        : "—",
    ]);
    generateDataExportPDF({
      title: "Orders & Production Report",
      subtitle: "Complete list of all production orders",
      headers,
      rows,
      filename: `orders_${new Date().toISOString().split("T")[0]}.pdf`,
    });
    toast.success("Orders report PDF downloaded!");
  };

  const exportToXLSX = () => {
    const columns = [
      { header: "Order ID", key: "order_id" },
      { header: "Client", key: "client_name" },
      { header: "Status", key: "status" },
      { header: "Amount", key: "total_amount" },
      { header: "Date", key: "date_formatted" },
    ];

    const dataToExport = orders.map((order: any) => ({
      order_id: order?.id ?? "",
      client_name: order?.client?.name || order?.clients?.name || "—",
      status: order?.status ?? "",
      total_amount: order?.total_amount ?? order?.totalAmount ?? 0,
      date_formatted: order?.createdAt
        ? new Date(order.createdAt).toLocaleDateString("en-IN")
        : "—",
    }));

    exportToExcel(
      `orders_${new Date().toISOString().split("T")[0]}.xlsx`,
      "Orders",
      dataToExport,
      columns,
    );
    toast.success("Orders Excel downloaded!");
  };

  const [formData, setFormData] = useState({
    client_id: "",
    product_name: "",
    quantity: "" as string,
    unit: "kg",
    material_source: "own" as "own" | "client",
    rate: "" as string,
    delivery_date: "",
    status: "pending",
    payment_status: "pending",
    order_items: [] as { inventory_id: string; quantity_deducted: string }[],
  });

  const fetchClientProducts = async (clientId: string) => {
    if (!clientId) {
      setClientProducts([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/products`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setClientProducts(json.data || []);
    } catch (error) {
      console.error("Failed to fetch client products:", error);
      setClientProducts([]);
    }
  };

  const fetchMaterialsForProduct = async (
    clientId: string,
    productId: string,
  ) => {
    setIsLoadingMaterials(true);
    try {
      const res = await fetch(
        `/api/v1/clients/${clientId}/products/${productId}/materials`,
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setClientProductMaterials(json.data || []);
    } catch (error) {
      setClientProductMaterials([]);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      product_name: "",
      quantity: "",
      unit: "kg",
      material_source: "own",
      rate: "",
      delivery_date: "",
      status: "pending",
      payment_status: "pending",
      order_items: [],
    });
    setClientProducts([]);
    setClientProductMaterials([]);
    setCurrentOrder(null);
  };

  const openEditDialog = (order: any) => {
    if (!order) return;
    setCurrentOrder(order);
    setFormData({
      client_id: order.clientId ?? "",
      product_name: order.productName ?? order.product_name ?? "",
      quantity: order.quantity ? String(order.quantity) : "",
      unit: order.unit ?? "kg",
      material_source: order.materialSource ?? "own",
      rate: order.rate ? String(order.rate) : "",
      delivery_date: order.deliveryDate
        ? new Date(order.deliveryDate).toISOString().split("T")[0]
        : "",
      status: order.status,
      payment_status: order.paymentStatus,
      order_items: [],
    });
    if (order.clientId) {
      fetchClientProducts(order.clientId).then(() => {
        // Find if this product exists to fetch materials
        fetch(`/api/v1/clients/${order.clientId}/products`)
          .then((r) => r.json())
          .then((json) => {
            const matched = (json.data || []).find(
              (p: any) => p.name === order.productName,
            );
            if (matched) fetchMaterialsForProduct(order.clientId, matched.id);
          });
      });
    }
    setIsDialogOpen(true);
  };

  const handleClientChange = (clientId: string) => {
    // Keep existing form data except reset client, product, rate and deduction items
    setFormData({
      ...formData,
      client_id: clientId,
      product_name: "",
      rate: "",
      order_items: [],
    });
    // Refetch the client products
    fetchClientProducts(clientId);
    setClientProductMaterials([]);
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const matchedProduct = clientProducts.find((p) => p.name === name);
    if (matchedProduct) {
      setFormData((prev) => {
        fetchMaterialsForProduct(prev.client_id, matchedProduct.id);
        return {
          ...prev,
          product_name: name,
          rate: String(matchedProduct.defaultRate || ""),
          order_items: [],
        };
      });
    } else {
      setFormData((prev) => ({ ...prev, product_name: name, order_items: [] }));
      setClientProductMaterials([]);
    }
  };

  const addDeductionRow = () => {
    setFormData({
      ...formData,
      order_items: [
        ...formData.order_items,
        { inventory_id: "", quantity_deducted: "" },
      ],
    });
  };

  const removeDeductionRow = (index: number) => {
    const items = [...formData.order_items];
    items.splice(index, 1);
    setFormData({ ...formData, order_items: items });
  };

  const updateDeductionRow = (index: number, field: string, value: any) => {
    const items = [...formData.order_items];
    items[index] = { ...items[index], [field]: value };
    setFormData({ ...formData, order_items: items });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) return toast.error("Select a client");
    if (!formData.product_name) return toast.error("Product name is required");
    if (!currentOrder && formData.order_items.length === 0)
      return toast.error("At least one inventory item must be deducted");

    const qty = parseNumericValue(formData.quantity);
    const rate = parseNumericValue(formData.rate);

    const sourceMaterials =
      formData.material_source === "own" ? inventory : clientProductMaterials;
    for (const item of formData.order_items) {
      if (!item.inventory_id) return toast.error("Select material to deduct");
      const deducted = parseNumericValue(item.quantity_deducted);
      const invItem = sourceMaterials.find(
        (i: any) => i.id === item.inventory_id,
      );
      if (!invItem || invItem.quantity < deducted) {
        return toast.error(
          `Insufficient stock for ${invItem?.name || "Material"}`,
        );
      }
    }

    const total_amount = qty * rate;
    const orderPayload = {
      client_id: formData.client_id,
      product_name: formData.product_name,
      quantity: qty,
      unit: formData.unit,
      material_source: formData.material_source,
      rate,
      total_amount,
      delivery_date: formData.delivery_date || null,
      status: formData.status,
      payment_status: formData.payment_status,
      order_items: formData.order_items.map((item) => ({
        inventory_id: item.inventory_id,
        quantity_deducted: parseNumericValue(item.quantity_deducted),
      })),
    };

    if (currentOrder) {
      updateOrder.mutate(
        { id: currentOrder.id, payload: orderPayload },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            resetForm();
          },
        },
      );
    } else {
      createOrder.mutate(orderPayload, {
        onSuccess: () => {
          setIsDialogOpen(false);
          resetForm();
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteOrder.mutate(id, {
      onSettled: () => {
        setIsDeleteDialogOpenConfirm(false);
        setOrderToDeleteId(null);
      },
    });
  };

  const openPaymentDialog = (order: any) => {
    setCurrentOrder(order);
    const balance = order.totalAmount - (order.totalPaid || 0);
    setPaymentFormData({
      amount: String(balance > 0 ? balance : 0),
      payment_mode: "Bank Transfer",
      payment_date: new Date().toISOString().split("T")[0],
      transaction_ref: "",
      tds_applicable: false,
      tds_rate: "",
      notes: "",
    });
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder) return;
    recordPayment.mutate(
      {
        reference_type: "SalesOrder",
        reference_id: currentOrder.id,
        party_type: "Customer",
        party_id: currentOrder.clientId,
        amount: Number(paymentFormData.amount),
        payment_mode: paymentFormData.payment_mode,
        payment_date: paymentFormData.payment_date,
        transaction_ref: paymentFormData.transaction_ref,
        tds_applicable: paymentFormData.tds_applicable,
        tds_rate: Number(paymentFormData.tds_rate) || 0,
        notes: paymentFormData.notes,
      },
      {
        onSuccess: () => {
          setIsPaymentDialogOpen(false);
        },
      },
    );
  };

  const generateInvoice = async (order: any) => {
    try {
      let companyData: PDFCompanyInfo | null = null;
      try {
        const res = await fetch("/api/profile/company");
        const data = await res.json();
        if (data.company) companyData = data.company;
      } catch {}
      const poData: PurchaseOrderData = {
        orderId: order.id,
        orderDate: order.createdAt,
        clientName: order.client?.name || "N/A",
        clientAddress: order.client?.address || undefined,
        productName: order.productName,
        quantity: order.quantity,
        rate: order.rate,
        totalAmount: order.totalAmount,
        status: order.status,
        deliveryDate: order.deliveryDate || undefined,
      };
      await generatePurchaseOrderPDF(poData, companyData);
      toast.success("Purchase order PDF downloaded");
    } catch (error) {
      console.error("PO PDF error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    const search = (searchTerm ?? "").trim().toLowerCase();

    return orders.filter((order: any) => {
      if (!order) return false;

      // ── Status filter (from URL params) ───────────────
      const status = String(order.status ?? "").toLowerCase();
      if (statusFilter) {
        if (statusFilter === "active" && status === "completed") return false;
        if (statusFilter === "production" && status !== "processing") return false;
        if (statusFilter === "completed" && status !== "completed") return false;
      }

      // ── Search filter ─────────────────────────────────
      if (!search) return true; // no search term → keep all

      const productName = String(order.productName ?? order.product_name ?? "").toLowerCase();
      const clientName  = String(order.client?.name ?? order.clients?.name ?? "").toLowerCase();
      const orderId     = String(order.id ?? "").toLowerCase();

      return (
        productName.includes(search) ||
        clientName.includes(search) ||
        orderId.includes(search)
      );
    });
  }, [orders, searchTerm, statusFilter]);

  // ─── Payment Status Color Helper ─────────────────────
  const getPaymentBadgeColor = (
    status: string,
  ): "green" | "orange" | "red" | "gray" => {
    if (status === "paid" || status === "Paid") return "green";
    if (status === "Overdue") return "red";
    return "orange";
  };

  // ─── Mutation pending state (for disabling buttons) ───
  const isMutating =
    createOrder.isPending ||
    updateOrder.isPending ||
    deleteOrder.isPending ||
    recordPayment.isPending ||
    updateOrderStatus.isPending;

  // ─── Status helpers ───────────────────────────────────
  const getStatusBadgeColor = (status: string): "green" | "orange" | "gray" => {
    if (status === "completed") return "green";
    if (status === "processing") return "orange";
    return "gray";
  };

  const getStatusLabel = (status: string): string => {
    if (status === "completed") return "COMPLETED";
    if (status === "processing") return "IN PRODUCTION";
    return "PENDING";
  };

  const STATUS_OPTIONS = [
    { value: "pending", label: "Pending", color: "var(--label-tertiary)" },
    { value: "processing", label: "In Production", color: "var(--ios-orange)" },
    { value: "completed", label: "Completed", color: "var(--ios-green)" },
  ] as const;

  const handleStatusChange = (
    orderId: string,
    currentStatus: string,
    newStatus: string,
  ) => {
    if (currentStatus === "completed" || currentStatus === newStatus) return;
    setUpdatingOrderId(orderId);
    updateOrderStatus.mutate(
      { id: orderId, status: newStatus },
      { onSettled: () => setUpdatingOrderId(null) },
    );
  };

  // ─── Memoized KPI stats (prevent recalc on every render) ─────
  const orderStats = useMemo(() => {
    if (!Array.isArray(orders)) return { total: 0, pending: 0, processing: 0, completed: 0, revenue: 0, pendingPayment: 0 };
    return {
      total: orders.length,
      pending: orders.filter((o: any) => o?.status === "pending").length,
      processing: orders.filter((o: any) => o?.status === "processing").length,
      completed: orders.filter((o: any) => o?.status === "completed").length,
      revenue: orders.reduce((acc: number, o: any) => acc + Number(o?.totalAmount || 0), 0),
      pendingPayment: orders.filter((o: any) => o?.paymentStatus !== "paid" && o?.paymentStatus !== "Paid").length,
    };
  }, [orders]);


  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* ── Header ── */}
      <motion.div
        variants={staggerItem}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-[34px] font-bold text-[var(--label-primary)] leading-[41px] tracking-[0.37px]">
            Orders & Production
          </h1>
          <p className="text-[15px] text-[var(--label-secondary)] mt-1 leading-[20px] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--ios-blue)]" />{" "}
            Integrated material flow
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* PDF Export — Owner only */}
          {!isStaff && (
            <button
              onClick={exportToPDF}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-[rgba(255,255,255,0.08)] hover:bg-white/15 text-white text-xs font-medium cursor-pointer transition-all duration-150"
              title="Print PDF"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <rect width="24" height="24" rx="4" fill="#FF0000" />
                <text
                  x="12"
                  y="15"
                  textAnchor="middle"
                  fontFamily="Arial"
                  fontWeight="bold"
                  fontSize="8"
                  fill="#fff"
                >
                  PDF
                </text>
              </svg>
              <span>PDF</span>
            </button>
          )}
          {/* Excel Export — Owner only */}
          {!isStaff && (
            <button
              onClick={exportToXLSX}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-[rgba(255,255,255,0.08)] hover:bg-white/15 text-white text-xs font-medium cursor-pointer transition-all duration-150"
              title="Excel Export"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <rect width="24" height="24" rx="4" fill="#217346" />
                <path
                  d="M14 3v5h4"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1"
                  opacity="0.5"
                />
                <text
                  x="12"
                  y="15"
                  textAnchor="middle"
                  fontFamily="Arial"
                  fontWeight="bold"
                  fontSize="8"
                  fill="#fff"
                >
                  XLS
                </text>
              </svg>
              <span>Export</span>
            </button>
          )}
          <IOSButton
            variant="filled"
            color="blue"
            size="medium"
            onClick={handleAddNewClick}
            className="shadow-[var(--shadow-sm)]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Order
          </IOSButton>
        </div>
      </motion.div>

      {/* ── Search Bar (ALWAYS visible) ── */}
      <motion.div
        variants={staggerItem}
        className="flex items-center gap-2 mb-6"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-[var(--label-tertiary)]" />
          <input
            placeholder="Filter by product or client..."
            className="glass-input w-full h-[36px] pr-4 pl-[34px] text-[15px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="text-[13px] text-[var(--label-tertiary)]">
          {filteredOrders.length} orders
        </span>
      </motion.div>

        {/* ─── Error State Banner ── */}
        {ordersError && (
          <motion.div
            variants={staggerItem}
            className="flex items-center gap-3 p-4 rounded-[16px] border border-[var(--ios-red)]/20 bg-[rgba(255,59,48,0.06)]"
          >
            <div className="w-[40px] h-[40px] rounded-[12px] bg-[rgba(255,59,48,0.10)] flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-[18px] w-[18px] text-[var(--ios-red)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-[var(--label-primary)]">
                Failed to load orders
              </p>
              <p className="text-[13px] text-[var(--label-secondary)] mt-0.5 truncate">
                {ordersErrorObj?.message || "Unknown error — please try refreshing."}
              </p>
            </div>
            <IOSButton
              variant="filled"
              color="blue"
              size="small"
              onClick={() => window.location.reload()}
            >
              Retry
            </IOSButton>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════
        ── LOADING STATE ──
        ═══════════════════════════════════════════════════════ */}
        {roleLoading || ordersLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--ios-blue)]/20 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-[var(--ios-blue)] animate-spin" />
              </div>
              <p className="text-[13px] text-[var(--label-secondary)]">
                Loading...
              </p>
            </div>
          </div>
        ) : isStaff ? (
          <motion.div initial="initial" animate="animate" variants={staggerContainer} className="w-full">
            {/* 3-Column Grid: Orders (30%) | Widgets (40%) | Production (30%) */}
            <div className="grid grid-cols-1 lg:grid-cols-[30fr_40fr_30fr] gap-5">
              {/* ── LEFT: Orders Panel ── */}
              <motion.div variants={staggerItem} className="order-2 lg:order-1">
                <IOSCard variant="elevated" padding="lg" className="h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[17px] font-bold text-[var(--label-primary)] leading-[22px]">
                        Orders
                      </h3>
                      <p className="text-[13px] text-[var(--label-tertiary)] mt-0.5">
                        {filteredOrders.length} total
                      </p>
                    </div>
                  </div>
                  <div className="max-h-[460px] overflow-y-auto pr-1 staff-scroll">
                    {/* Status summary */}
                    <div className="space-y-1 mb-4">
                      {[
                        {
                          icon: Inbox,
                          label: "Pending",
                          count: orderStats.pending,
                          color: "orange" as const,
                        },
                        {
                          icon: Timer,
                          label: "In Progress",
                          count: orderStats.processing,
                          color: "blue" as const,
                        },
                        {
                          icon: CheckCircle2,
                          label: "Done",
                          count: orderStats.completed,
                          color: "green" as const,
                        },
                      ].map((item, i, arr) => (
                        <div key={item.label}>
                          <div className="flex items-center gap-3 p-2.5 rounded-[12px] hover:bg-[var(--fill-quaternary)] transition-all">
                            <div
                              className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center flex-shrink-0"
                              style={{
                                background:
                                  item.color === "orange"
                                    ? "rgba(255,149,0,0.10)"
                                    : item.color === "blue"
                                      ? "rgba(0,122,255,0.10)"
                                      : "rgba(52,199,89,0.10)",
                              }}
                            >
                              <item.icon
                                className="h-[15px] w-[15px]"
                                style={{
                                  color:
                                    item.color === "orange"
                                      ? "var(--ios-orange)"
                                      : item.color === "blue"
                                        ? "var(--ios-blue)"
                                        : "var(--ios-green)",
                                }}
                              />
                            </div>
                            <span className="text-[14px] font-medium text-[var(--label-primary)] flex-1">
                              {item.label}
                            </span>
                            <span
                              className="text-[13px] font-semibold tabular-nums px-2 py-0.5 rounded-full"
                              style={{
                                background:
                                  item.color === "orange"
                                    ? "rgba(255,149,0,0.10)"
                                    : item.color === "blue"
                                      ? "rgba(0,122,255,0.10)"
                                      : "rgba(52,199,89,0.10)",
                                color:
                                  item.color === "orange"
                                    ? "var(--ios-orange)"
                                    : item.color === "blue"
                                      ? "var(--ios-blue)"
                                      : "var(--ios-green)",
                              }}
                            >
                              {item.count}
                            </span>
                          </div>
                          {i < arr.length - 1 && (
                            <div className="h-px bg-[var(--border-divider)] mx-3" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Recent Orders List */}
                    <div className="border-t border-[var(--border-divider)] pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--label-tertiary)] px-1 mb-2">
                        Recent Orders
                      </p>
                      {filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-[40px] h-[40px] rounded-[12px] bg-[rgba(0,122,255,0.08)] flex items-center justify-center mb-3">
                            <ClipboardList className="h-[18px] w-[18px] text-[var(--ios-blue)]" />
                          </div>
                          <p className="text-[13px] font-medium text-[var(--label-secondary)]">
                            No orders found
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {filteredOrders
                            .slice(0, 5)
                            .map((order: any, idx: number) => (
                              <div key={order.id ?? idx}>
                                <motion.div
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    delay: 0.1 + idx * 0.04,
                                    duration: 0.3,
                                  }}
                                  className="flex items-center gap-2.5 p-2.5 rounded-[10px] hover:bg-[var(--fill-quaternary)] transition-colors cursor-pointer group"
                                >
                                  {/* Priority dot */}
                                  <div
                                    className={cn(
                                      "w-[5px] h-[5px] rounded-full flex-shrink-0",
                                      (order.status ?? "") === "completed"
                                        ? "bg-[var(--ios-green)]"
                                        : (order.status ?? "") === "processing"
                                          ? "bg-[var(--ios-blue)]"
                                          : "bg-[var(--ios-orange)]",
                                    )}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-[var(--label-primary)] truncate">
                                      {order.productName ?? order.product_name ?? "—"}
                                    </p>
                                    <p className="text-[11px] text-[var(--label-tertiary)] truncate">
                                      {order.client?.name ?? order.clients?.name ?? "—"} ·{" "}
                                      {order.quantity ?? 0} {order.unit ?? "kg"}
                                    </p>
                                  </div>
                                  <span
                                    className={cn(
                                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize whitespace-nowrap",
                                      order.status === "completed"
                                        ? "bg-[rgba(52,199,89,0.12)] text-[var(--ios-green)]"
                                        : order.status === "processing"
                                          ? "bg-[rgba(0,122,255,0.12)] text-[var(--ios-blue)]"
                                          : "bg-[rgba(255,149,0,0.12)] text-[var(--ios-orange)]",
                                    )}
                                  >
                                    {getStatusLabel(order.status)}
                                  </span>
                                </motion.div>
                                {idx <
                                  Math.min(filteredOrders.length, 5) - 1 && (
                                  <div className="h-px bg-[var(--border-divider)] mx-3" />
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </IOSCard>
              </motion.div>

              {/* ── CENTER: Summary Widgets ── */}
              <motion.div
                variants={staggerItem}
                className="flex flex-col items-center justify-center gap-5 order-1 lg:order-2 py-2 lg:py-0"
              >
                {/* Total Orders */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.05,
                    duration: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group relative overflow-hidden rounded-[16px] p-5 w-full max-w-[240px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow:
                      "0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 20px rgba(0,122,255,0.15)",
                  }}
                >
                  <div
                    className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-40 blur-xl"
                    style={{ background: "var(--ios-blue)" }}
                  />
                  <div className="relative flex flex-col items-center text-center gap-3">
                    <div
                      className="w-[44px] h-[44px] rounded-[13px] flex items-center justify-center"
                      style={{ background: "rgba(0,122,255,0.10)" }}
                    >
                      <ClipboardList
                        className="h-[20px] w-[20px]"
                        style={{ color: "var(--ios-blue)" }}
                      />
                    </div>
                    <div>
                      <p className="text-[28px] font-bold text-[var(--label-primary)] leading-[32px] tracking-tight">
                        {orderStats.total}
                      </p>
                      <p className="text-[12px] font-medium text-[var(--label-tertiary)] leading-[16px] mt-1">
                        Total Orders
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Completed Orders */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.1,
                    duration: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group relative overflow-hidden rounded-[16px] p-5 w-full max-w-[240px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow:
                      "0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 20px rgba(52,199,89,0.15)",
                  }}
                >
                  <div
                    className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-40 blur-xl"
                    style={{ background: "var(--ios-green)" }}
                  />
                  <div className="relative flex flex-col items-center text-center gap-3">
                    <div
                      className="w-[44px] h-[44px] rounded-[13px] flex items-center justify-center"
                      style={{ background: "rgba(52,199,89,0.10)" }}
                    >
                      <CheckCircle2
                        className="h-[20px] w-[20px]"
                        style={{ color: "var(--ios-green)" }}
                      />
                    </div>
                    <div>
                      <p className="text-[28px] font-bold text-[var(--label-primary)] leading-[32px] tracking-tight">
                        {
                          orderStats.completed
                        }
                      </p>
                      <p className="text-[12px] font-medium text-[var(--label-tertiary)] leading-[16px] mt-1">
                        Completed Orders
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* ── RIGHT: Production Panel ── */}
              <motion.div variants={staggerItem} className="order-3">
                <IOSCard variant="elevated" padding="lg" className="h-full">
                  <div className="mb-4">
                    <h3 className="text-[17px] font-bold text-[var(--label-primary)] leading-[22px]">
                      Production
                    </h3>
                    <p className="text-[13px] text-[var(--label-tertiary)] mt-0.5">
                      Status & Queue
                    </p>
                  </div>
                  <div className="max-h-[460px] overflow-y-auto pr-1 staff-scroll">
                    {/* Production status items */}
                    <div className="space-y-1">
                      {[
                        {
                          icon: Layers,
                          label: "Production Queue",
                          count: orderStats.processing,
                          color: "blue" as const,
                        },
                        {
                          icon: Activity,
                          label: "In Production",
                          count: orderStats.processing,
                          color: "orange" as const,
                        },
                        {
                          icon: Clock,
                          label: "Pending Start",
                          count: orderStats.pending,
                          color: "purple" as const,
                        },
                        {
                          icon: CheckCircle2,
                          label: "Completed",
                          count: orderStats.completed,
                          color: "green" as const,
                        },
                      ].map((item, i, arr) => (
                        <div key={item.label}>
                          <div className="flex items-center gap-3 p-2.5 rounded-[12px] hover:bg-[var(--fill-quaternary)] transition-all">
                            <div
                              className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center flex-shrink-0"
                              style={{
                                background:
                                  item.color === "blue"
                                    ? "rgba(0,122,255,0.10)"
                                    : item.color === "orange"
                                      ? "rgba(255,149,0,0.10)"
                                      : item.color === "purple"
                                        ? "rgba(88,86,214,0.10)"
                                        : "rgba(52,199,89,0.10)",
                              }}
                            >
                              <item.icon
                                className="h-[15px] w-[15px]"
                                style={{
                                  color:
                                    item.color === "blue"
                                      ? "var(--ios-blue)"
                                      : item.color === "orange"
                                        ? "var(--ios-orange)"
                                        : item.color === "purple"
                                          ? "var(--ios-indigo)"
                                          : "var(--ios-green)",
                                }}
                              />
                            </div>
                            <span className="text-[14px] font-medium text-[var(--label-primary)] flex-1">
                              {item.label}
                            </span>
                            <span
                              className="text-[13px] font-semibold tabular-nums px-2 py-0.5 rounded-full"
                              style={{
                                background:
                                  item.color === "blue"
                                    ? "rgba(0,122,255,0.10)"
                                    : item.color === "orange"
                                      ? "rgba(255,149,0,0.10)"
                                      : item.color === "purple"
                                        ? "rgba(88,86,214,0.10)"
                                        : "rgba(52,199,89,0.10)",
                                color:
                                  item.color === "blue"
                                    ? "var(--ios-blue)"
                                    : item.color === "orange"
                                      ? "var(--ios-orange)"
                                      : item.color === "purple"
                                        ? "var(--ios-indigo)"
                                        : "var(--ios-green)",
                              }}
                            >
                              {item.count}
                            </span>
                          </div>
                          {i < arr.length - 1 && (
                            <div className="h-px bg-[var(--border-divider)] mx-3" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Production Progress Bars */}
                    <div className="mt-5 pt-4 border-t border-[var(--border-divider)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--label-tertiary)] px-1 mb-3">
                        Production Progress
                      </p>
                      <div className="space-y-3 px-1">
                        {[
                          {
                            label: "Completion Rate",
                            value: orderStats.completed,
                            max: Math.max(orderStats.total, 1),
                            color: "var(--ios-green)",
                            bg: "rgba(52,199,89,0.08)",
                          },
                          {
                            label: "In Progress",
                            value: orderStats.processing,
                            max: Math.max(orderStats.total, 1),
                            color: "var(--ios-blue)",
                            bg: "rgba(0,122,255,0.08)",
                          },
                          {
                            label: "Pending",
                            value: orderStats.pending,
                            max: Math.max(orderStats.total, 1),
                            color: "var(--ios-orange)",
                            bg: "rgba(255,149,0,0.08)",
                          },
                        ].map((bar, i) => {
                          const pct =
                            bar.max > 0
                              ? Math.min((bar.value / bar.max) * 100, 100)
                              : 0;
                          return (
                            <div key={bar.label} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-[var(--label-primary)]">
                                  {bar.label}
                                </span>
                                <span
                                  className="text-[12px] font-semibold tabular-nums"
                                  style={{ color: bar.color }}
                                >
                                  {bar.value}/{bar.max}
                                </span>
                              </div>
                              <div
                                className="h-[6px] rounded-full overflow-hidden"
                                style={{ background: bar.bg }}
                              >
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ background: bar.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{
                                    delay: 0.2 + i * 0.1,
                                    duration: 0.6,
                                    ease: [0.16, 1, 0.3, 1],
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Links */}
                    <div className="mt-5 pt-4 border-t border-[var(--border-divider)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--label-tertiary)] px-1 mb-2">
                        Quick Links
                      </p>
                      <div className="space-y-0.5">
                        {[
                          {
                            label: "Production Floor",
                            icon: Activity,
                            href: "/dashboard/production",
                          },
                          {
                            label: "Inventory",
                            icon: Box,
                            href: "/dashboard/inventory",
                          },
                        ].map((link, idx, arr) => (
                          <a key={link.label} href={link.href}>
                            <div className="flex items-center gap-2.5 p-2.5 rounded-[10px] hover:bg-[var(--fill-quaternary)] transition-colors cursor-pointer group">
                              <link.icon className="h-[14px] w-[14px] text-[var(--label-tertiary)] group-hover:text-[var(--label-secondary)] transition-colors" />
                              <span className="text-[13px] font-medium text-[var(--label-primary)] flex-1">
                                {link.label}
                              </span>
                              <ChevronRight className="h-3 w-3 text-[var(--label-quaternary)] group-hover:text-[var(--label-tertiary)] transition-colors" />
                            </div>
                            {idx < arr.length - 1 && (
                              <div className="h-px bg-[var(--border-divider)] mx-3" />
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </IOSCard>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial="initial" animate="animate" variants={staggerContainer} className="space-y-6">
            {/* ═══════════════════════════════════════════════════════
            ── ADMIN/OWNER VIEW: KPI Stats + Table ──
            ═══════════════════════════════════════════════════════ */}
            {/* KPI Stats */}
            <div className="kpi-panel">
              <div className="kpi-panel__glow"></div>
              <div className="kpi-grid">
                <StatWidget
                  label="Total Orders"
                  value={orderStats.total}
                  change={0}
                  icon={Box}
                  color="blue"
                  delay={0}
                />
                <StatWidget
                  label="Total Revenue"
                  value={orderStats.revenue}
                  change={0}
                  icon={IndianRupee}
                  color="green"
                  prefix="₹"
                  delay={1}
                />
                <StatWidget
                  label="Pending Payment"
                  value={orderStats.pendingPayment}
                  change={0}
                  icon={AlertCircle}
                  color="orange"
                  delay={2}
                />
                <StatWidget
                  label="Completed"
                  value={orderStats.completed}
                  change={0}
                  icon={CheckCircle2}
                  color="green"
                  delay={3}
                />
              </div>
            </div>

            {/* ── Table (Admin/Owner only) ── */}
            <motion.div variants={staggerItem}>
              <IOSCard
                variant="elevated"
                padding="none"
                className="overflow-hidden glass-premium !rounded-[20px]"
              >
              <Table>
                <TableHeader>
                  <TableRow className="glass-table-header hover:bg-transparent border-b border-white/[0.07] dark:border-white/[0.07]">
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--label-secondary)] uppercase tracking-wide pl-5">
                      Production Order
                    </TableHead>
                    {!isStaff && (
                      <TableHead className="font-semibold py-3 text-[13px] text-[var(--label-secondary)] uppercase tracking-wide">
                        Financials
                      </TableHead>
                    )}
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--label-secondary)] uppercase tracking-wide">
                      Timeline / Status
                    </TableHead>
                    <TableHead className="w-[120px] py-3 pr-5 text-right font-semibold text-[13px] text-[var(--label-secondary)] uppercase tracking-wide">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-5">
                          <div className="h-16 w-full rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
                        </TableCell>
                        <TableCell>
                          <div className="h-16 w-full rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
                        </TableCell>
                        <TableCell>
                          <div className="h-16 w-full rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="h-10 w-10 rounded-full bg-[var(--fill-tertiary)] shimmer ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isStaff ? 3 : 4}
                        className="text-center py-16"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-[56px] h-[56px] rounded-[14px] bg-[var(--fill-tertiary)] flex items-center justify-center">
                            <Factory className="h-6 w-6 text-[var(--label-tertiary)]" />
                          </div>
                          <p className="text-[17px] font-medium text-[var(--label-secondary)]">
                            No active orders
                          </p>
                          <p className="text-[13px] text-[var(--label-tertiary)]">
                            Create your first order to start production
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order: any, index: number) => (
                      <motion.tr
                        key={order.id ?? index}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: index * 0.03,
                          duration: 0.25,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="group glass-table-row hover:bg-[var(--fill-quaternary)] border-b border-[var(--border-card)] transition-colors"
                      >
                        <TableCell className="pl-5 py-4">
                          <div className="flex flex-col">
                            <span className="text-[17px] font-bold text-[var(--label-primary)] leading-[22px]">
                              {order.productName ?? order.product_name ?? "—"}
                            </span>
                            <span className="text-[13px] text-[var(--label-secondary)] mt-0.5">
                              Client: {order.client?.name ?? order.clients?.name ?? "—"}
                            </span>
                            <div className="flex items-center gap-2 mt-1.5">
                              <IOSBadge
                                color="gray"
                                variant="tinted"
                                size="small"
                              >
                                {order.quantity ?? 0} {order.unit ?? "kg"}
                              </IOSBadge>
                              <span className="text-[11px] text-[var(--label-quaternary)] font-mono uppercase">
                                {(order.id ?? "").slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        {/* Financials column — Owner only */}
                        {!isStaff && (
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[20px] font-bold text-[var(--ios-blue)]">
                                ₹{Number(order.totalAmount ?? order.total_amount ?? 0).toLocaleString()}
                              </span>
                              {(order.totalPaid ?? order.total_paid ?? 0) > 0 && (
                                <span className="text-[13px] text-[var(--ios-green)] font-semibold">
                                  Paid: ₹
                                  {Number(order.totalPaid ?? order.total_paid ?? 0).toLocaleString()}
                                </span>
                              )}
                              {order.paymentStatus !== "Paid" &&
                                order.paymentStatus !== "paid" &&
                                order.totalAmount - (order.totalPaid || 0) >
                                  0 && (
                                  <span className="text-[13px] text-[var(--ios-orange)] font-semibold">
                                    Due: ₹
                                    {Number(
                                      order.totalAmount -
                                        (order.totalPaid || 0),
                                    ).toLocaleString()}
                                  </span>
                                )}
                              <IOSBadge
                                color={getPaymentBadgeColor(
                                  order.paymentStatus,
                                )}
                                variant="tinted"
                                size="small"
                              >
                                {order.paymentStatus}
                              </IOSBadge>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1.5">
                            {/* Status Badge */}
                            <div className="flex items-center gap-1.5">
                              {updatingOrderId === order.id ? (
                                <Loader2 className="h-[14px] w-[14px] animate-spin text-[var(--ios-blue)]" />
                              ) : (
                                <div
                                  className={cn(
                                    "h-[8px] w-[8px] rounded-full",
                                    order.status === "completed"
                                      ? "bg-[var(--ios-green)]"
                                      : order.status === "processing"
                                        ? "bg-[var(--ios-orange)] animate-pulse"
                                        : "bg-[var(--label-tertiary)]",
                                  )}
                                />
                              )}
                              <IOSBadge
                                color={getStatusBadgeColor(order.status)}
                                variant="tinted"
                                size="small"
                              >
                                {getStatusLabel(order.status)}
                              </IOSBadge>
                            </div>
                            {/* Mini Timeline */}
                            <div className="flex flex-col gap-0.5 ml-1 mt-1">
                              <div className="flex items-center gap-1.5">
                                <div className="h-[4px] w-[4px] rounded-full bg-[var(--label-quaternary)]" />
                                <span className="text-[10px] text-[var(--label-tertiary)] font-medium">
                                  Created:{" "}
                                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString(
                                    "en-IN",
                                    { day: "2-digit", month: "short" },
                                  ) : "—"}
                                </span>
                              </div>
                              {order.processedAt && (
                                <div className="flex items-center gap-1.5">
                                  <div className="h-[4px] w-[4px] rounded-full bg-[var(--ios-orange)]" />
                                  <span className="text-[10px] text-[var(--ios-orange)] font-medium">
                                    Started:{" "}
                                    {new Date(
                                      order.processedAt,
                                    ).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                    })}
                                  </span>
                                </div>
                              )}
                              {order.completedAt && (
                                <div className="flex items-center gap-1.5">
                                  <div className="h-[4px] w-[4px] rounded-full bg-[var(--ios-green)]" />
                                  <span className="text-[10px] text-[var(--ios-green)] font-medium">
                                    Completed:{" "}
                                    {new Date(
                                      order.completedAt,
                                    ).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                    })}
                                  </span>
                                </div>
                              )}
                              {order.deliveryDate && (
                                <span className="text-[11px] bg-[var(--fill-tertiary)] w-fit px-2 py-0.5 rounded-[6px] font-medium text-[var(--label-secondary)] mt-0.5">
                                  Due:{" "}
                                  {new Date(
                                    order.deliveryDate,
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="pr-5 text-right py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* Invoice download — Owner only */}
                            {!isStaff && (
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center text-[var(--label-secondary)] hover:bg-[var(--fill-tertiary)] transition-colors cursor-pointer"
                                onClick={() => generateInvoice(order)}
                              >
                                <Download className="h-4 w-4" />
                              </motion.button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center hover:bg-[var(--fill-tertiary)] transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="h-[18px] w-[18px] text-[var(--label-secondary)]" />
                                </motion.button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-52 rounded-[12px]"
                              >
                                {/* Status Change Submenu */}
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="rounded-[8px]">
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Change Status
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="rounded-[12px]">
                                    {STATUS_OPTIONS.map((opt) => (
                                      <DropdownMenuItem
                                        key={opt.value}
                                        className="rounded-[8px] gap-2"
                                        disabled={
                                          order.status === "completed" ||
                                          order.status === opt.value ||
                                          updatingOrderId === order.id
                                        }
                                        onClick={() =>
                                          handleStatusChange(
                                            order.id,
                                            order.status,
                                            opt.value,
                                          )
                                        }
                                      >
                                        <div
                                          className={cn(
                                            "h-[8px] w-[8px] rounded-full",
                                            opt.value === "completed"
                                              ? "bg-[var(--ios-green)]"
                                              : opt.value === "processing"
                                                ? "bg-[var(--ios-orange)]"
                                                : "bg-[var(--label-tertiary)]",
                                          )}
                                        />
                                        <span
                                          className={cn(
                                            order.status === opt.value &&
                                              "font-bold",
                                          )}
                                        >
                                          {opt.label}
                                        </span>
                                        {order.status === opt.value && (
                                          <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-[var(--ios-blue)]" />
                                        )}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                {/* Edit Order — Owner only */}
                                {!isStaff && (
                                  <DropdownMenuItem
                                    onClick={() => openEditDialog(order)}
                                    className="rounded-[8px]"
                                  >
                                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                                    Order
                                  </DropdownMenuItem>
                                )}
                                {/* Record Payment — Owner only */}
                                {!isStaff && (
                                  <DropdownMenuItem
                                    onClick={() => openPaymentDialog(order)}
                                    className="rounded-[8px]"
                                  >
                                    <IndianRupee className="mr-2 h-4 w-4 text-[var(--ios-green)]" />{" "}
                                    Record Payment
                                  </DropdownMenuItem>
                                )}
                                {isAdmin && (
                                  <DropdownMenuItem
                                    className="text-[var(--ios-red)] rounded-[8px]"
                                    onClick={() => {
                                      setOrderToDeleteId(order.id);
                                      setIsDeleteDialogOpenConfirm(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    Order
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </IOSCard>
          </motion.div>
        </motion.div>
      )}

      {/* ═══════ DIALOGS ═══════ */}

      {/* Create/Edit Order Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-[24px] border-white/10 glass-dialog">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle className="text-[22px] font-bold text-[var(--label-primary)] flex items-center gap-2">
                  <Factory className="h-5 w-5 text-[var(--ios-blue)]" />
                  {currentOrder
                    ? "Edit Production Status"
                    : "Configure Production Order"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                {/* Client & Product */}
                <div className="grid grid-cols-2 gap-5 p-4 glass-section rounded-[16px]">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--label-tertiary)]">
                      Target Client
                    </Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={handleClientChange}
                      required
                    >
                      <SelectTrigger className="h-[44px] glass-input rounded-[12px]">
                        <SelectValue placeholder="Select from directory..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-[12px]">
                        {clients.map((c: any) => (
                          <SelectItem
                            key={c.id}
                            value={c.id}
                            className="rounded-[8px]"
                          >
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--label-tertiary)]">
                      Product Name
                    </Label>
                    <Input
                      list="client-products"
                      placeholder="Enter product name..."
                      value={formData.product_name}
                      className="glass-input h-[44px] px-3"
                      onChange={handleProductChange}
                      required
                    />
                    <datalist id="client-products">
                      {clientProducts.map((p) => (
                        <option key={p.id} value={p.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--label-tertiary)]">
                      Ordered Quantity
                    </Label>
                    <div className="flex h-[44px]">
                      <NumericInput
                        value={formData.quantity}
                        onValueChange={(v) =>
                          setFormData({ ...formData, quantity: v })
                        }
                        className="h-full rounded-r-none border-r border-[#e5e5ea] focus:z-10 bg-[var(--bg-card)] max-w-[120px]"
                        placeholder="Qty"
                        allowDecimal={true}
                        min={0}
                        required
                      />
                      <Select
                        value={formData.unit}
                        onValueChange={(v) =>
                          setFormData({ ...formData, unit: v })
                        }
                      >
                        <SelectTrigger className="h-full rounded-l-none border-none flex-1 bg-[var(--bg-card)] focus:ring-0 focus:ring-offset-0 px-3">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent className="rounded-[12px]">
                          <SelectItem value="kg" className="rounded-[8px]">
                            kg
                          </SelectItem>
                          <SelectItem value="pcs" className="rounded-[8px]">
                            pcs
                          </SelectItem>
                          <SelectItem value="ltr" className="rounded-[8px]">
                            ltr
                          </SelectItem>
                          <SelectItem value="mtr" className="rounded-[8px]">
                            mtr
                          </SelectItem>
                          <SelectItem value="box" className="rounded-[8px]">
                            box
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--label-tertiary)]">
                      Rate (₹)
                    </Label>
                    <NumericInput
                      value={formData.rate}
                      onValueChange={(v) =>
                        setFormData({ ...formData, rate: v })
                      }
                      className="h-[44px]"
                      placeholder="Enter rate"
                      prefix="₹"
                      allowDecimal={true}
                      min={0}
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2 mt-1">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--label-tertiary)] flex items-center gap-1.5">
                      Material Source{" "}
                      <span className="text-[10px] lowercase font-normal text-[var(--label-quaternary)]">
                        (optional)
                      </span>
                    </Label>
                    <TogglePill
                      options={[
                        { value: "own", label: "Own Material" },
                        { value: "client", label: "Client Material" },
                      ]}
                      value={formData.material_source}
                      onChange={(v) => {
                        const source = v as "own" | "client";
                        setFormData((prev) => ({
                          ...prev,
                          material_source: source,
                          order_items: [],
                        }));
                        if (source === "own") {
                          setClientProductMaterials([]);
                        } else {
                          const matchedProduct = clientProducts.find(
                            (p) => p.name === formData.product_name,
                          );
                          if (matchedProduct && formData.client_id) {
                            fetchMaterialsForProduct(
                              formData.client_id,
                              matchedProduct.id,
                            );
                          } else {
                            setClientProductMaterials([]);
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Material Deduction */}
                {!currentOrder && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[17px] font-bold text-[var(--label-primary)] flex items-center gap-2">
                        <Box className="h-5 w-5 text-[var(--label-tertiary)]" />{" "}
                        Material Deduction
                      </h3>
                      <IOSButton
                        type="button"
                        variant="gray"
                        size="small"
                        onClick={addDeductionRow}
                        icon={<Plus className="h-3.5 w-3.5" />}
                      >
                        Add Component
                      </IOSButton>
                    </div>
                    {formData.order_items.length === 0 && (
                      <div className="py-6 text-center bg-[var(--fill-quaternary)] rounded-[12px] border-2 border-dashed border-[var(--border-card)]">
                        <AlertCircle className="h-5 w-5 mx-auto mb-2 text-[var(--label-tertiary)]" />
                        <p className="text-[13px] text-[var(--label-secondary)]">
                          You must select which raw materials are used for this
                          order.
                        </p>
                      </div>
                    )}
                    {formData.order_items.map((item, idx) => {
                      const sourceMaterials =
                        formData.material_source === "own"
                          ? inventory
                          : clientProductMaterials;
                      const hasClientSelected =
                        formData.material_source === "own" ||
                        !!formData.client_id;

                      return (
                        <div key={idx} className="flex gap-3 items-end">
                          <div className="flex-1 space-y-1">
                            <Label className="text-[11px] font-bold text-[var(--label-tertiary)] uppercase flex items-center gap-2">
                              Raw Material
                              {isLoadingMaterials && (
                                <Loader2 className="h-3 w-3 animate-spin text-[var(--ios-blue)]" />
                              )}
                            </Label>
                            <Select
                              value={item.inventory_id}
                              onValueChange={(v) =>
                                updateDeductionRow(idx, "inventory_id", v)
                              }
                              disabled={
                                !hasClientSelected || isLoadingMaterials
                              }
                            >
                              <SelectTrigger className="h-[44px] glass-input rounded-[12px]">
                                <SelectValue
                                  placeholder={
                                    !hasClientSelected
                                      ? "Select target client first..."
                                      : isLoadingMaterials
                                        ? "Loading materials..."
                                        : "Select stock..."
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent className="rounded-[12px]">
                                {sourceMaterials.length === 0 ? (
                                  <div className="p-3 text-[13px] text-[var(--label-secondary)] text-center">
                                    No materials available
                                  </div>
                                ) : (
                                  sourceMaterials.map((i: any) => (
                                    <SelectItem
                                      key={i.id}
                                      value={i.id}
                                      disabled={i.quantity <= 0}
                                      className="rounded-[8px]"
                                    >
                                      {i.name} ({i.quantity} {i.unit || "unit"}{" "}
                                      left)
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-36 space-y-1">
                            <Label className="text-[11px] font-bold text-[var(--label-tertiary)] uppercase">
                              Qty Used
                            </Label>
                            <NumericInput
                              className="h-[44px]"
                              value={item.quantity_deducted}
                              onValueChange={(v) =>
                                updateDeductionRow(idx, "quantity_deducted", v)
                              }
                              placeholder="0"
                              allowDecimal={true}
                              min={0}
                            />
                          </div>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            className="h-[44px] w-[44px] rounded-[10px] flex items-center justify-center text-[var(--ios-red)] hover:bg-[rgba(255,59,48,0.08)] transition-colors cursor-pointer"
                            onClick={() => removeDeductionRow(idx)}
                          >
                            <X className="h-5 w-5" />
                          </motion.button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Delivery & Production Status */}
                <div className="grid grid-cols-2 gap-4 border-t border-[var(--border-card)] pt-5">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--label-secondary)]">
                      Expected Delivery
                    </Label>
                    <Input
                      type="date"
                      value={formData.delivery_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          delivery_date: e.target.value,
                        })
                      }
                      className="h-[44px] rounded-[10px] bg-[var(--fill-tertiary)] border-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--label-secondary)]">
                      Production Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) =>
                        setFormData({ ...formData, status: v })
                      }
                    >
                      <SelectTrigger className="h-[44px] rounded-[10px] bg-[var(--fill-tertiary)] border-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[12px]">
                        <SelectItem value="pending" className="rounded-[8px]">
                          Pending
                        </SelectItem>
                        <SelectItem
                          value="processing"
                          className="rounded-[8px]"
                        >
                          In Production
                        </SelectItem>
                        <SelectItem value="completed" className="rounded-[8px]">
                          Completed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Payment Status Info (read-only) */}
                {currentOrder && (
                  <div className="flex items-center gap-2 p-3 rounded-[12px] bg-[var(--fill-quaternary)]">
                    <IndianRupee className="h-4 w-4 text-[var(--label-tertiary)]" />
                    <span className="text-[13px] text-[var(--label-secondary)]">
                      Payment status is{" "}
                      <strong className="text-[var(--label-primary)]">
                        {currentOrder.paymentStatus}
                      </strong>{" "}
                      — auto-updated when payments are recorded.
                    </span>
                  </div>
                )}

                {/* Total */}
                <div className="bg-[rgba(0,122,255,0.06)] p-4 rounded-[14px] flex justify-between items-center border border-[rgba(0,122,255,0.15)]">
                  <span className="text-[13px] font-bold text-[var(--label-secondary)] uppercase">
                    Calculated Total
                  </span>
                  <span className="text-[22px] font-bold text-[var(--ios-blue)]">
                    ₹
                    {(
                      parseNumericValue(formData.quantity) *
                      parseNumericValue(formData.rate)
                    ).toLocaleString()}
                  </span>
                </div>

                <DialogFooter className="sticky bottom-0 bg-[var(--bg-card)] pt-4 border-t border-[var(--border-card)]">
                  <button
                    type="submit"
                    className="glow-btn w-full h-[50px] text-[17px] flex items-center justify-center gap-2"
                  >
                    {currentOrder
                      ? "Push Updates"
                      : "Issue Order & Deduct Materials"}
                  </button>
                </DialogFooter>
              </form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={isDeleteDialogOpenConfirm}
        onOpenChange={setIsDeleteDialogOpenConfirm}
      >
        <DialogContent className="max-w-[350px] rounded-[24px] border-white/10 glass-dialog">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-[var(--label-primary)]">
              Delete Order
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[var(--label-secondary)]">
              Are you sure? This will NOT restore inventory automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <IOSButton
              variant="gray"
              size="large"
              onClick={() => setIsDeleteDialogOpenConfirm(false)}
              fullWidth
            >
              Cancel
            </IOSButton>
            <IOSButton
              variant="destructive"
              size="large"
              onClick={() => orderToDeleteId && handleDelete(orderToDeleteId)}
              fullWidth
              loading={deleteOrder.isPending}
              disabled={deleteOrder.isPending}
            >
              Delete
            </IOSButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md rounded-[24px] border-white/10 glass-dialog">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-[var(--label-primary)] flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-[var(--ios-green)]" /> Record
              Payment
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[var(--label-secondary)]">
              Recording payment for {currentOrder?.productName} (
              {currentOrder?.client?.name || "Client"})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[var(--label-secondary)]">
                Amount (₹)
              </Label>
              <NumericInput
                value={paymentFormData.amount}
                onValueChange={(v) =>
                  setPaymentFormData({ ...paymentFormData, amount: v })
                }
                className="h-[44px] font-bold text-[17px]"
                allowDecimal={true}
                min={0}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[var(--label-secondary)]">
                Payment Mode
              </Label>
              <Select
                value={paymentFormData.payment_mode}
                onValueChange={(v) =>
                  setPaymentFormData({ ...paymentFormData, payment_mode: v })
                }
              >
                <SelectTrigger className="h-[44px] rounded-[10px] bg-[var(--fill-tertiary)] border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[12px]">
                  <SelectItem value="Cash" className="rounded-[8px]">
                    Cash
                  </SelectItem>
                  <SelectItem value="Bank Transfer" className="rounded-[8px]">
                    Bank Transfer
                  </SelectItem>
                  <SelectItem value="UPI" className="rounded-[8px]">
                    UPI
                  </SelectItem>
                  <SelectItem value="Cheque" className="rounded-[8px]">
                    Cheque
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[var(--label-secondary)]">
                Payment Date
              </Label>
              <Input
                type="date"
                value={paymentFormData.payment_date}
                onChange={(e) =>
                  setPaymentFormData({
                    ...paymentFormData,
                    payment_date: e.target.value,
                  })
                }
                className="h-[44px] rounded-[10px] bg-[var(--fill-tertiary)] border-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[var(--label-secondary)]">
                Reference / UTR (Optional)
              </Label>
              <Input
                value={paymentFormData.transaction_ref}
                onChange={(e) =>
                  setPaymentFormData({
                    ...paymentFormData,
                    transaction_ref: e.target.value,
                  })
                }
                className="h-[44px] rounded-[10px] bg-[var(--fill-tertiary)] border-none"
                placeholder="e.g. UPI Ref #1234..."
              />
            </div>
            <DialogFooter className="gap-2">
              <IOSButton
                type="button"
                variant="gray"
                size="large"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                Cancel
              </IOSButton>
              <IOSButton
                type="submit"
                variant="filled"
                size="large"
                loading={recordPayment.isPending}
                disabled={recordPayment.isPending}
                className="bg-[var(--ios-green)] hover:brightness-95"
              >
                {recordPayment.isPending ? "Recording..." : "Save Payment"}
              </IOSButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default function OrdersPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <div className="h-[34px] w-[220px] rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
              <div className="h-[20px] w-[280px] rounded-[8px] bg-[var(--fill-tertiary)] shimmer mt-2" />
            </div>
            <div className="kpi-panel">
              <div className="kpi-panel__glow"></div>
              <div className="kpi-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="kpi-card flex flex-col justify-center min-h-[140px]"
                  >
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
        }
      >
        <OrdersContent />
      </Suspense>
    </ErrorBoundary>
  );
}
