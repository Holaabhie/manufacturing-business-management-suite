"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Download,
  Trash2,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IOSCard, IOSButton } from "@/components/ui/ios";
import { toast } from "sonner";
import { exportWorkbook } from "@/lib/excel-export";
import { SettingsHeader } from "../SettingsHeader";

export default function DataSettingsPage() {
  const t = useTranslations("settings");
  const [exportingAll, setExportingAll] = useState(false);
  const [sampleCounts, setSampleCounts] = useState<{
    clients: number;
    inventory: number;
    orders: number;
    total: number;
  } | null>(null);
  const [sampleLoading, setSampleLoading] = useState(true);
  const [sampleRemoving, setSampleRemoving] = useState(false);

  useEffect(() => {
    async function fetchSampleCounts() {
      try {
        const res = await fetch("/api/sample-data");
        if (res.ok) {
          const data = await res.json();
          setSampleCounts(data.counts);
        }
      } catch (err) {
        console.error("Error fetching sample data counts:", err);
      } finally {
        setSampleLoading(false);
      }
    }
    fetchSampleCounts();
  }, []);

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const [invRes, ordersRes, clientsRes, staffRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/orders"),
        fetch("/api/clients"),
        fetch("/api/staff"),
      ]);

      const [invData, ordersData, clientsData, staffData] = await Promise.all([
        invRes.json(),
        ordersRes.json(),
        clientsRes.json(),
        staffRes.json(),
      ]);

      const formattedInventory = (invData.items || []).map((item: any) => ({
        name: item.name || "—",
        quantity: item.quantity ?? 0,
        purchase_cost_per_unit: item.purchase_cost_per_unit ?? 0,
        min_stock_level: item.min_stock_level ?? 0,
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "—",
      }));

      const formattedOrders = (ordersData.orders || []).map((order: any) => ({
        order_id: order.order_id || order._id || "—",
        client_name: order.client_name || order.clientName || "—",
        status: order.status || "—",
        total_amount: order.total_amount ?? order.totalAmount ?? 0,
        date_formatted: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—",
      }));

      const formattedClients = (clientsData.clients || []).map((client: any) => ({
        name: client.name || "—",
        contact: client.phone || client.email || "—",
        total_orders: client.total_orders ?? 0,
        total_value: client.total_spend ?? client.total_value ?? 0,
      }));

      const formattedStaff = (staffData.staff || staffData.members || []).map((member: any) => ({
        fullName: member.fullName || member.name || "—",
        role_display: member.role || "—",
        createdAt: member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—",
        status: member.status || (member.isActive ? "Active" : "Inactive"),
      }));

      const sheets = [
        {
          sheetName: "Inventory",
          data: formattedInventory,
          columns: [
            { header: "Material name", key: "name" },
            { header: "Stock level", key: "quantity" },
            { header: "Unit cost", key: "purchase_cost_per_unit" },
            { header: "Critical stock", key: "min_stock_level" },
            { header: "Last updated", key: "updatedAt" },
          ],
        },
        {
          sheetName: "Orders",
          data: formattedOrders,
          columns: [
            { header: "Order ID", key: "order_id" },
            { header: "Client", key: "client_name" },
            { header: "Status", key: "status" },
            { header: "Amount", key: "total_amount" },
            { header: "Date", key: "date_formatted" },
          ],
        },
        {
          sheetName: "Clients",
          data: formattedClients,
          columns: [
            { header: "Name", key: "name" },
            { header: "Contact", key: "contact" },
            { header: "Total orders", key: "total_orders" },
            { header: "Total value", key: "total_value" },
          ],
        },
        {
          sheetName: "Staff",
          data: formattedStaff,
          columns: [
            { header: "Name", key: "fullName" },
            { header: "Role", key: "role_display" },
            { header: "Join Date", key: "createdAt" },
            { header: "Status", key: "status" },
          ],
        },
      ];

      exportWorkbook(`Complete_Data_Export_${new Date().toISOString().split("T")[0]}.xlsx`, sheets);
      toast.success(t("dataPage.toastExportSuccess"));
    } catch (error) {
      console.error("Export Error:", error);
      toast.error(t("dataPage.toastExportFailed"));
    } finally {
      setExportingAll(false);
    }
  };

  const handleRemoveSampleData = async () => {
    if (!confirm(t("dataPage.confirmPurge"))) {
      return;
    }

    setSampleRemoving(true);
    try {
      const res = await fetch("/api/sample-data", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
      const data = await res.json();
      const count = (data.deleted?.clients || 0) + (data.deleted?.inventory || 0) + (data.deleted?.orders || 0);
      toast.success(t("dataPage.toastPurgeSuccess", { count }));
      setSampleCounts({ clients: 0, inventory: 0, orders: 0, total: 0 });
    } catch (err: any) {
      toast.error(err.message || t("dataPage.toastPurgeFailed"));
    } finally {
      setSampleRemoving(false);
    }
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-0">
      <SettingsHeader
        title={t("dataPage.title")}
        subtitle={t("dataPage.subtitle")}
        icon={Database}
        iconColor="#FF3B30"
      />

      {/* Complete Data Export */}
      <IOSCard className="p-4 sm:p-6 space-y-4">
        <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-[#007AFF]" />
          {t("dataPage.exportTitle")}
        </h3>
        <p className="text-[13px] text-[var(--muted-foreground)] -mt-2">
          {t("dataPage.exportSubtitle")}
        </p>

        <div className="pt-2">
          <IOSButton
            variant="filled"
            color="blue"
            className="rounded-[12px] font-semibold px-8 h-[44px]"
            onClick={handleExportAll}
            disabled={exportingAll}
          >
            {exportingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {t("dataPage.btnExport")}
          </IOSButton>
        </div>
      </IOSCard>

      {/* Starter Sample Data */}
      <IOSCard className="p-4 sm:p-6 space-y-4">
        <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Database className="h-5 w-5 text-[#FF3B30]" />
          {t("dataPage.sampleTitle")}
        </h3>
        <p className="text-[13px] text-[var(--muted-foreground)] -mt-2">
          {t("dataPage.sampleSubtitle")}
        </p>

        {sampleLoading ? (
          <div className="flex items-center gap-2.5 py-4 text-[14px] text-[var(--muted-foreground)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("dataPage.scanning")}
          </div>
        ) : sampleCounts && sampleCounts.total > 0 ? (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[14px] bg-[var(--muted)] border border-[var(--border)] p-3.5 text-center">
                <p className="text-[24px] font-bold text-[var(--foreground)]">{sampleCounts.clients}</p>
                <p className="text-[12px] font-medium text-[var(--muted-foreground)] mt-0.5">{t("dataPage.sampleClients")}</p>
              </div>
              <div className="rounded-[14px] bg-[var(--muted)] border border-[var(--border)] p-3.5 text-center">
                <p className="text-[24px] font-bold text-[var(--foreground)]">{sampleCounts.inventory}</p>
                <p className="text-[12px] font-medium text-[var(--muted-foreground)] mt-0.5">{t("dataPage.sampleItems")}</p>
              </div>
              <div className="rounded-[14px] bg-[var(--muted)] border border-[var(--border)] p-3.5 text-center">
                <p className="text-[24px] font-bold text-[var(--foreground)]">{sampleCounts.orders}</p>
                <p className="text-[12px] font-medium text-[var(--muted-foreground)] mt-0.5">{t("dataPage.sampleOrders")}</p>
              </div>
            </div>

            <IOSButton
              variant="destructive"
              className="w-full sm:w-auto px-6 h-[44px] rounded-[12px]"
              disabled={sampleRemoving}
              onClick={handleRemoveSampleData}
            >
              {sampleRemoving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t("dataPage.btnPurge", { count: sampleCounts.total })}
            </IOSButton>
          </div>
        ) : (
          <div className="py-6 text-center border border-[var(--border)] rounded-[16px] bg-[var(--muted)]/50">
            <CheckCircle2 className="h-9 w-9 text-[#34C759] mx-auto mb-2" />
            <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("dataPage.noSampleTitle")}</p>
            <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
              {t("dataPage.noSampleSubtitle")}
            </p>
          </div>
        )}
      </IOSCard>
    </div>
  );
}
