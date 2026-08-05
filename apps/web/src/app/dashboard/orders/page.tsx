"use client";

import { useState, useMemo, useCallback, useRef, useEffect, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSearchParams, useRouter } from "next/navigation";
import { usePaginatedSearch } from "@/hooks/usePaginatedSearch";
import { useURLSyncedPagination } from "@/hooks/useURLSyncedPagination";
import { useCachedPage } from "@/hooks/useCachedPage";
import { SearchBar } from "@/components/ui/SearchBar";
import { TablePagination } from "@/components/ui/TablePagination";
import { TableEmptyState } from "@/components/ui/TableEmptyState";
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
  Loader2,
  ClipboardList,
  Timer,
  Inbox,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  FileText,
  Send,
  User,
  Package,
  Calendar,
  Cpu,
  StickyNote,
  Zap,
  Flame,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
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
  DialogClose,
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
import { deriveOrderStatusFromOrder } from "@/lib/deriveOrderStatus";
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
import { useFormatters } from "@/hooks/useFormatters";
import { exportToExcel } from "@/lib/excel-export";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { IOSCard } from "@/components/ui/ios/IOSCard";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { staggerContainer, staggerItem } from "@/styles/animations";
import { StatWidget } from "@/components/ui/StatWidget";
import { TogglePill } from "@/components/ui/glass";
import { CompletionConfirmationModal, InvoicePreviewModal } from "@/components/orders/CompletionModals";
import { useQuery } from "@tanstack/react-query";
import { CollapsingTitle } from "@/components/ui/CollapsingTitle";
import { useCollapseProgress } from "@/hooks/useCollapseProgress";
import { ConfirmDeleteSheet } from "@/components/ui/ConfirmDeleteSheet";

// ──────────────── React Query Hooks ──────────────────────────────────────────
import {
  useOrders,
  useClients,
  useInventory,
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
  useRecordPayment,
  useUpdateOrderStatus,
  queryKeys,
} from "@/lib/hooks/use-orders";

