"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  FileText,
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
  ExternalLink,
  Clock,
  AlertCircle,
  DollarSign,
  ArrowUpDown,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

import type { Quotation, QuoteStatus } from "@/modules/quotes/domain/types";
import { CreateQuoteModal } from "@/components/quotes/CreateQuoteModal";
import { QuoteDetailModal } from "@/components/quotes/QuoteDetailModal";
import { ConvertLinePickerModal } from "@/components/quotes/ConvertLinePickerModal";

const STATUS_TABS: { labelKey: string; value: string }[] = [
  { labelKey: "filterAll", value: "all" },
  { labelKey: "filterDraft", value: "Draft" },
  { labelKey: "filterSent", value: "Sent" },
  { labelKey: "filterAccepted", value: "Accepted" },
  { labelKey: "filterRejected", value: "Rejected" },
  { labelKey: "filterExpired", value: "Expired" },
];

function QuotesContent() {
  const t = useTranslations("quotes");
  const tCommon = useTranslations("common");
  const { formatINR: formatCurrency, formatDate } = useFormatters();
  const searchParams = useSearchParams();
  const router = useRouter();

  // State
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
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
  const [quoteToEdit, setQuoteToEdit] = useState<Quotation | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [convertQuote, setConvertQuote] = useState<Quotation | null>(null);
  const [isLinePickerOpen, setIsLinePickerOpen] = useState(false);

  const canConvertQuote = (quote: Quotation) => {
    if (quote.status !== "Sent" && quote.status !== "Accepted") return false;
    const convertedIndices = new Set(
      (quote.converted_lines || []).filter((cl) => cl.order_id !== null).map((cl) => cl.line_index)
    );
    const eligibleCount = (quote.items || []).filter(
      (item, idx) => !convertedIndices.has(idx) && (item.discount || 0) < item.qty * item.rate
    ).length;
    return eligibleCount > 0;
  };

  const handleConvertQuote = (quote: Quotation) => {
    const convertedIndices = new Set(
      (quote.converted_lines || []).filter((cl) => cl.order_id !== null).map((cl) => cl.line_index)
    );
    if (quote.items.length > 1) {
      setConvertQuote(quote);
      setIsLinePickerOpen(true);
    } else {
      const eligibleIndex = (quote.items || []).findIndex(
        (item, idx) => !convertedIndices.has(idx) && (item.discount || 0) < item.qty * item.rate
      );
      if (eligibleIndex === -1) {
        toast.error(t("cannotConvertDiscountTooHigh") || "Cannot convert line where discount equals or exceeds line amount");
        return;
      }
      router.push(`/dashboard/orders/create?source=quote&quote_id=${quote.id}&line=${eligibleIndex}`);
    }
  };

  const handleLinePickerSelect = (lineIndex: number) => {
    if (!convertQuote) return;
    setIsLinePickerOpen(false);
    router.push(`/dashboard/orders/create?source=quote&quote_id=${convertQuote.id}&line=${lineIndex}`);
  };

  // Check query params for ?new=true
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setQuoteToEdit(null);
      setIsCreateOpen(true);
    }
  }, [searchParams]);

  // Fetch Quotes
  const fetchQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/quotes");
      if (!res.ok) throw new Error("Failed to fetch quotes");
      const data = await res.json();
      setQuotes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load quotations");
    }
  }, []);

  // Fetch Clients and Company Info
  const fetchAuxData = useCallback(async () => {
    try {
      const [clientsRes, companyRes] = await Promise.allSettled([
        fetch("/api/clients").then((r) => r.json()),
        fetch("/api/profile/company").then((r) => r.json()),
      ]);

      if (clientsRes.status === "fulfilled") {
        const val = clientsRes.value;
        setClients(Array.isArray(val) ? val : val.data || []);
      }
      if (companyRes.status === "fulfilled" && companyRes.value?.company) {
        setCompanyInfo(companyRes.value.company);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const initData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchQuotes(), fetchAuxData()]);
    setLoading(false);
  }, [fetchQuotes, fetchAuxData]);

  useEffect(() => {
    initData();
  }, [initData]);

  // Earliest date for MonthYearFilter
  const earliestDate = useMemo(() => {
    if (quotes.length === 0) return new Date();
    const dates = quotes.map((q) => new Date(q.quotation_date).getTime()).filter((t) => !isNaN(t));
    if (dates.length === 0) return new Date();
    return new Date(Math.min(...dates));
  }, [quotes]);

  // Filtered Quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      // Status filter
      if (statusFilter !== "all" && q.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Month/Year filter
      if (!matchesMonthYear(q.quotation_date, monthYear)) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const numMatch = q.quotation_number.toLowerCase().includes(query);
        const clientMatch = q.clientName.toLowerCase().includes(query);
        const gstinMatch = q.clientGSTIN ? q.clientGSTIN.toLowerCase().includes(query) : false;
        return numMatch || clientMatch || gstinMatch;
      }

      return true;
    });
  }, [quotes, statusFilter, monthYear, searchTerm]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = quotes.length;
    const totalValue = quotes.reduce((acc, q) => acc + (q.grand_total || 0), 0);

    const sentQuotes = quotes.filter((q) => q.status === "Sent");
    const sent = sentQuotes.length;

    const acceptedQuotes = quotes.filter((q) => q.status === "Accepted");
    const accepted = acceptedQuotes.length;
    const acceptedValue = acceptedQuotes.reduce((acc, q) => acc + (q.grand_total || 0), 0);

    const rejected = quotes.filter((q) => q.status === "Rejected").length;
    const expired = quotes.filter((q) => q.status === "Expired").length;
    const draft = quotes.filter((q) => q.status === "Draft").length;

    return {
      total,
      totalValue,
      sent,
      accepted,
      acceptedValue,
      rejected,
      expired,
      draft,
    };
  }, [quotes]);

  // Status transitions
  const handleStatusChange = async (id: string, newStatus: QuoteStatus) => {
    try {
      const res = await fetch(`/api/quotes/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }

      const updated = await res.json();
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)));
      if (selectedQuote?.id === id) {
        setSelectedQuote(updated);
      }
      toast.success(t("toastStatusUpdated"));
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Duplicate quote
  const handleDuplicate = async (quote: Quotation) => {
    try {
      const res = await fetch(`/api/quotes/${quote.id}/duplicate`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to duplicate quotation");
      }

      const duplicated = await res.json();
      setQuotes((prev) => [duplicated, ...prev]);
      toast.success(t("toastDuplicated"));
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate quotation");
    }
  };

  // Delete quote
  const handleDeleteConfirm = async () => {
    if (!quoteToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/quotes/${quoteToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete quotation");

      setQuotes((prev) => prev.filter((q) => q.id !== quoteToDelete.id));
      if (selectedQuote?.id === quoteToDelete.id) {
        setIsPreviewOpen(false);
        setSelectedQuote(null);
      }
      toast.success(t("toastDeleted"));
      setQuoteToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete quotation");
    } finally {
      setIsDeleting(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async (quote: Quotation) => {
    try {
      const res = await fetch(`/api/quotes/${quote.id}/generate-pdf`);
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
        a.download = `Quotation_${quote.quotation_number}.pdf`;
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

  const getBadgeConfig = (status: QuoteStatus): { color: "blue" | "green" | "red" | "orange" | "purple" | "gray"; variant: "filled" | "tinted" | "outline" } => {
    switch (status) {
      case "Accepted":
        return { color: "green", variant: "tinted" };
      case "Sent":
        return { color: "blue", variant: "tinted" };
      case "Rejected":
        return { color: "red", variant: "tinted" };
      case "Expired":
        return { color: "orange", variant: "tinted" };
      case "Draft":
      default:
        return { color: "gray", variant: "tinted" };
    }
  };

  // Mobile Table Fields
  const mobileFields: MobileField<Quotation>[] = [
    {
      key: "clientName",
      label: t("thClient"),
      primary: true,
      render: (_, row) => (
        <div>
          <span className="font-semibold text-sm">{row.clientName}</span>
          <span className="block text-[11px] font-mono text-[var(--muted-foreground)]">
            {row.quotation_number}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: t("thStatus"),
      render: (_, row) => {
        const cfg = getBadgeConfig(row.status);
        const totalLines = row.items?.length || 0;
        const convertedLines = (row.converted_lines || []).filter((cl) => cl.order_id !== null);
        const convertedCount = convertedLines.length;
        const isFullyConverted = totalLines > 0 && convertedCount === totalLines;
        const isPartiallyConverted = convertedCount > 0 && convertedCount < totalLines;

        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <IOSBadge color={cfg.color} variant={cfg.variant} size="small">
              {t(`status${row.status}` as any) || row.status}
            </IOSBadge>
            {isFullyConverted && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30">
                {t("badgeConverted")}
              </span>
            )}
            {isPartiallyConverted && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">
                {t("badgePartiallyConverted", { converted: convertedCount, total: totalLines })}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "grand_total",
      label: t("thAmount"),
      render: (val) => (
        <span className="font-bold font-mono text-[var(--foreground)]">
          {formatCurrency(Number(val) || 0)}
        </span>
      ),
    },
    {
      key: "quotation_date",
      label: t("thDate"),
      render: (val) => (
        <span className="text-xs text-[var(--muted-foreground)]">
          {formatDate(val)}
        </span>
      ),
    },
    {
      key: "valid_until",
      label: t("thValidUntil"),
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
              {quotes.length}
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
              setQuoteToEdit(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 shadow-md shadow-blue-500/15"
          >
            <Plus className="w-4 h-4" />
            <span>{t("btnCreateQuote")}</span>
          </IOSButton>
        </div>
      </div>

      {/* KPI Stat Widgets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 min-w-0 w-full overflow-hidden">
        <StatWidget
          label={t("cardTotalQuotes")}
          value={stats.total}
          displayValue={stats.total > 0 ? formatCurrency(stats.totalValue) : "0"}
          valueTitle={`${stats.total} quotes (${formatCurrency(stats.totalValue)})`}
          icon={FileText}
          color="blue"
          delay={0}
        />

        <StatWidget
          label={t("cardSent")}
          value={stats.sent}
          valueTitle={`${stats.sent} quotes awaiting client`}
          icon={Send}
          color="orange"
          delay={0.05}
        />

        <StatWidget
          label={t("cardAccepted")}
          value={stats.accepted}
          displayValue={stats.accepted > 0 ? formatCurrency(stats.acceptedValue) : "0"}
          valueTitle={`${stats.accepted} quotes accepted`}
          icon={CheckCircle2}
          color="green"
          delay={0.1}
        />

        <StatWidget
          label={t("cardRejected")}
          value={stats.rejected}
          valueTitle={`${stats.rejected} quotes rejected`}
          icon={XCircle}
          color="red"
          delay={0.15}
        />
      </div>

      {/* Toolbar Hierarchy: Search & MonthYearFilter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 min-w-0">
        <IOSSearchBar
          value={searchTerm}
          onValueChange={setSearchTerm}
          placeholder={t("searchPlaceholder")}
          className="w-full md:max-w-xs shrink-0"
        />

        <div className="w-full md:w-auto min-w-0 md:max-w-xl">
          <MonthYearFilter
            earliestDate={earliestDate}
            value={monthYear}
            onChange={setMonthYear}
          />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 min-w-0 w-full">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter.toLowerCase() === tab.value.toLowerCase();
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0",
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]"
              )}
            >
              {t(tab.labelKey as any)}
            </button>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden min-w-0 w-full">
        <Table className="table-fixed w-full">
          <TableHeader className="bg-[var(--muted)]/50 border-b border-[var(--border)]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[160px] font-semibold text-[var(--muted-foreground)] py-3 pl-4">
                {t("thQuoteNumber")}
              </TableHead>
              <TableHead className="min-w-[200px] font-semibold text-[var(--muted-foreground)] py-3">
                {t("thClient")}
              </TableHead>
              <TableHead className="w-[120px] font-semibold text-[var(--muted-foreground)] py-3">
                {t("thDate")}
              </TableHead>
              <TableHead className="w-[120px] font-semibold text-[var(--muted-foreground)] py-3">
                {t("thValidUntil")}
              </TableHead>
              <TableHead className="w-[140px] font-semibold text-[var(--muted-foreground)] py-3 text-right">
                {t("thAmount")}
              </TableHead>
              <TableHead className="w-[120px] font-semibold text-[var(--muted-foreground)] py-3 text-center">
                {t("thStatus")}
              </TableHead>
              <TableHead className="w-[60px] py-3 text-center"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-4"><Skeleton className="h-6 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                </TableRow>
              ))
            ) : filteredQuotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <TableEmptyState
                    variant={searchTerm || statusFilter !== "all" ? "no-results" : "no-data"}
                    title={t("emptyTitle")}
                    subtitle={t("emptyDescription")}
                    action={
                      searchTerm || statusFilter !== "all"
                        ? undefined
                        : {
                            label: t("btnCreateFirstQuote"),
                            onClick: () => {
                              setQuoteToEdit(null);
                              setIsCreateOpen(true);
                            },
                          }
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredQuotes.map((quote) => (
                <TableRow
                  key={quote.id}
                  className="cursor-pointer hover:bg-[var(--muted)]/40 transition-colors"
                  onClick={() => {
                    setSelectedQuote(quote);
                    setIsPreviewOpen(true);
                  }}
                >
                  <TableCell className="pl-4 font-mono font-bold text-xs text-blue-500 truncate">
                    {quote.quotation_number}
                  </TableCell>
                  <TableCell className="truncate">
                    <span className="font-semibold text-xs text-[var(--foreground)] block truncate">
                      {quote.clientName}
                    </span>
                    {quote.clientGSTIN && (
                      <span className="font-mono text-[10px] text-[var(--muted-foreground)] block truncate">
                        GSTIN: {quote.clientGSTIN}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)] truncate font-mono">
                    {formatDate(quote.quotation_date)}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)] truncate font-mono">
                    {formatDate(quote.valid_until)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-xs text-[var(--foreground)] truncate">
                    {formatCurrency(quote.grand_total)}
                  </TableCell>
                  <TableCell className="text-center truncate">
                    {(() => {
                      const cfg = getBadgeConfig(quote.status);
                      const totalLines = quote.items?.length || 0;
                      const convertedLines = (quote.converted_lines || []).filter((cl) => cl.order_id !== null);
                      const convertedCount = convertedLines.length;
                      const isFullyConverted = totalLines > 0 && convertedCount === totalLines;
                      const isPartiallyConverted = convertedCount > 0 && convertedCount < totalLines;

                      return (
                        <div className="flex flex-col items-center gap-1">
                          <IOSBadge color={cfg.color} variant={cfg.variant} size="small">
                            {t(`status${quote.status}` as any) || quote.status}
                          </IOSBadge>
                          {isFullyConverted && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30">
                              {t("badgeConverted")}
                            </span>
                          )}
                          {isPartiallyConverted && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">
                              {t("badgePartiallyConverted", { converted: convertedCount, total: totalLines })}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell
                    className="text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedQuote(quote);
                            setIsPreviewOpen(true);
                          }}
                        >
                          <FileText className="w-3.5 h-3.5 mr-2" />
                          <span>{t("actionView")}</span>
                        </DropdownMenuItem>

                        {canConvertQuote(quote) && (
                          <DropdownMenuItem onClick={() => handleConvertQuote(quote)}>
                            <ShoppingCart className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {t("actionConvertToOrder")}
                            </span>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={() => {
                            setQuoteToEdit(quote);
                            setIsCreateOpen(true);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-2" />
                          <span>{t("actionEdit")}</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleDuplicate(quote)}>
                          <Copy className="w-3.5 h-3.5 mr-2" />
                          <span>{t("actionDuplicate")}</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleDownloadPdf(quote)}>
                          <Download className="w-3.5 h-3.5 mr-2" />
                          <span>{t("actionDownloadPdf")}</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {quote.status === "Draft" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(quote.id, "Sent")}>
                            <Send className="w-3.5 h-3.5 mr-2 text-blue-500" />
                            <span>{t("actionMarkSent")}</span>
                          </DropdownMenuItem>
                        )}

                        {(quote.status === "Sent" || quote.status === "Expired") && (
                          <>
                            <DropdownMenuItem onClick={() => handleStatusChange(quote.id, "Accepted")}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                              <span>{t("actionMarkAccepted")}</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => handleStatusChange(quote.id, "Rejected")}>
                              <XCircle className="w-3.5 h-3.5 mr-2 text-rose-500" />
                              <span>{t("actionMarkRejected")}</span>
                            </DropdownMenuItem>
                          </>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="text-red-500 focus:text-red-500"
                          onClick={() => setQuoteToDelete(quote)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          <span>{t("actionDelete")}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Table Cards View */}
      <div className="block md:hidden min-w-0 w-full">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : filteredQuotes.length === 0 ? (
          <TableEmptyState
            variant={searchTerm || statusFilter !== "all" ? "no-results" : "no-data"}
            title={t("emptyTitle")}
            subtitle={t("emptyDescription")}
            action={
              searchTerm || statusFilter !== "all"
                ? undefined
                : {
                    label: t("btnCreateFirstQuote"),
                    onClick: () => {
                      setQuoteToEdit(null);
                      setIsCreateOpen(true);
                    },
                  }
            }
          />
        ) : (
          <MobileTableCards
            data={filteredQuotes}
            fields={mobileFields}
            onCardClick={(row) => {
              setSelectedQuote(row);
              setIsPreviewOpen(true);
            }}
            actionsTrigger={(row) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedQuote(row);
                      setIsPreviewOpen(true);
                    }}
                  >
                    <FileText className="w-3.5 h-3.5 mr-2" />
                    <span>{t("actionView")}</span>
                  </DropdownMenuItem>

                  {canConvertQuote(row) && (
                    <DropdownMenuItem onClick={() => handleConvertQuote(row)}>
                      <ShoppingCart className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {t("actionConvertToOrder")}
                      </span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    onClick={() => {
                      setQuoteToEdit(row);
                      setIsCreateOpen(true);
                    }}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-2" />
                    <span>{t("actionEdit")}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleDuplicate(row)}>
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    <span>{t("actionDuplicate")}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleDownloadPdf(row)}>
                    <Download className="w-3.5 h-3.5 mr-2" />
                    <span>{t("actionDownloadPdf")}</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-red-500"
                    onClick={() => setQuoteToDelete(row)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    <span>{t("actionDelete")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        )}
      </div>

      {/* Create / Edit Quote Modal */}
      <CreateQuoteModal
        open={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setQuoteToEdit(null);
        }}
        onSuccess={() => {
          fetchQuotes();
        }}
        clients={clients}
        companyInfo={companyInfo}
        quoteToEdit={quoteToEdit}
      />

      {/* Quote Detail Preview Modal */}
      <QuoteDetailModal
        open={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedQuote(null);
        }}
        quote={selectedQuote}
        onEdit={(q) => {
          setQuoteToEdit(q);
          setIsCreateOpen(true);
        }}
        onDuplicate={(q) => handleDuplicate(q)}
        onStatusChange={(id, status) => handleStatusChange(id, status)}
        onDelete={(q) => setQuoteToDelete(q)}
        companyInfo={companyInfo}
      />

      {/* Confirm Delete Sheet */}
      <ConfirmDeleteSheet
        open={!!quoteToDelete}
        onClose={() => setQuoteToDelete(null)}
        onConfirm={handleDeleteConfirm}
        entityLabel={t("entityQuote")}
        entityName={quoteToDelete?.quotation_number}
        title={t("deleteTitle")}
        consequenceText={t("deleteDescription", { number: quoteToDelete?.quotation_number || "" })}
        confirmText={t("deleteConfirm")}
        cancelText={t("deleteCancel")}
        isDeleting={isDeleting}
      />

      {/* Convert Line Picker Modal */}
      {convertQuote && (
        <ConvertLinePickerModal
          open={isLinePickerOpen}
          onClose={() => {
            setIsLinePickerOpen(false);
            setConvertQuote(null);
          }}
          quote={convertQuote}
          onSelectLine={handleLinePickerSelect}
        />
      )}
    </div>
  );
}

export default function QuotesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-[var(--muted-foreground)]">Loading quotes...</div>}>
      <QuotesContent />
    </Suspense>
  );
}
