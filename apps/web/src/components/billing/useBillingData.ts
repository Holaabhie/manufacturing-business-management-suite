"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useCachedPage } from "@/hooks/useCachedPage";
import { matchesMonthYear, type MonthYearFilterValue } from "@/components/ui/month-year-filter";
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
      const res = await fetch("/api/profile/company", { cache: "no-store" });
      const data = await res.json();
      if (data.company) {
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
        fetch("/api/v1/clients").then((r) => r.json()),
        fetch("/api/v1/orders").then((r) => r.json()),
        fetch("/api/v1/billing").then((r) => r.json()).catch(() => ({ data: [] })),
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
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUserRole(data?.user?.role || null);
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
    companyInfo,
    companyLoading,
    stats,
    fetchData,
  };
}