function OrdersContent() {
  const { progress: collapseProgress } = useCollapseProgress();
  const router = useRouter();
  const { role, isAdmin, isStaff, isPro, loading: roleLoading } = useRole();
  const { formatINR } = useFormatters();

  const { initialPage, initialSearch, syncToURL } = useURLSyncedPagination();

  // ─── Page-level UI state cache (search, filters, scroll) ───
  const { restoreState, persist, scrollYRef, restoreScroll } = useCachedPage({
    pageKey: "orders",
  });

  // â”€â”€â”€ React Query: data fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
    error: ordersErrorObj,
  } = useOrders();
  const { data: clients = [] } = useClients();
  const { data: inventory = [] } = useInventory();

  // â”€â”€â”€ React Query: mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const recordPayment = useRecordPayment();
  const updateOrderStatus = useUpdateOrderStatus();

  // â”€â”€â”€ Local UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [clientProducts, setClientProducts] = useState<any[]>([]);
  const [clientProductMaterials, setClientProductMaterials] = useState<any[]>(
    [],
  );
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  // â”€â”€â”€ Strictly Isolated Modal Booleans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Each modal has its own [isOpen, setIsOpen] boolean.
  // open=true is ONLY set by explicit user actions (button clicks).
  // open=false is set by onOpenChange(false) or programmatic close.
  // Radix onOpenChange(true) callbacks are BLOCKED to prevent re-entrancy.
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] =
    useState(false);
  const [orderToDeleteId, setOrderToDeleteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // ─── Fresh order data for payment modal (Bug #2 fix) ───
  const paymentOrderId = paymentOrder?.id as string | undefined;
  const { data: freshOrder } = useQuery<Record<string, unknown>>({
    queryKey: queryKeys.order(paymentOrderId ?? ""),
    queryFn: () => fetch(`/api/v1/orders/${paymentOrderId}`).then(r => {
      if (!r.ok) throw new Error("Failed to fetch order");
      return r.json().then(json => json.data ?? json);
    }),
    staleTime: 0,
    enabled: !!paymentOrderId && isPaymentDialogOpen,
  });

  useEffect(() => {
    if (!freshOrder) return;
    const total = Number(freshOrder.totalAmount ?? 0);
    const paid = Number(freshOrder.totalPaid ?? 0);
    const balance = isNaN(total) || isNaN(paid) ? 0 : total - paid;
    setPaymentFormData(prev => ({
      ...prev,
      amount: String(balance > 0 ? balance : 0),
    }));
  }, [freshOrder]);

  // â”€â”€â”€ Completion Confirmation Modal state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [completionOrder, setCompletionOrder] = useState<any>(null);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [invoiceEditData, setInvoiceEditData] = useState<any>(null);

  // â”€â”€â”€ Long-press & Bottom Sheet state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [longPressedOrder, setLongPressedOrder] = useState<any>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [pressedCardId, setPressedCardId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const handleLongPressStart = useCallback((order: any) => {
    longPressTimerRef.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
      setLongPressedOrder(order);
      setIsBottomSheetOpen(true);
      setPressedCardId(null);
    }, 500);
    setPressedCardId(order.id);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPressedCardId(null);
  }, []);

  const closeBottomSheet = useCallback(() => {
    setIsBottomSheetOpen(false);
    setTimeout(() => setLongPressedOrder(null), 350);
  }, []);

  // â”€â”€â”€ Status filter (React state, synced to URL via syncToURL) â”€â”€
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string | null>(
    () => searchParams.get("status") // seed from URL on mount
  );
  const setStatusShortcut = useCallback((status: string | null) => {
    setStatusFilter(!status || status === "all" ? null : status);
  }, []);

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
    router.push("/dashboard/orders/create");
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
      order.client?.name || order.clients?.name || "â€”",
      String(order.quantity),
      formatINR(Number(order.rate)),
      formatINR(Number(order.total_amount || order.totalAmount)),
      getStatusLabel(deriveOrderStatusFromOrder(order)),
      order.delivery_date || order.deliveryDate
        ? new Date(
            order.delivery_date || order.deliveryDate,
          ).toLocaleDateString("en-IN")
        : "â€”",
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
      client_name: order?.client?.name || order?.clients?.name || "â€”",
      status: order?.status ?? "",
      total_amount: order?.total_amount ?? order?.totalAmount ?? 0,
      date_formatted: order?.createdAt
        ? new Date(order.createdAt).toLocaleDateString("en-IN")
        : "â€”",
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
    material_cost: "",
    labour_cost: "",
    overhead_cost: "",
    order_items: [] as { inventory_id: string; quantity_deducted: string }[],
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    notes: "",
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
      material_cost: "",
      labour_cost: "",
      overhead_cost: "",
      order_items: [],
      priority: "normal",
      notes: "",
    });
    setClientProducts([]);
    setClientProductMaterials([]);
    setCurrentOrder(null);
  };

  // â”€â”€â”€ Safe close helpers (prevent any state cascade) â”€â”€â”€â”€
  const closeOrderDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const closePaymentDialog = () => {
    setIsPaymentDialogOpen(false);
    setPaymentOrder(null);
  };

  const openEditDialog = (order: any) => {
    if (!order) return;
    router.push(`/dashboard/orders/${order.id}/edit`);
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
      material_cost: computedMaterialCost.total,
      labour_cost: parseNumericValue(formData.labour_cost),
      overhead_cost: parseNumericValue(formData.overhead_cost),
      order_items: formData.order_items.map((item) => ({
        inventory_id: item.inventory_id,
        quantity_deducted: parseNumericValue(item.quantity_deducted),
      })),
      priority: formData.priority,
      notes: formData.notes,
    };

    if (currentOrder) {
      updateOrder.mutate(
        { id: currentOrder.id, payload: orderPayload },
        {
          onSuccess: () => {
            closeOrderDialog();
          },
        },
      );
    } else {
      createOrder.mutate(orderPayload, {
        onSuccess: () => {
          closeOrderDialog();
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
    setPaymentOrder(order);
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
    if (!paymentOrder) return;
    recordPayment.mutate(
      {
        reference_type: "SalesOrder",
        reference_id: paymentOrder.id,
        party_type: "Customer",
        party_id: paymentOrder.clientId,
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
          closePaymentDialog();
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

  // â”€â”€ Status-only pre-filter (URL-based) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const statusFilteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    // No filter active â†’ return all
    if (!statusFilter) return orders;
    const activeStatus = statusFilter.toLowerCase().trim();
    // "active" = everything NOT completed
    if (activeStatus === "active") {
      return orders.filter(
        (order: any) => deriveOrderStatusFromOrder(order) === "active",
      );
    }
    // "production" maps to "processing" in the DB
    if (activeStatus === "production") {
      return orders.filter(
        (order: any) => deriveOrderStatusFromOrder(order) === "processing",
      );
    }
    // Direct match for all other statuses (pending, processing, completed, cancelled)
    return orders.filter((order: any) => {
      const derived = deriveOrderStatusFromOrder(order);
      return derived === activeStatus;
    });
  }, [orders, statusFilter]);

  // ─── Pagination + Search ─────────────────────────────────
  const {
    searchQuery,
    handleSearch,
    currentPage,
    setCurrentPage,
    totalPages,
    totalFiltered,
    totalItems,
    paginatedData,
    debouncedQuery,
  } = usePaginatedSearch({
    data: statusFilteredOrders,
    searchFields: ["productName", "product_name", "id", "status"],
    pageSize: 15,
    initialPage,
    initialSearch,
    filterFn: (order: any, normalizedQuery: string) => {
      const productName = String(order.productName ?? order.product_name ?? "").toLowerCase();
      const clientName = String(order.client?.name ?? order.clients?.name ?? "").toLowerCase();
      const orderId = String(order.id ?? "").toLowerCase();
      return (
        productName.includes(normalizedQuery) ||
        clientName.includes(normalizedQuery) ||
        orderId.includes(normalizedQuery)
      );
    },
  });

  // Keep filteredOrders name for backward compatibility with count displays
  const filteredOrders = paginatedData;

  // ─── Sync to URL on state change ──────────────────────────
  useEffect(() => {
    syncToURL({
      page: currentPage,
      search: debouncedQuery,
      filters: { status: statusFilter },
    });
  }, [currentPage, debouncedQuery, statusFilter, syncToURL]);

  // ─── Scroll-to-top on page change + Table scroll Ref ──────
  const tableContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (currentPage > 1) {
      tableContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage]);

  // ─── Restore cached UI state on mount ────────────────────
  // URL params win — cache is only used as a fallback
  useEffect(() => {
    const cached = restoreState();
    if (cached) {
      // Only apply cached search if URL didn't provide one
      if (!initialSearch && cached.searchQuery) {
        handleSearch(cached.searchQuery as string);
      }
      // Only apply cached page if URL is at default (page 1)
      if (initialPage === 1 && typeof cached.currentPage === "number" && cached.currentPage > 1) {
        setCurrentPage(cached.currentPage as number);
      }
      // Only apply cached status filter if URL didn't provide one
      if (!searchParams.get("status") && cached.statusFilter !== undefined) {
        setStatusFilter(cached.statusFilter as string | null);
      }
      // Restore scroll position
      if (typeof cached.scrollY === "number" && cached.scrollY > 0) {
        restoreScroll(cached.scrollY);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Persist UI state on unmount ─────────────────────────
  const cachedStateRef = useRef({ searchQuery, currentPage, statusFilter });
  useEffect(() => {
    cachedStateRef.current = { searchQuery, currentPage, statusFilter };
  });
  useEffect(() => {
    return () => {
      persist({ ...cachedStateRef.current, scrollY: scrollYRef.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Track scroll position for cache ─────────────────────
  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const handleScroll = () => { scrollYRef.current = el.scrollTop; };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollYRef]);

  // â”€â”€â”€ Payment Status Color Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getPaymentBadgeColor = (
    status: string,
  ): "green" | "orange" | "red" | "gray" => {
    if (status === "paid" || status === "Paid") return "green";
    if (status === "Overdue") return "red";
    return "orange";
  };

  // â”€â”€â”€ Mutation pending state (for disabling buttons) â”€â”€â”€
  const isMutating =
    createOrder.isPending ||
    updateOrder.isPending ||
    deleteOrder.isPending ||
    recordPayment.isPending ||
    updateOrderStatus.isPending;

  // â”€â”€â”€ Status helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getStatusBadgeColor = (status: string): "green" | "orange" | "gray" | "blue" | "red" | "purple" => {
    if (status === "completed") return "green";
    if (status === "processing") return "orange";
    if (status === "awaiting_payment") return "orange";
    if (status === "active") return "blue";
    if (status === "cancelled") return "red";
    if (status === "on_hold") return "purple";
    return "gray";
  };

  const getStatusLabel = (status: string): string => {
    if (status === "completed") return "COMPLETED";
    if (status === "processing") return "IN PRODUCTION";
    if (status === "awaiting_payment") return "AWAITING PAYMENT";
    if (status === "active") return "ACTIVE";
    if (status === "cancelled") return "CANCELLED";
    if (status === "on_hold") return "ON HOLD";
    return "PENDING";
  };

  const handleCompleteOnly = () => {
    if (!completionOrder) return;
    setIsCompletionModalOpen(false);
    setUpdatingOrderId(completionOrder.id);
    updateOrderStatus.mutate(
      { id: completionOrder.id, status: "completed" },
      { onSettled: () => { setUpdatingOrderId(null); setCompletionOrder(null); } },
    );
  };

  const handleCompleteAndInvoice = async () => {
    if (!completionOrder) return;
    setIsCompletionModalOpen(false);
    setUpdatingOrderId(completionOrder.id);
    // 1. Mark as completed
    updateOrderStatus.mutate(
      { id: completionOrder.id, status: "completed" },
      {
        onSettled: () => setUpdatingOrderId(null),
        onSuccess: async () => {
          // 2. Auto-generate invoice
          setIsGeneratingInvoice(true);
          try {
            const res = await fetch("/api/invoices/auto-generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: completionOrder.id }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
              showToast(data.error || "Failed to generate invoice");
              return;
            }
            setGeneratedInvoice(data);
            setInvoiceEditData({
              invoiceNumber: data.invoiceNumber,
              issueDate: new Date().toISOString().split("T")[0],
              dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
              notes: data.invoiceData?.notes || "",
              gstRate: 18,
            });
            setIsInvoicePreviewOpen(true);
            showToast("Invoice generated!");
          } catch (err) {
            showToast("Failed to generate invoice");
          } finally {
            setIsGeneratingInvoice(false);
            setCompletionOrder(null);
          }
        },
      },
    );
  };

  // â”€â”€â”€ Memoized KPI stats (prevent recalc on every render) â”€â”€â”€â”€â”€
  const orderStats = useMemo(() => {
    if (!Array.isArray(orders)) return { total: 0, pending: 0, processing: 0, completed: 0, revenue: 0, pendingPayment: 0 };
    return {
      total: orders.length,
      pending: orders.filter((o: any) => deriveOrderStatusFromOrder(o) === "pending").length,
      processing: orders.filter((o: any) => deriveOrderStatusFromOrder(o) === "processing").length,
      completed: orders.filter((o: any) => deriveOrderStatusFromOrder(o) === "completed").length,
      revenue: orders.reduce((acc: number, o: any) => acc + Number(o?.totalAmount || 0), 0),
      pendingPayment: orders.filter((o: any) => o?.paymentStatus !== "paid" && o?.paymentStatus !== "Paid").length,
    };
  }, [orders]);

  // â”€â”€â”€ Auto-computed Material Cost from Inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const computedMaterialCost = useMemo(() => {
    const sourceMaterials = formData.material_source === "own" ? inventory : clientProductMaterials;
    let total = 0;
    const warnings: string[] = [];

    // When order_items exist (create mode), compute from deduction rows
    if (formData.order_items.length > 0) {
      for (const item of formData.order_items) {
        if (!item.inventory_id) continue;
        const invItem = sourceMaterials.find((i: any) => i.id === item.inventory_id);
        if (!invItem) continue;
        const baseCost = Number(invItem.purchase_cost_per_unit || 0);
        const taxRate = Number(invItem.tax_rate || 0);
        const landedCost = baseCost * (1 + taxRate / 100);
        if (landedCost === 0) warnings.push(invItem.name);
        total += landedCost * parseNumericValue(item.quantity_deducted);
      }
    }
    // In edit mode (order_items empty), compute from saved materials array
    else if (currentOrder?.materials && Array.isArray(currentOrder.materials) && currentOrder.materials.length > 0) {
      for (const mat of currentOrder.materials) {
        let costPerUnit = Number(mat.purchase_cost_per_unit || 0);
        // If cost is missing, try to look it up from inventory
        if (costPerUnit === 0 && mat.inventoryItemId) {
          const invItem = inventory.find((i: any) => i.id === mat.inventoryItemId);
          if (invItem) {
            costPerUnit = Number(invItem.purchase_cost_per_unit || 0);
            const taxRate = Number(invItem.tax_rate || 0);
            costPerUnit = costPerUnit * (1 + taxRate / 100);
          }
          if (costPerUnit === 0) warnings.push(mat.itemName || 'Unknown material');
        }
        total += costPerUnit * Number(mat.quantityRequired || 0);
      }
    }

    return { total, warnings };
  }, [formData.order_items, formData.material_source, inventory, clientProductMaterials, currentOrder]);


  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6 overflow-x-hidden"
    >
      {/* ── Header ── */}
      <motion.div variants={staggerItem}>
        <CollapsingTitle
          title="Orders & Production"
          subtitle={`${orderStats.total} orders · ${orderStats.processing} in progress · ${orderStats.pending} pending`}
          subtitleLoading={ordersLoading}
          collapseProgress={collapseProgress}
        />
      </motion.div>

      {/* â”€â”€ Enterprise Toolbar (3-Layer Hierarchy) â”€â”€ */}
      <motion.div
        variants={staggerItem}
        className={cn(
          // Normal flow on mobile, sticky on desktop
          "md:sticky md:top-[56px] md:z-30",
          "shrink-0 pb-4 -mx-1 px-1 mb-2",
          // Glass surface â€” only needed on desktop where sticky is active
          "md:bg-[rgba(243,245,249,0.88)] md:backdrop-blur-xl",
          "md:dark:bg-[rgba(8,12,24,0.82)]",
          // Bottom hairline
          "border-b border-[rgba(15,23,42,0.06)] dark:border-[rgba(255,255,255,0.06)]",
        )}
      >
        <div className="space-y-3">

          {/* ROW 1 â€” Search + Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] dark:text-[rgba(148,163,184,0.7)] pointer-events-none"
                size={16}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search orders, clients, IDs..."
                id="orders-search"
                className={cn(
                  "w-full h-10 pl-10 pr-10 rounded-[12px] text-[14px] transition-all duration-200",
                  // Light mode
                  "bg-[rgba(255,255,255,0.72)] border border-[rgba(15,23,42,0.08)]",
                  "text-foreground placeholder:text-[#94A3B8]",
                  "shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
                  // Dark mode â€” deep navy glass surface
                  "dark:bg-[rgba(15,23,42,0.50)] dark:border-[rgba(148,163,184,0.12)]",
                  "dark:text-[#E2E8F0] dark:placeholder:text-[rgba(148,163,184,0.50)]",
                  "dark:shadow-[0_2px_8px_rgba(0,0,0,0.15)]",
                  // Focus
                  "focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]",
                  "dark:focus:border-[rgba(96,165,250,0.50)] dark:focus:ring-[rgba(96,165,250,0.15)]",
                  // Caret
                  "caret-primary",
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-150 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Action Buttons â€” shrink-0 so they never wrap oddly */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Add Order â€” PRIMARY CTA */}
              <button
                type="button"
                onClick={handleAddNewClick}
                className="flex items-center gap-2 h-10 px-4 rounded-[12px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.35)] transition-all duration-200 active:scale-[0.98] cursor-pointer"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Add Order</span>
                <span className="sm:hidden">Add</span>
              </button>

              {/* Export â€” SECONDARY */}
              <button
                type="button"
                onClick={exportToXLSX}
                className={cn(
                  "flex items-center gap-2 h-10 px-3.5 rounded-[12px] text-[13px] font-medium transition-all duration-200 active:scale-[0.98] cursor-pointer",
                  // Light
                  "bg-[rgba(255,255,255,0.72)] hover:bg-[rgba(255,255,255,0.95)] border border-[rgba(15,23,42,0.08)] hover:border-[rgba(15,23,42,0.14)]",
                  "text-[#64748B] hover:text-[#0F172A] shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
                  // Dark â€” deep navy glass surface
                  "dark:bg-[rgba(15,23,42,0.50)] dark:hover:bg-[rgba(30,41,59,0.70)]",
                  "dark:border-[rgba(148,163,184,0.12)] dark:hover:border-[rgba(148,163,184,0.20)]",
                  "dark:text-[#94A3B8] dark:hover:text-[#E2E8F0] dark:shadow-[0_2px_8px_rgba(0,0,0,0.15)]",
                )}
              >
                <Download size={14} />
                <span className="hidden md:inline">Export</span>
              </button>
            </div>
          </div>

          {/* ROW 2 + ROW 3 â€” Filters + Result Count */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            {/* Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: null, label: "All" },
                { key: "pending", label: "Pending" },
                { key: "processing", label: "Processing" },
                { key: "active", label: "Active" },
                { key: "completed", label: "Completed" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setStatusShortcut(item.key);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "h-8 px-3.5 rounded-[10px] text-[12.5px] font-medium border transition-all duration-150 cursor-pointer",
                    statusFilter === item.key
                      ? "bg-[#2563EB] text-white border-transparent shadow-sm shadow-[rgba(37,99,235,0.25)]"
                      : cn(
                          // Light
                          "bg-[rgba(255,255,255,0.60)] hover:bg-[rgba(255,255,255,0.90)] text-[#64748B] hover:text-[#0F172A]",
                          "border-[rgba(15,23,42,0.08)] hover:border-[rgba(15,23,42,0.14)]",
                          // Dark â€” deep navy glass surface
                          "dark:bg-[rgba(15,23,42,0.50)] dark:hover:bg-[rgba(30,41,59,0.70)]",
                          "dark:text-[#94A3B8] dark:hover:text-[#E2E8F0]",
                          "dark:border-[rgba(148,163,184,0.12)] dark:hover:border-[rgba(148,163,184,0.20)]",
                        )
                  )}
                >
                  {item.label}
                </button>
              ))}

              {/* Clear â€” only when filters/search active */}
              {(searchQuery || statusFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    handleSearch("");
                    setStatusShortcut(null);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "h-8 px-3 rounded-[10px] text-[12.5px] font-medium transition-all duration-150 cursor-pointer",
                    "text-muted-foreground/70 hover:text-muted-foreground",
                    "border border-dashed",
                    "border-[rgba(15,23,42,0.12)] hover:border-[rgba(15,23,42,0.20)]",
                    "dark:border-[rgba(148,163,184,0.15)] dark:hover:border-[rgba(148,163,184,0.25)]",
                    "bg-transparent hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[rgba(30,41,59,0.50)]",
                  )}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Result Count â€” passive, right-aligned */}
            <p className="text-[12.5px] text-muted-foreground/70 font-medium whitespace-nowrap shrink-0 sm:text-right tabular-nums">
              {statusFilter
                ? `Showing ${totalFiltered} ${statusFilter} orders`
                : `Showing ${totalFiltered} of ${orders.length} orders`
              }
            </p>
          </div>

        </div>
      </motion.div>

        {/* â”€â”€â”€ Error State Banner â”€â”€ */}
        {ordersError && (
          <motion.div
            variants={staggerItem}
            className="flex items-center gap-3 p-4 rounded-[16px] border border-[var(--destructive)]/20 bg-[rgba(255,59,48,0.06)]"
          >
            <div className="w-[40px] h-[40px] rounded-[12px] bg-[rgba(255,59,48,0.10)] flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-[18px] w-[18px] text-[var(--destructive)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-[var(--foreground)]">
                Failed to load orders
              </p>
              <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5 truncate">
                {ordersErrorObj?.message || "Unknown error â€” please try refreshing."}
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

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        â”€â”€ LOADING STATE â”€â”€
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {roleLoading || ordersLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--primary)]/20 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-[var(--primary)] animate-spin" />
              </div>
              <p className="text-[13px] text-[var(--muted-foreground)]">
                Loading...
              </p>
            </div>
          </div>
        ) : isStaff ? (
          <motion.div initial="initial" animate="animate" variants={staggerContainer} className="w-full">
            {/* 3-Column Grid: Orders (30%) | Widgets (40%) | Production (30%) */}
            <div className="grid grid-cols-1 lg:grid-cols-[30fr_40fr_30fr] gap-5">
              {/* â”€â”€ LEFT: Orders Panel â”€â”€ */}
              <motion.div variants={staggerItem} className="order-2 lg:order-1">
                <IOSCard variant="elevated" padding="lg" className="h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[17px] font-bold text-[var(--foreground)] leading-[22px]">
                        Orders
                      </h3>
                      <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
                        {totalFiltered} total
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
                          <div className="flex items-center gap-3 p-2.5 rounded-[12px] hover:bg-[var(--muted)] transition-all">
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
                                      ? "var(--erp-warning)"
                                      : item.color === "blue"
                                        ? "var(--primary)"
                                        : "var(--erp-success)",
                                }}
                              />
                            </div>
                            <span className="text-[14px] font-medium text-[var(--foreground)] flex-1">
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
                                    ? "var(--erp-warning)"
                                    : item.color === "blue"
                                      ? "var(--primary)"
                                      : "var(--erp-success)",
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)] px-1 mb-2">
                        Recent Orders
                      </p>
                      {filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-[40px] h-[40px] rounded-[12px] bg-[rgba(0,122,255,0.08)] flex items-center justify-center mb-3">
                            <ClipboardList className="h-[18px] w-[18px] text-[var(--primary)]" />
                          </div>
                          <p className="text-[13px] font-medium text-[var(--muted-foreground)]">
                            No orders found
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {filteredOrders
                            .slice(0, 5)
                            .map((order: any, idx: number) => {
                              const derived = deriveOrderStatusFromOrder(order);
                              return (
                              <div key={order.id ?? idx}>
                                <motion.div
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    delay: 0.1 + idx * 0.04,
                                    duration: 0.3,
                                  }}
                                  className="flex items-center gap-2.5 p-2.5 rounded-[10px] hover:bg-[var(--muted)] transition-colors cursor-pointer group"
                                >
                                  {/* Priority dot */}
                                  <div
                                    className={cn(
                                      "w-[5px] h-[5px] rounded-full flex-shrink-0",
                                      derived === "completed"
                                        ? "bg-[var(--erp-success)]"
                                        : derived === "processing"
                                          ? "bg-[var(--primary)]"
                                          : derived === "active"
                                            ? "bg-[var(--primary)]"
                                            : "bg-[var(--erp-warning)]",
                                    )}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-[var(--foreground)] truncate">
                                      {order.productName ?? order.product_name ?? "â€”"}
                                    </p>
                                    <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                                      {order.client?.name ?? order.clients?.name ?? "â€”"} Â·{" "}
                                      {order.quantity ?? 0} {order.unit ?? "kg"}
                                    </p>
                                  </div>
                                  <span
                                    className={cn(
                                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize whitespace-nowrap",
                                      derived === "completed"
                                        ? "bg-[rgba(52,199,89,0.12)] text-[var(--erp-success)]"
                                        : derived === "processing"
                                          ? "bg-[rgba(0,122,255,0.12)] text-[var(--primary)]"
                                          : derived === "active"
                                            ? "bg-[rgba(0,122,255,0.12)] text-[var(--primary)]"
                                            : "bg-[rgba(255,149,0,0.12)] text-[var(--erp-warning)]",
                                    )}
                                  >
                                    {getStatusLabel(derived)}
                                  </span>
                                </motion.div>
                                {idx <
                                  Math.min(filteredOrders.length, 5) - 1 && (
                                  <div className="h-px bg-[var(--border-divider)] mx-3" />
                                )}
                              </div>
                            );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </IOSCard>
              </motion.div>

              {/* â”€â”€ CENTER: Summary Widgets â”€â”€ */}
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
                    style={{ background: "var(--primary)" }}
                  />
                  <div className="relative flex flex-col items-center text-center gap-3">
                    <div
                      className="w-[44px] h-[44px] rounded-[13px] flex items-center justify-center"
                      style={{ background: "rgba(0,122,255,0.10)" }}
                    >
                      <ClipboardList
                        className="h-[20px] w-[20px]"
                        style={{ color: "var(--primary)" }}
                      />
                    </div>
                    <div>
                      <p className="text-[28px] font-bold text-[var(--foreground)] leading-[32px] tracking-tight">
                        {orderStats.total}
                      </p>
                      <p className="text-[12px] font-medium text-[var(--muted-foreground)] leading-[16px] mt-1">
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
                    style={{ background: "var(--erp-success)" }}
                  />
                  <div className="relative flex flex-col items-center text-center gap-3">
                    <div
                      className="w-[44px] h-[44px] rounded-[13px] flex items-center justify-center"
                      style={{ background: "rgba(52,199,89,0.10)" }}
                    >
                      <CheckCircle2
                        className="h-[20px] w-[20px]"
                        style={{ color: "var(--erp-success)" }}
                      />
                    </div>
                    <div>
                      <p className="text-[28px] font-bold text-[var(--foreground)] leading-[32px] tracking-tight">
                        {
                          orderStats.completed
                        }
                      </p>
                      <p className="text-[12px] font-medium text-[var(--muted-foreground)] leading-[16px] mt-1">
                        Completed Orders
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* â”€â”€ RIGHT: Production Panel â”€â”€ */}
              <motion.div variants={staggerItem} className="order-3">
                <IOSCard variant="elevated" padding="lg" className="h-full">
                  <div className="mb-4">
                    <h3 className="text-[17px] font-bold text-[var(--foreground)] leading-[22px]">
                      Production
                    </h3>
                    <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
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
                          <div className="flex items-center gap-3 p-2.5 rounded-[12px] hover:bg-[var(--muted)] transition-all">
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
                                      ? "var(--primary)"
                                      : item.color === "orange"
                                        ? "var(--erp-warning)"
                                        : item.color === "purple"
                                          ? "var(--chart-5)"
                                          : "var(--erp-success)",
                                }}
                              />
                            </div>
                            <span className="text-[14px] font-medium text-[var(--foreground)] flex-1">
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
                                    ? "var(--primary)"
                                    : item.color === "orange"
                                      ? "var(--erp-warning)"
                                      : item.color === "purple"
                                        ? "var(--chart-5)"
                                        : "var(--erp-success)",
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)] px-1 mb-3">
                        Production Progress
                      </p>
                      <div className="space-y-3 px-1">
                        {[
                          {
                            label: "Completion Rate",
                            value: orderStats.completed,
                            max: Math.max(orderStats.total, 1),
                            color: "var(--erp-success)",
                            bg: "rgba(52,199,89,0.08)",
                          },
                          {
                            label: "In Progress",
                            value: orderStats.processing,
                            max: Math.max(orderStats.total, 1),
                            color: "var(--primary)",
                            bg: "rgba(0,122,255,0.08)",
                          },
                          {
                            label: "Pending",
                            value: orderStats.pending,
                            max: Math.max(orderStats.total, 1),
                            color: "var(--erp-warning)",
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
                                <span className="text-[13px] font-medium text-[var(--foreground)]">
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)] px-1 mb-2">
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
                            <div className="flex items-center gap-2.5 p-2.5 rounded-[10px] hover:bg-[var(--muted)] transition-colors cursor-pointer group">
                              <link.icon className="h-[14px] w-[14px] text-[var(--muted-foreground)] group-hover:text-[var(--muted-foreground)] transition-colors" />
                              <span className="text-[13px] font-medium text-[var(--foreground)] flex-1">
                                {link.label}
                              </span>
                              <ChevronRight className="h-3 w-3 text-[var(--muted-foreground)] group-hover:text-[var(--muted-foreground)] transition-colors" />
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
            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            â”€â”€ ADMIN/OWNER VIEW: KPI Stats + Table â”€â”€
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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
                  displayValue={formatINR(orderStats.revenue)}
                  change={0}
                  icon={IndianRupee}
                  color="green"
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

            {/* â”€â”€ Table (Admin/Owner only) â”€â”€ */}
            <motion.div variants={staggerItem}>
              <IOSCard
                variant="elevated"
                padding="none"
                className="hidden md:block overflow-hidden glass-premium !rounded-[20px]"
              >
              <div ref={tableContainerRef} className="max-h-[calc(100vh-320px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="glass-table-header hover:bg-transparent border-b border-white/[0.07] dark:border-white/[0.07] sticky top-0 z-10 bg-white/90 dark:bg-[#0F1117]/90 backdrop-blur-sm">
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide pl-5">
                      Order
                    </TableHead>
                    {!isStaff && (
                      <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                        Financials
                      </TableHead>
                    )}
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                      Timeline / Status
                    </TableHead>
                    <TableHead className="w-[120px] py-3 pr-5 text-right font-semibold text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-5">
                          <div className="h-16 w-full rounded-[10px] bg-[var(--muted)] shimmer" />
                        </TableCell>
                        <TableCell>
                          <div className="h-16 w-full rounded-[10px] bg-[var(--muted)] shimmer" />
                        </TableCell>
                        <TableCell>
                          <div className="h-16 w-full rounded-[10px] bg-[var(--muted)] shimmer" />
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="h-10 w-10 rounded-full bg-[var(--muted)] shimmer ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isStaff ? 3 : 4}
                        className="text-center"
                      >
                        <TableEmptyState
                          variant={searchQuery ? "no-results" : "no-data"}
                          title={searchQuery ? "No orders match your search" : "No active orders"}
                          subtitle={searchQuery ? "Try adjusting your search or filters" : "Create your first order to start production"}
                          action={!searchQuery ? { label: "+ New Order", onClick: handleAddNewClick } : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order: any, index: number) => {
                      const derived = deriveOrderStatusFromOrder(order);
                      return (
                      <motion.tr
                        key={order.id ?? index}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: index * 0.03,
                          duration: 0.25,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="group glass-table-row hover:bg-[var(--muted)] border-b border-[var(--border)] transition-colors"
                      >
                        <TableCell className="pl-5 py-4">
                          <div className="flex flex-col">
                            <span className="text-[17px] font-bold text-[var(--foreground)] leading-[22px]">
                              {order.productName ?? order.product_name ?? "â€”"}
                            </span>
                            <span className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
                              Client: {order.client?.name ?? order.clients?.name ?? "â€”"}
                            </span>
                            <div className="flex items-center gap-2 mt-1.5">
                              <IOSBadge
                                color="gray"
                                variant="tinted"
                                size="small"
                              >
                                {order.quantity ?? 0} {order.unit ?? "kg"}
                              </IOSBadge>
                              <span className="text-[11px] text-[var(--muted-foreground)] font-mono uppercase">
                                {(order.id ?? "").slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        {/* Financials column â€” Owner only */}
                        {!isStaff && (
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[20px] font-bold text-[var(--primary)]">
                                {formatINR(Number(order.totalAmount ?? order.total_amount ?? 0))}
                              </span>
                              {(order.totalPaid ?? order.total_paid ?? 0) > 0 && (
                                <span className="text-[13px] text-[var(--erp-success)] font-semibold">
                                  Paid: {formatINR(Number(order.totalPaid ?? order.total_paid ?? 0))}
                                </span>
                              )}
                              {order.paymentStatus !== "Paid" &&
                                order.paymentStatus !== "paid" &&
                                order.totalAmount - (order.totalPaid || 0) >
                                  0 && (
                                  <span className="text-[13px] text-[var(--erp-warning)] font-semibold">
                                    Due: {formatINR(Number(order.totalAmount - (order.totalPaid || 0)))}
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
                                <Loader2 className="h-[14px] w-[14px] animate-spin text-[var(--primary)]" />
                              ) : (
                                <div
                                  className={cn(
                                    "h-[8px] w-[8px] rounded-full",
                                    derived === "completed"
                                      ? "bg-[var(--erp-success)]"
                                      : derived === "processing"
                                        ? "bg-[var(--erp-warning)] animate-pulse"
                                        : derived === "awaiting_payment"
                                          ? "bg-amber-500 animate-pulse"
                                          : derived === "active"
                                            ? "bg-[var(--primary)]"
                                            : derived === "cancelled"
                                              ? "bg-red-500"
                                              : derived === "on_hold"
                                                ? "bg-purple-500"
                                                : "bg-[var(--muted-foreground)]",
                                  )}
                                />
                              )}
                              <IOSBadge
                                color={getStatusBadgeColor(derived)}
                                variant="tinted"
                                size="small"
                              >
                                {getStatusLabel(derived)}
                              </IOSBadge>
                            </div>
                            {/* Due Date */}
                            {order.deliveryDate && (
                              <span className="text-[11px] bg-[var(--muted)] w-fit px-2 py-0.5 rounded-[6px] font-medium text-[var(--muted-foreground)] mt-1.5 ml-1 block">
                                Due:{" "}
                                {new Date(
                                  order.deliveryDate,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="pr-5 text-right py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* Invoice download – Owner only */}
                            {!isStaff && (
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
                                onClick={() => generateInvoice(order)}
                              >
                                <Download className="h-4 w-4" />
                              </motion.button>
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
                              <DropdownMenuContent
                                align="end"
                                className="w-52 rounded-[12px]"
                              >

                                {/* Edit Order – Owner only */}
                                {!isStaff && (
                                  <DropdownMenuItem
                                    onClick={() => openEditDialog(order)}
                                    className="rounded-[8px]"
                                  >
                                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                                    Order
                                  </DropdownMenuItem>
                                )}
                                {/* Record Payment – Owner only */}
                                {!isStaff && (
                                  <DropdownMenuItem
                                    onClick={() => openPaymentDialog(order)}
                                    className="rounded-[8px]"
                                  >
                                    <IndianRupee className="mr-2 h-4 w-4 text-[var(--erp-success)]" />{" "}
                                    Record Payment
                                  </DropdownMenuItem>
                                )}
                                {isAdmin && (
                                  <DropdownMenuItem
                                    className="text-[var(--destructive)] rounded-[8px]"
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
                    );
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            </IOSCard>

            {/* ── Pagination ── */}
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalFiltered}
              pageSize={15}
              onPageChange={setCurrentPage}
            />

            {/* ═══ PREMIUM MOBILE ORDER CARDS ═══ */}
            <div style={{ padding: '0 2px' }} className="block md:hidden">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {ordersLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-gray-100 dark:bg-[#1C2333] rounded-2xl px-4 py-3 border-l-4 border-gray-300 dark:border-gray-600">
                    <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 shimmer" />
                    <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700 shimmer mt-2" />
                    <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700 shimmer mt-2" />
                  </div>
                ))
              ) : filteredOrders.length === 0 ? (
                <div style={{ padding: '64px 0', textAlign: 'center' }}>
                  <Factory style={{ height: 40, width: 40, margin: '0 auto 12px', color: '#475569' }} />
                  <p style={{ color: '#94a3b8', fontSize: 14, fontFamily: "-apple-system, 'SF Pro Display', 'Segoe UI', sans-serif" }}>No active orders</p>
                </div>
              ) : filteredOrders.map((order: any, idx: number) => {
                const derived = deriveOrderStatusFromOrder(order);
                const s = derived;
                const borderColor =
                  s === 'active' ? '#2563EB' :
                  s === 'pending' ? '#F59E0B' :
                  s === 'processing' ? '#F59E0B' :
                  s === 'awaiting_payment' ? '#F59E0B' :
                  s === 'completed' ? '#22C55E' :
                  s === 'cancelled' ? '#EF4444' :
                  s === 'on_hold' ? '#A855F7' : '#94A3B8';
                const badgeClasses =
                  s === 'active'           ? 'bg-blue-500/15 text-blue-500 dark:text-blue-400' :
                  s === 'pending'          ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400' :
                  s === 'processing'       ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400' :
                  s === 'awaiting_payment' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                  s === 'completed'        ? 'bg-green-500/15 text-green-500 dark:text-green-400' :
                  s === 'cancelled'        ? 'bg-red-500/15 text-red-500 dark:text-red-400' :
                  s === 'on_hold'          ? 'bg-purple-500/15 text-purple-500 dark:text-purple-400' :
                                             'bg-slate-500/15 text-slate-500 dark:text-slate-400';
                const statusLabel = getStatusLabel(derived);
                const paymentRaw = order.paymentStatus;
                const isPaid = paymentRaw === 'paid' || paymentRaw === 'Paid';
                const clientName = order.client?.name ?? order.clients?.name;
                const productName = order.productName ?? order.product_name;
                const amount = Number(order.totalAmount ?? order.total_amount ?? 0);
                const qty = order.quantity;
                const unit = order.unit ?? 'kg';
                const createdAt = order.createdAt;

                return (
                  <div
                    key={order.id ?? idx}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !isBottomSheetOpen) {
                        e.preventDefault();
                        openEditDialog(order);
                      }
                    }}
                    className={cn(
                      "bg-gray-50 dark:bg-[#1C2333] rounded-2xl overflow-hidden",
                      "shadow-[0_2px_12px_rgba(15,23,42,0.06)] active:scale-[0.98]",
                      "transition-transform cursor-pointer select-none",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    )}
                    style={{ borderLeft: `4px solid ${borderColor}` }}
                    onTouchStart={() => handleLongPressStart(order)}
                    onTouchEnd={handleLongPressEnd}
                    onTouchCancel={handleLongPressEnd}
                    onMouseDown={() => handleLongPressStart(order)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onClick={() => {
                      if (!isBottomSheetOpen) openEditDialog(order);
                    }}
                  >
                    <div className="px-4 py-3">
                      {/* Row 1: Product name (bold, truncate) · status badge */}
                      <div className="flex justify-between items-center min-h-[22px]">
                        <span className="text-gray-900 dark:text-white text-sm font-bold truncate mr-2">
                          {productName || '—'}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap uppercase shrink-0",
                          badgeClasses
                        )}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Row 2: ₹ amount (blue) · qty + payment badge */}
                      <div className="flex justify-between items-center mt-1 min-h-[22px]">
                        <span className="text-blue-500 dark:text-blue-400 text-sm font-semibold tabular-nums">
                          ₹{Number(amount).toLocaleString('en-IN')}
                        </span>
                        <div className="flex items-center gap-2">
                          {qty != null && (
                            <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                              {qty} {unit}
                            </span>
                          )}
                          {paymentRaw && (
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap uppercase",
                              isPaid
                                ? "bg-green-500/15 text-green-500 dark:text-green-400"
                                : "bg-red-500/15 text-red-500 dark:text-red-400"
                            )}>
                              {isPaid ? 'PAID' : 'UNPAID'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Row 3: client · date · chevron */}
                      <div className="flex justify-between items-center mt-1 min-h-[20px]">
                        <span className="text-gray-500 dark:text-gray-400 text-xs truncate mr-2">
                          {clientName || '—'}
                          {createdAt && ` · ${new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* â•â•â• LONG-PRESS BOTTOM SHEET â€” MobileSheet â•â•â• */}
      <MobileSheet open={isBottomSheetOpen} onClose={closeBottomSheet}>
        {longPressedOrder && (
          <>
            {/* Header */}
            <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--overlay-border, rgba(15,23,42,0.06))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--overlay-text-primary, #0F172A)', letterSpacing: '-0.5px', lineHeight: 1.3, margin: 0, fontFamily: "Inter, -apple-system, sans-serif" }}>
                  {longPressedOrder.productName ?? longPressedOrder.product_name ?? 'Order'}
                </h2>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  background: (() => {
                    const ds = deriveOrderStatusFromOrder(longPressedOrder);
                    if (ds === 'completed') return 'rgba(48,209,88,0.1)';
                    if (ds === 'processing') return 'rgba(255,149,0,0.1)';
                    if (ds === 'awaiting_payment') return 'rgba(245,158,11,0.1)';
                    if (ds === 'active') return 'rgba(10,132,255,0.1)';
                    if (ds === 'cancelled') return 'rgba(239,68,68,0.1)';
                    if (ds === 'on_hold') return 'rgba(168,85,247,0.1)';
                    return 'rgba(142,142,147,0.1)';
                  })(),
                  color: (() => {
                    const ds = deriveOrderStatusFromOrder(longPressedOrder);
                    if (ds === 'completed') return '#30D158';
                    if (ds === 'processing') return '#FF9F0A';
                    if (ds === 'awaiting_payment') return '#D97706';
                    if (ds === 'active') return '#0A84FF';
                    if (ds === 'cancelled') return '#EF4444';
                    if (ds === 'on_hold') return '#A855F7';
                    return '#8E8E93';
                  })(),
                  border: `1px solid ${(() => {
                    const ds = deriveOrderStatusFromOrder(longPressedOrder);
                    if (ds === 'completed') return 'rgba(48,209,88,0.2)';
                    if (ds === 'processing') return 'rgba(255,149,0,0.2)';
                    if (ds === 'awaiting_payment') return 'rgba(245,158,11,0.2)';
                    if (ds === 'active') return 'rgba(10,132,255,0.2)';
                    if (ds === 'cancelled') return 'rgba(239,68,68,0.2)';
                    if (ds === 'on_hold') return 'rgba(168,85,247,0.2)';
                    return 'rgba(142,142,147,0.2)';
                  })()}`
                }}>
                  {getStatusLabel(deriveOrderStatusFromOrder(longPressedOrder))}
                </span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--overlay-text-secondary, #64748B)', margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: "Inter, sans-serif" }}>
                <span>{formatINR(Number(longPressedOrder.totalAmount ?? 0))}</span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--overlay-text-muted, #94A3B8)', display: 'inline-block' }} />
                <span>{longPressedOrder.quantity ?? 0} {longPressedOrder.unit ?? 'items'}</span>
              </p>
            </div>

            {/* Action Items */}
            <div className="flex flex-col gap-1 py-2">
              <button
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-[var(--foreground)] text-left w-full"
                onClick={() => { closeBottomSheet(); setTimeout(() => openEditDialog(longPressedOrder), 400); }}
              >
                <Edit2 className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                Edit Order
              </button>

              <button
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-[var(--foreground)] text-left w-full"
                onClick={() => { closeBottomSheet(); showToast('Share link copied!'); }}
              >
                <Send className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                Share
              </button>

              <button
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-[var(--foreground)] text-left w-full"
                onClick={() => { closeBottomSheet(); setTimeout(() => generateInvoice(longPressedOrder), 400); }}
              >
                <FileText className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                View Invoice
              </button>

              <button
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-[var(--foreground)] text-left w-full"
                onClick={() => { closeBottomSheet(); showToast('Order duplicated'); }}
              >
                <Layers className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                Duplicate
              </button>

              {/* Delete */}
              {isAdmin && (
                <button
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-red-500 text-left w-full"
                  onClick={() => { closeBottomSheet(); setOrderToDeleteId(longPressedOrder.id); setIsDeleteDialogOpenConfirm(true); }}
                >
                  <Trash2 className="h-[18px] w-[18px]" />
                  Delete
                </button>
              )}
            </div>
          </>
        )}
      </MobileSheet>

      {/* â•â•â• TOAST NOTIFICATION â•â•â• */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 24, padding: '10px 20px',
          color: '#e2e8f0', fontSize: 14, fontWeight: 500,
          fontFamily: "-apple-system, 'SF Pro Display', 'Segoe UI', sans-serif",
          animation: 'toastSlideUp 0.3s ease forwards',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {toastMessage}
        </div>
      )}

      {/* â•â•â•â•â•â•â• DIALOGS â•â•â•â•â•â•â• */}




      {/* Delete Dialog */}
      <ConfirmDeleteSheet
        open={isDeleteDialogOpenConfirm}
        onClose={() => {
          setIsDeleteDialogOpenConfirm(false);
          setOrderToDeleteId(null);
        }}
        onConfirm={async () => {
          if (orderToDeleteId) {
            await handleDelete(orderToDeleteId);
          }
        }}
        isDeleting={deleteOrder.isPending}
        entityLabel="order"
        entityName={
          orders.find((o) => o.id === orderToDeleteId)?.productName ||
          orders.find((o) => o.id === orderToDeleteId)?.product_name
        }
        consequenceText="will be permanently removed from sales history. Note: This will not restore inventory automatically. This cannot be undone."
      />

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        // GUARD: only accept close
        if (!open) closePaymentDialog();
      }}>
        <DialogContent className="max-w-[480px]" showCloseButton={false}>
          {/* Premium Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(34,197,94,0.4), rgba(255,255,255,0.06))',
                border: '1px solid rgba(255,255,255,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IndianRupee className="h-[18px] w-[18px] text-[#4ade80]" />
              </div>
              <div style={{ minWidth: 0 }}>
                <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', lineHeight: '22px', margin: 0 }}>
                  Record Payment
                </DialogTitle>
                <DialogDescription style={{ fontSize: 13, color: '#64748b', lineHeight: '18px', margin: '2px 0 0' }}>
                  {paymentOrder?.productName} ({paymentOrder?.client?.name || "Client"})
                </DialogDescription>
              </div>
            </div>
            <DialogClose asChild>
              <motion.button
                whileTap={{ scale: 0.9 }}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#94a3b8',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,80,80,0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >
                <X size={16} />
              </motion.button>
            </DialogClose>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            <form id="payment-form" onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                  Amount (₹)
                </label>
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
                <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                  Payment Mode
                </label>
                <Select
                  value={paymentFormData.payment_mode}
                  onValueChange={(v) =>
                    setPaymentFormData({ ...paymentFormData, payment_mode: v })
                  }
                >
                  <SelectTrigger className="h-[44px] rounded-[10px] bg-[var(--muted)] border-none">
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
                <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                  Payment Date
                </label>
                <Input
                  type="date"
                  value={paymentFormData.payment_date}
                  onChange={(e) =>
                    setPaymentFormData({
                      ...paymentFormData,
                      payment_date: e.target.value,
                    })
                  }
                  className="h-[44px] rounded-[10px] bg-[var(--muted)] border-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                  Reference / UTR (Optional)
                </label>
                <Input
                  value={paymentFormData.transaction_ref}
                  onChange={(e) =>
                    setPaymentFormData({
                      ...paymentFormData,
                      transaction_ref: e.target.value,
                    })
                  }
                  className="h-[44px] rounded-[10px] bg-[var(--muted)] border-none"
                  placeholder="e.g. UPI Ref #1234..."
                />
              </div>
              {/* Action buttons â€” inline at end of form */}
              <div style={{ paddingTop: 24, paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
                <div className="flex gap-2">
                  <IOSButton
                    type="button"
                    variant="gray"
                    size="large"
                    onClick={() => closePaymentDialog()}
                    fullWidth
                  >
                    Cancel
                  </IOSButton>
                  <button
                    type="submit"
                    disabled={recordPayment.isPending}
                    className="flex-1 py-3.5 rounded-xl bg-[var(--erp-success)] text-white text-[13px] font-medium cursor-pointer border-none disabled:opacity-50"
                  >
                    {recordPayment.isPending ? "Recording..." : "Save Payment"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* â•â•â• COMPLETION CONFIRMATION MODAL â•â•â• */}
      <CompletionConfirmationModal
        open={isCompletionModalOpen}
        order={completionOrder}
        onCompleteOnly={handleCompleteOnly}
        onCompleteAndInvoice={handleCompleteAndInvoice}
        onCancel={() => { setIsCompletionModalOpen(false); setCompletionOrder(null); }}
        isLoading={isGeneratingInvoice}
      />

      {/* â•â•â• INVOICE PREVIEW MODAL â•â•â• */}
      <InvoicePreviewModal
        open={isInvoicePreviewOpen}
        invoiceData={generatedInvoice}
        editData={invoiceEditData}
        onEditChange={setInvoiceEditData}
        onClose={() => { setIsInvoicePreviewOpen(false); setGeneratedInvoice(null); }}
        onDownloadPDF={() => {}}
        onSendWhatsApp={() => {}}
      />

      {/* â•â•â• GENERATING INVOICE OVERLAY â•â•â• */}
      <AnimatePresence>
        {isGeneratingInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 9997,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 16,
            }}
          >
            <Loader2 size={32} style={{ color: "#10b981", animation: "spin 1s linear infinite" }} />
            <p style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600, fontFamily: "-apple-system, 'SF Pro Display', sans-serif" }}>
              Generating invoice...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
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
              <div className="h-[34px] w-[220px] rounded-[10px] bg-[var(--muted)] shimmer" />
              <div className="h-[20px] w-[280px] rounded-[8px] bg-[var(--muted)] shimmer mt-2" />
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
                      <div className="h-[48px] w-[48px] rounded-[14px] bg-[var(--muted)] shimmer" />
                      <div className="h-[24px] w-[50px] rounded-full bg-[var(--muted)] shimmer" />
                    </div>
                    <div className="h-[34px] w-[120px] rounded-[8px] bg-[var(--muted)] shimmer mb-2" />
                    <div className="h-[16px] w-[90px] rounded-[6px] bg-[var(--muted)] shimmer" />
                  </div>
                ))}
              </div>
            </div>
            {/* Search + Filter Bar Skeleton */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="h-[48px] w-full sm:w-[280px] rounded-[12px] bg-[var(--muted)] shimmer" />
              <div className="h-[40px] w-[120px] rounded-[10px] bg-[var(--muted)] shimmer" />
            </div>
            {/* Table Skeleton — matches real admin order table */}
            <div className="hidden md:block rounded-[20px] border border-[var(--border)] overflow-hidden">
              <div className="h-[44px] bg-[var(--muted)]/30 border-b border-[var(--border)]" />
              <div className="divide-y divide-[var(--border)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="h-[40px] w-[40px] rounded-full bg-[var(--muted)] shimmer flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-[14px] w-3/4 rounded-[4px] bg-[var(--muted)] shimmer" />
                      <div className="h-[12px] w-1/2 rounded-[4px] bg-[var(--muted)] shimmer" />
                    </div>
                    <div className="h-[24px] w-[80px] rounded-full bg-[var(--muted)] shimmer" />
                    <div className="h-[14px] w-[100px] rounded-[4px] bg-[var(--muted)] shimmer" />
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile Card Skeleton — matches mobile card-based order list */}
            <div className="md:hidden space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-[16px] border border-[var(--border)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-[16px] w-2/3 rounded-[4px] bg-[var(--muted)] shimmer" />
                    <div className="h-[24px] w-[72px] rounded-full bg-[var(--muted)] shimmer" />
                  </div>
                  <div className="h-[12px] w-1/2 rounded-[4px] bg-[var(--muted)] shimmer" />
                  <div className="h-[12px] w-1/3 rounded-[4px] bg-[var(--muted)] shimmer" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        <OrdersContent />
      </Suspense>
    </ErrorBoundary>
  );
}
