import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useCachedPage } from "@/hooks/useCachedPage";
import {
  matchesMonthYear,
  type MonthYearFilterValue,
} from "@/components/ui/month-year-filter";
import { apiClient } from "@/lib/api-client";
import type {
  PurchaseOrder,
  Vendor,
  InventoryItem,
  PurchasingStats,
  TabKey,
} from "./types";

export function usePurchasingData() {
  const tToast = useTranslations("purchasing.toasts");

  const [activeTab, setActiveTab] = useState<TabKey>("orders");
  const [mounted, setMounted] = useState(false);

  // Orders
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");

  // Vendors
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorSearch, setVendorSearch] = useState("");

  // Inventory & Stats
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<PurchasingStats | null>(null);

  // Month/Year filter
  const [monthYear, setMonthYear] = useState<MonthYearFilterValue>({
    year: new Date().getFullYear(),
    month: "all",
  });

  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiClient.get<{ success?: boolean; data?: PurchaseOrder[] }>("/api/purchasing");
      if (data?.success) setOrders(data.data || []);
      else toast.error(tToast("fetchOrdersFailed"));
    } catch {
      toast.error(tToast("fetchOrdersFailed"));
    } finally {
      setOrdersLoading(false);
    }
  }, [tToast]);

  const fetchVendors = useCallback(async () => {
    try {
      const data = await apiClient.get<{ success?: boolean; data?: Vendor[] }>("/api/purchasing/vendors");
      if (data?.success) setVendors(data.data || []);
      else toast.error(tToast("fetchVendorsFailed"));
    } catch {
      toast.error(tToast("fetchVendorsFailed"));
    } finally {
      setVendorsLoading(false);
    }
  }, [tToast]);

  const fetchInventory = useCallback(async () => {
    try {
      const data = await apiClient.get<{ success?: boolean; data?: InventoryItem[] }>("/api/v1/inventory");
      if (data?.success) setInventoryItems(data.data || []);
    } catch {
      // silent
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiClient.get<{ success?: boolean; data?: PurchasingStats }>("/api/purchasing/stats");
      if (data?.success && data.data) setStats(data.data);
    } catch {
      // Fall back to client-side computation
    }
  }, []);

  // ── Page State Persistence ────────────────────────────
  const { restoreState, persist, scrollYRef } = useCachedPage({
    pageKey: "purchasing",
    maxAgeMs: 5 * 60 * 1000,
  });
  const persistRef = useRef({
    activeTab,
    orderSearch,
    vendorSearch,
    orders,
    vendors,
    stats,
  });
  useEffect(() => {
    persistRef.current = {
      activeTab,
      orderSearch,
      vendorSearch,
      orders,
      vendors,
      stats,
    };
  });

  useEffect(() => {
    const cached = restoreState();
    if (cached) {
      if (cached.activeTab) setActiveTab(cached.activeTab as TabKey);
      if (cached.orderSearch) setOrderSearch(cached.orderSearch as string);
      if (cached.vendorSearch) setVendorSearch(cached.vendorSearch as string);
      if (Array.isArray(cached.orders) && cached.orders.length > 0) {
        setOrders(cached.orders as PurchaseOrder[]);
        setOrdersLoading(false);
      }
      if (Array.isArray(cached.vendors) && cached.vendors.length > 0) {
        setVendors(cached.vendors as Vendor[]);
        setVendorsLoading(false);
      }
      if (cached.stats) setStats(cached.stats as PurchasingStats);
    }
    return () => {
      persist({ ...persistRef.current, scrollY: scrollYRef.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchOrders();
    fetchVendors();
    fetchInventory();
    fetchStats();
  }, [fetchOrders, fetchVendors, fetchInventory, fetchStats]);

  // Computed filters
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.poNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.vendorName.toLowerCase().includes(orderSearch.toLowerCase());
    const orderDate = o.orderedAt || o.createdAt;
    const matchesDate = matchesMonthYear(orderDate, monthYear);
    return matchesSearch && matchesDate;
  });

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const totalSpend =
    stats?.totalSpent ??
    orders
      .filter((o) => o.status === "Received")
      .reduce((acc, o) => acc + o.totalAmount, 0);

  const pendingCount =
    stats?.pendingCount ?? orders.filter((o) => o.status === "Pending").length;
  const orderedCount =
    stats?.orderedCount ?? orders.filter((o) => o.status === "Ordered").length;
  const receivedCount =
    stats?.receivedCount ?? orders.filter((o) => o.status === "Received").length;

  return {
    mounted,
    activeTab,
    setActiveTab,
    orders,
    setOrders,
    ordersLoading,
    orderSearch,
    setOrderSearch,
    vendors,
    setVendors,
    vendorsLoading,
    vendorSearch,
    setVendorSearch,
    inventoryItems,
    monthYear,
    setMonthYear,
    filteredOrders,
    filteredVendors,
    totalSpend,
    pendingCount,
    orderedCount,
    receivedCount,
    fetchOrders,
    fetchVendors,
    fetchInventory,
    fetchStats,
  };
}
