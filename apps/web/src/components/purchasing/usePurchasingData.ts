import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useCachedPage } from "@/hooks/useCachedPage";
import { useURLSyncedPagination } from "@/hooks/useURLSyncedPagination";
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

  // URL-synced pagination & search
  const { initialPage, initialSearch, initialLimit, syncToURL } = useURLSyncedPagination({ debounceMs: 300 });

  const [orderPage, setOrderPage] = useState(initialPage);
  const [orderLimit, setOrderLimit] = useState(initialLimit);
  const [debouncedOrderSearch, setDebouncedOrderSearch] = useState(initialSearch || orderSearch);
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  const [vendorPage, setVendorPage] = useState(1);
  const [vendorLimit, setVendorLimit] = useState(25);
  const [debouncedVendorSearch, setDebouncedVendorSearch] = useState("");
  const [vendorsPagination, setVendorsPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  // Debounce order search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedOrderSearch(orderSearch);
      setOrderPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [orderSearch]);

  // Debounce vendor search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedVendorSearch(vendorSearch);
      setVendorPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [vendorSearch]);

  // Sync state to URL
  useEffect(() => {
    if (activeTab === "orders") {
      syncToURL({
        page: orderPage,
        limit: orderLimit,
        q: debouncedOrderSearch,
        filters: { tab: "orders" },
      });
    } else {
      syncToURL({
        page: vendorPage,
        limit: vendorLimit,
        q: debouncedVendorSearch,
        filters: { tab: "vendors" },
      });
    }
  }, [activeTab, orderPage, orderLimit, debouncedOrderSearch, vendorPage, vendorLimit, debouncedVendorSearch, syncToURL]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await apiClient.get<{
        success?: boolean;
        data?: PurchaseOrder[];
        pagination?: { page: number; limit: number; total: number; totalPages: number };
      }>("/api/purchasing", {
        params: {
          page: orderPage,
          limit: orderLimit,
          q: debouncedOrderSearch.trim() ? debouncedOrderSearch.trim().slice(0, 100) : undefined,
        },
      });
      if (data?.success) {
        setOrders(data.data || []);
        if (data.pagination) {
          setOrdersPagination(data.pagination);
        } else {
          setOrdersPagination({ page: orderPage, limit: orderLimit, total: data.data?.length || 0, totalPages: 1 });
        }
      } else {
        toast.error(tToast("fetchOrdersFailed"));
      }
    } catch {
      toast.error(tToast("fetchOrdersFailed"));
    } finally {
      setOrdersLoading(false);
    }
  }, [orderPage, orderLimit, debouncedOrderSearch, tToast]);

  const fetchVendors = useCallback(async () => {
    setVendorsLoading(true);
    try {
      const data = await apiClient.get<{
        success?: boolean;
        data?: Vendor[];
        pagination?: { page: number; limit: number; total: number; totalPages: number };
      }>("/api/purchasing/vendors", {
        params: {
          page: vendorPage,
          limit: vendorLimit,
          q: debouncedVendorSearch.trim() ? debouncedVendorSearch.trim().slice(0, 100) : undefined,
        },
      });
      if (data?.success) {
        setVendors(data.data || []);
        if (data.pagination) {
          setVendorsPagination(data.pagination);
        } else {
          setVendorsPagination({ page: vendorPage, limit: vendorLimit, total: data.data?.length || 0, totalPages: 1 });
        }
      } else {
        toast.error(tToast("fetchVendorsFailed"));
      }
    } catch {
      toast.error(tToast("fetchVendorsFailed"));
    } finally {
      setVendorsLoading(false);
    }
  }, [vendorPage, vendorLimit, debouncedVendorSearch, tToast]);

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
    orderPage,
    setOrderPage,
    orderLimit,
    setOrderLimit,
    ordersPagination,
    vendorPage,
    setVendorPage,
    vendorLimit,
    setVendorLimit,
    vendorsPagination,
  };
}
