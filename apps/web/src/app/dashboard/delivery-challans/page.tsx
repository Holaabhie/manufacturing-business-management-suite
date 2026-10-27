"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Truck,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Copy,
  Send,
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  RotateCcw,
  Clock,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { TruncatedDataBanner } from "@/components/ui/TruncatedDataBanner";

import { StatWidget } from "@/components/ui/StatWidget";
import { MonthYearFilter, matchesMonthYear, type MonthYearFilterValue } from "@/components/ui/month-year-filter";
import { IOSSearchBar } from "@/components/ui/ios/IOSSearchBar";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { TableEmptyState } from "@/components/ui/TableEmptyState";
import { MobileTableCards, type MobileField } from "@/components/ui/MobileTableCards";
import { ConfirmDeleteSheet } from "@/components/ui/ConfirmDeleteSheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatters } from "@/hooks/useFormatters";
import { cn } from "@/lib/utils";

import type { DeliveryChallan, ChallanStatus } from "@/modules/delivery-challans/domain/types";
import { CreateChallanModal } from "@/components/delivery-challans/CreateChallanModal";
import { ChallanDetailModal } from "@/components/delivery-challans/ChallanDetailModal";

const STATUS_TABS: { labelKey: string; value: string }[] = [
  { labelKey: "filterAll", value: "all" },
  { labelKey: "filterDraft", value: "Draft" },
  { labelKey: "filterDispatched", value: "Dispatched" },
  { labelKey: "filterDelivered", value: "Delivered" },
  { labelKey: "filterReturned", value: "Returned" },
  { labelKey: "filterCancelled", value: "Cancelled" },
];

