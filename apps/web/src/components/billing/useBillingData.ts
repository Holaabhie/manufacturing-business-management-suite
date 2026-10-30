"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useCachedPage } from "@/hooks/useCachedPage";
import { matchesMonthYear, type MonthYearFilterValue } from "@/components/ui/month-year-filter";
import { apiClient } from "@/lib/api-client";
import { resolvePermissions, hasPermission } from "@/lib/permissions";
import type { Bill, CompanyInfo, BillingStats } from "./types";

export function useBillingData() {
  const t = useTranslations("billing");
  const [bills, setBills] = useState<Bill[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTruncated, setIsTruncated] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [canViewInvoices, setCanViewInvoices] = useState<boolean>(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  const [monthYear, setMonthYear] = useState<MonthYearFilterValue>({
    year: new Date().getFullYear(),
    month: "all",
  });

  const fetchCompanyInfo = useCallback(async () => {
    setCompanyLoading(true);
    try {
      const data = await apiClient.get<{ company?: CompanyInfo }>("/api/profile/company");
      if (data?.company) {
        setCompanyInfo(data.company);
      }
    } catch (error) {
      console.error("Failed to fetch company info:", error);
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, ordersRes, billsRes] = await Promise.all([
        apiClient.get<{ data?: any[] }>("/api/v1/clients"),
        apiClient.get<{ data?: any[]; truncated?: boolean }>("/api/v1/orders"),
        apiClient.get<{ data?: Bill[]; truncated?: boolean }>("/api/v1/billing").catch(() => ({ data: [] as Bill[], truncated: false })),
      ]);

      setClients(clientsRes.data || []);
      setOrders(ordersRes.data || []);
      setBills(billsRes.data || []);
      setIsTruncated(Boolean(billsRes?.truncated || ordersRes?.truncated));
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error(t("toasts.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchUserRole = useCallback(async () => {
    try {
      const data = await apiClient.get<{ user?: any }>("/api/auth/me");
      const role = data?.user?.role || null;
      setUserRole(role);
      const isOwner = role === "Admin" || role === "Owner";
      const perms = data?.user?.resolvedPermissions || resolvePermissions(role, data?.user?.customPermissions);
      setCanViewInvoices(hasPermission(perms, "invoices.view", isOwner));
    } catch (error) {
      console.error("Failed to fetch user role:", error);
    } finally {
      setRoleLoading(false);
    }
  }, []);

  // ── Page State Persistence ────────────────────────────
  const { restoreState, persist, scrollYRef } = useCachedPage({
    pageKey: "billing",
    maxAgeMs: 5 * 60 * 1000,
  });

  const persistRef = useRef({ searchTerm, bills });
  useEffect(() => {
    persistRef.current = { searchTerm, bills };
  });

  useEffect(() => {
    const cached = restoreState();
    if (cached) {
      if (cached.searchTerm) setSearchTerm(cached.searchTerm as string);
      if (Array.isArray(cached.bills) && (cached.bills as any[]).length > 0) {
        setBills(cached.bills as Bill[]);
        setLoading(false);
      }
    }
    return () => {
      persist({ ...persistRef.current, scrollY: scrollYRef.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
    fetchCompanyInfo();
    fetchUserRole();

    const handleCompanyUpdated = () => {
      fetchCompanyInfo();
    };
    window.addEventListener("company-updated", handleCompanyUpdated);
    return () => window.removeEventListener("company-updated", handleCompanyUpdated);
  }, [fetchData, fetchCompanyInfo, fetchUserRole]);

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchesSearch =
        bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = matchesMonthYear(bill.billDate, monthYear);
      return matchesSearch && matchesDate;
    });
  }, [bills, searchTerm, monthYear]);

  const stats: BillingStats = useMemo(() => {
    return {
      total: bills.length,
      draft: bills.filter((b) => b.status === "draft").length,
      sent: bills.filter((b) => b.status === "sent").length,
      paid: bills.filter((b) => b.status === "paid").length,
      totalValue: bills.reduce((acc, b) => acc + b.totalAmount, 0),
      paidValue: bills.filter((b) => b.status === "paid").reduce((acc, b) => acc + b.totalAmount, 0),
    };
  }, [bills]);

  return {
    bills,
    filteredBills,
    clients,
    orders,
    loading,
    isTruncated,
    searchTerm,
    setSearchTerm,
    monthYear,
    setMonthYear,
    userRole,
    roleLoading,
    canViewInvoices,
    companyInfo,
    companyLoading,
    stats,
    fetchData,
  };
}