function DeliveryChallansContent() {
  const t = useTranslations("challans");
  const tCommon = useTranslations("common");
  const { formatDate } = useFormatters();
  const searchParams = useSearchParams();
  const router = useRouter();

  // State
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthYear, setMonthYear] = useState<MonthYearFilterValue>({
    year: new Date().getFullYear(),
    month: "all",
  });

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [challanToEdit, setChallanToEdit] = useState<DeliveryChallan | null>(null);
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [challanToDelete, setChallanToDelete] = useState<DeliveryChallan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  // Check query params for ?new=true
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setChallanToEdit(null);
      setIsCreateOpen(true);
    }
  }, [searchParams]);

  // Fetch Delivery Challans
  const fetchChallans = useCallback(async () => {
    try {
      const res = await fetch("/api/delivery-challans");
      if (!res.ok) throw new Error("Failed to fetch delivery challans");
      const data = await res.json();
      setChallans(Array.isArray(data) ? data : data.data || []);
      setIsTruncated(Boolean(data?.truncated));
    } catch (err: unknown) {
      console.error(err);
      toast.error(t("toastFailedLoad"));
    }
  }, []);

  // Fetch Clients and Orders
  const fetchAuxData = useCallback(async () => {
    try {
      const [clientsRes, ordersRes] = await Promise.allSettled([
        fetch("/api/clients").then((r) => r.json()),
        fetch("/api/orders").then((r) => r.json()),
      ]);

      if (clientsRes.status === "fulfilled") {
        const val = clientsRes.value;
        setClients(Array.isArray(val) ? val : val.data || []);
      }
      if (ordersRes.status === "fulfilled") {
        const val = ordersRes.value;
        setOrders(Array.isArray(val) ? val : val.orders || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const initData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchChallans(), fetchAuxData()]);
    setLoading(false);
  }, [fetchChallans, fetchAuxData]);

  useEffect(() => {
    initData();
  }, [initData]);

  // Earliest date for MonthYearFilter
  const earliestDate = useMemo(() => {
    if (challans.length === 0) return new Date();
    const dates = challans.map((c) => new Date(c.challan_date).getTime()).filter((t) => !isNaN(t));
    if (dates.length === 0) return new Date();
    return new Date(Math.min(...dates));
  }, [challans]);

  // Filtered Delivery Challans
  const filteredChallans = useMemo(() => {
    return challans.filter((c) => {
      // Status filter
      if (statusFilter !== "all" && c.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNumber = c.challan_number.toLowerCase().includes(query);
        const matchConsignee = c.consignee?.name?.toLowerCase().includes(query);
        const matchGstin = c.consignee?.gstin?.toLowerCase().includes(query);
        const matchVehicle = c.vehicle_no?.toLowerCase().includes(query);
        const matchLr = c.lr_number?.toLowerCase().includes(query);
        if (!matchNumber && !matchConsignee && !matchGstin && !matchVehicle && !matchLr) {
          return false;
        }
      }

      // Month/Year filter
      if (!matchesMonthYear(c.challan_date, monthYear)) {
        return false;
      }

      return true;
    });
  }, [challans, statusFilter, searchTerm, monthYear]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = challans.length;
    const draft = challans.filter((c) => c.status === "Draft").length;
    const dispatched = challans.filter((c) => c.status === "Dispatched").length;
    const delivered = challans.filter((c) => c.status === "Delivered").length;
    return {
      total,
      draft,
      dispatched,
      delivered,
    };
  }, [challans]);

  // Status transitions
  const handleStatusChange = async (id: string, newStatus: ChallanStatus) => {
    try {
      const res = await fetch(`/api/delivery-challans/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }

      const updated = await res.json();
      setChallans((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (selectedChallan?.id === id) {
        setSelectedChallan(updated);
      }
      toast.success(t("toastStatusUpdated"));
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Duplicate challan
  const handleDuplicate = async (challan: DeliveryChallan) => {
    try {
      const res = await fetch(`/api/delivery-challans/${challan.id}/duplicate`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to duplicate delivery challan");
      }

      const duplicated = await res.json();
      setChallans((prev) => [duplicated, ...prev]);
      toast.success(t("toastDuplicated"));
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate delivery challan");
    }
  };

  // Delete challan
  const handleDeleteConfirm = async () => {
    if (!challanToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/delivery-challans/${challanToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete delivery challan");
      }

      setChallans((prev) => prev.filter((c) => c.id !== challanToDelete.id));
      if (selectedChallan?.id === challanToDelete.id) {
        setIsPreviewOpen(false);
        setSelectedChallan(null);
      }
      setChallanToDelete(null);
      toast.success(t("toastDeleted"));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete delivery challan");
    } finally {
      setIsDeleting(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async (challan: DeliveryChallan) => {
    try {
      const res = await fetch(`/api/delivery-challans/${challan.id}/generate-pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");

      const isFallback = res.headers.get("X-Fallback") === "html";
      if (isFallback) {
        const html = await res.text();
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      } else {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Delivery_Challan_${challan.challan_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      toast.success(t("toastPdfGenerated"));
    } catch (err: any) {
      toast.error(err.message || t("toastPdfFailed"));
    }
  };

  const getBadgeConfig = (status: ChallanStatus): { color: "blue" | "green" | "red" | "orange" | "purple" | "gray"; variant: "filled" | "tinted" | "outline" } => {
    switch (status) {
      case "Dispatched":
        return { color: "blue", variant: "tinted" };
      case "Delivered":
        return { color: "green", variant: "tinted" };
      case "Returned":
        return { color: "orange", variant: "tinted" };
      case "Cancelled":
        return { color: "red", variant: "tinted" };
      case "Draft":
      default:
        return { color: "gray", variant: "tinted" };
    }
  };

  // Mobile Table Fields
  const mobileFields: MobileField<DeliveryChallan>[] = [
    {
      key: "consignee",
      label: t("thConsignee"),
      primary: true,
      render: (_, row) => (
        <div>
          <span className="font-semibold text-sm">{row.consignee?.name || "No consignee"}</span>
          <span className="block text-[11px] font-mono text-[var(--muted-foreground)]">
            {row.challan_number}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: t("thStatus"),
      render: (val) => {
        const cfg = getBadgeConfig(val as ChallanStatus);
        return (
          <IOSBadge color={cfg.color} variant={cfg.variant} size="small">
            {t(`status${val}` as any) || val}
          </IOSBadge>
        );
      },
    },
    {
      key: "purpose",
      label: t("thPurpose"),
      render: (val) => (
        <span className="text-xs font-medium text-[var(--foreground)]">{val}</span>
      ),
    },
    {
      key: "challan_date",
      label: t("thDate"),
      render: (val) => (
        <span className="text-xs text-[var(--muted-foreground)]">
          {formatDate(val)}
        </span>
      ),
    },
  ];

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-5 p-3 sm:p-6 pb-24 sm:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)] truncate">
              {t("title")}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              {challans.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5 truncate">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <IOSButton
            variant="filled"
            onClick={() => {
              setChallanToEdit(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 shadow-md shadow-blue-500/15"
          >
            <Plus className="w-4 h-4" />
            <span>{t("btnCreateChallan")}</span>
          </IOSButton>
        </div>
      </div>

      <TruncatedDataBanner truncated={isTruncated} count={challans.length} entityName="delivery challans" />

      {/* KPI Stat Widgets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 min-w-0 w-full overflow-hidden">
        <StatWidget
          label={t("cardTotalChallans")}
          value={stats.total}
          valueTitle={`${stats.total} challans`}
          icon={Truck}
          color="blue"
          delay={0}
        />

        <StatWidget
          label={t("cardDraft")}
          value={stats.draft}
          valueTitle={`${stats.draft} draft challans`}
          icon={Clock}
          color="gray"
          delay={0.05}
        />

        <StatWidget
          label={t("cardDispatched")}
          value={stats.dispatched}
          valueTitle={`${stats.dispatched} dispatched`}
          icon={Send}
          color="purple"
          delay={0.1}
        />

        <StatWidget
          label={t("cardDelivered")}
          value={stats.delivered}
          valueTitle={`${stats.delivered} delivered`}
          icon={CheckCircle2}
          color="green"
          delay={0.15}
        />
      </div>

      {/* Toolbar: Status Tabs + Search + MonthYearFilter */}
      <div className="space-y-3 min-w-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide min-w-0">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter.toLowerCase() === tab.value.toLowerCase();
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {t(tab.labelKey as any)}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 min-w-0">
          <div className="flex-1 max-w-md">
            <IOSSearchBar
              value={searchTerm}
              onValueChange={setSearchTerm}
              placeholder={t("searchPlaceholder")}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <MonthYearFilter
              value={monthYear}
              onChange={setMonthYear}
              earliestDate={earliestDate}
            />
          </div>
        </div>
      </div>

      {/* Content: Loading Skeleton, Empty State, or Table / Cards */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : filteredChallans.length === 0 ? (
        <TableEmptyState
          variant="no-data"
          title={t("emptyTitle")}
          subtitle={t("emptyDescription")}
          action={{
            label: t("btnCreateFirstChallan"),
            onClick: () => {
              setChallanToEdit(null);
              setIsCreateOpen(true);
            },
          }}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto scrollbar-hide">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow className="border-b border-[var(--border)] bg-[var(--muted)]/40 hover:bg-[var(--muted)]/40">
                    <TableHead className="w-[160px] py-3.5 pl-4 font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                      {t("thChallanNumber")}
                    </TableHead>
                    <TableHead className="w-[220px] py-3.5 font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                      {t("thConsignee")}
                    </TableHead>
                    <TableHead className="w-[120px] py-3.5 font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                      {t("thDate")}
                    </TableHead>
                    <TableHead className="w-[110px] py-3.5 font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                      {t("thPurpose")}
                    </TableHead>
                    <TableHead className="w-[100px] py-3.5 font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                      {t("thItems")}
                    </TableHead>
                    <TableHead className="w-[130px] py-3.5 font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                      {t("thStatus")}
                    </TableHead>
                    <TableHead className="w-[70px] py-3.5 pr-4 text-right font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                      {t("thActions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChallans.map((challan) => {
                    const cfg = getBadgeConfig(challan.status);
                    const canEdit = challan.status === "Draft" || challan.status === "Dispatched";
                    const canDelete = challan.status === "Draft" || challan.status === "Cancelled";

                    return (
                      <TableRow
                        key={challan.id}
                        onClick={() => {
                          setSelectedChallan(challan);
                          setIsPreviewOpen(true);
                        }}
                        className="cursor-pointer border-b border-[var(--border)]/60 hover:bg-[var(--muted)]/30 transition-colors"
                      >
                        <TableCell className="py-3 pl-4 font-mono font-bold text-xs text-[var(--foreground)]">
                          {challan.challan_number}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-[var(--foreground)] block truncate">
                              {challan.consignee?.name || "-"}
                            </span>
                            {challan.consignee?.gstin && (
                              <span className="text-[10px] font-mono text-[var(--muted-foreground)] block truncate">
                                {challan.consignee.gstin}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-[var(--muted-foreground)]">
                          {formatDate(challan.challan_date)}
                        </TableCell>
                        <TableCell className="py-3 text-xs font-medium text-[var(--foreground)]">
                          {challan.purpose}
                        </TableCell>
                        <TableCell className="py-3 text-xs font-mono font-medium text-[var(--muted-foreground)]">
                          {challan.items?.length || 0}
                        </TableCell>
                        <TableCell className="py-3">
                          <IOSBadge color={cfg.color} variant={cfg.variant} size="small">
                            {t(`status${challan.status}` as any) || challan.status}
                          </IOSBadge>
                        </TableCell>
                        <TableCell
                          className="py-3 pr-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedChallan(challan);
                                  setIsPreviewOpen(true);
                                }}
                              >
                                {t("actionView")}
                              </DropdownMenuItem>

                              {canEdit && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setChallanToEdit(challan);
                                    setIsCreateOpen(true);
                                  }}
                                >
                                  {t("actionEdit")}
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => handleDuplicate(challan)}
                              >
                                {t("actionDuplicate")}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleDownloadPdf(challan)}
                              >
                                {t("actionDownloadPdf")}
                              </DropdownMenuItem>

                              {challan.status === "Draft" && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(challan.id, "Dispatched")}
                                  className="text-blue-500 font-medium"
                                >
                                  {t("actionMarkDispatched")}
                                </DropdownMenuItem>
                              )}

                              {challan.status === "Dispatched" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(challan.id, "Delivered")}
                                    className="text-green-600 font-medium"
                                  >
                                    {t("actionMarkDelivered")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(challan.id, "Returned")}
                                    className="text-amber-600 font-medium"
                                  >
                                    {t("actionMarkReturned")}
                                  </DropdownMenuItem>
                                </>
                              )}

                              {(challan.status === "Draft" || challan.status === "Dispatched") && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(challan.id, "Cancelled")}
                                  className="text-red-500 font-medium"
                                >
                                  {t("actionCancel")}
                                </DropdownMenuItem>
                              )}

                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setChallanToDelete(challan)}
                                    className="text-red-500 focus:text-red-500"
                                  >
                                    {t("actionDelete")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            <MobileTableCards
              data={filteredChallans}
              fields={mobileFields}
              keyExtractor={(item) => item.id}
              onCardClick={(item: DeliveryChallan) => {
                setSelectedChallan(item);
                setIsPreviewOpen(true);
              }}
            />
          </div>
        </>
      )}

      {/* Create / Edit Modal */}
      <CreateChallanModal
        open={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setChallanToEdit(null);
        }}
        onSuccess={fetchChallans}
        clients={clients}
        orders={orders}
        challanToEdit={challanToEdit}
      />

      {/* Detail Modal */}
      <ChallanDetailModal
        challan={selectedChallan}
        open={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedChallan(null);
        }}
        onEdit={(ch) => {
          setChallanToEdit(ch);
          setIsCreateOpen(true);
        }}
        onDuplicate={handleDuplicate}
        onDownloadPdf={handleDownloadPdf}
        onStatusChange={handleStatusChange}
        onDelete={(ch) => setChallanToDelete(ch)}
      />

      {/* Delete Confirmation Sheet */}
      <ConfirmDeleteSheet
        open={!!challanToDelete}
        onClose={() => setChallanToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        entityLabel={t("entityChallan") || "delivery challan"}
        entityName={challanToDelete?.challan_number}
      />
    </div>
  );
}

function DeliveryChallansLoading() {
  const t = useTranslations("challans");
  return <div className="p-6 text-sm text-[var(--muted-foreground)]">{t("loadingFallback")}</div>;
}

export default function DeliveryChallansPage() {
  return (
    <Suspense fallback={<DeliveryChallansLoading />}>
      <DeliveryChallansContent />
    </Suspense>
  );
}
