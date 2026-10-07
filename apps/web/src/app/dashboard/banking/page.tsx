"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Landmark,
  Plus,
  Search,
  FileSpreadsheet,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Building2,
  Trash2,
  Edit2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Link2,
  Link2Off,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { StatWidget } from "@/components/ui/StatWidget";
import { MonthYearFilter, matchesMonthYear, type MonthYearFilterValue } from "@/components/ui/month-year-filter";
import { MobileTableCards, type MobileField } from "@/components/ui/MobileTableCards";
import { exportWorkbook } from "@/lib/excel-export";
import { useRole } from "@/lib/hooks/use-role";
import type {
  BankAccount,
  BankStatementImport,
  BankTransaction,
  BankMatchLink,
  MatchStatus,
  TransactionsSummary,
} from "@/modules/banking/domain/types";
import { AddAccountModal } from "@/components/banking/AddAccountModal";
import { ImportStatementModal } from "@/components/banking/ImportStatementModal";
import { RevertImportModal } from "@/components/banking/RevertImportModal";
import { MatchModal } from "@/components/banking/MatchModal";
import {
  ExcludeModal,
  AcceptVarianceModal,
  UnlinkModal,
} from "@/components/banking/TransactionActionModals";

function BankingContent() {
  const t = useTranslations("banking");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { role, isAdmin } = useRole();

  // Primary State
  const [activeTab, setActiveTab] = useState<"transactions" | "accounts" | "imports">("transactions");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [imports, setImports] = useState<BankStatementImport[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [summary, setSummary] = useState<TransactionsSummary>({
    total_credit_paise: 0,
    total_debit_paise: 0,
    count: 0,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<"all" | "credit" | "debit">("all");
  const [matchStatusFilter, setMatchStatusFilter] = useState<
    "all" | "Unmatched" | "Partial" | "Matched" | "Excluded" | "NeedsReview"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [monthYear, setMonthYear] = useState<MonthYearFilterValue>({
    month: "all",
    year: new Date().getFullYear(),
  });

  // Modals for Accounts and Imports
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [revertingImport, setRevertingImport] = useState<BankStatementImport | null>(null);

  // Modals for Phase 7b Matching
  const [selectedTransactionForMatch, setSelectedTransactionForMatch] = useState<BankTransaction | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);

  const [selectedTransactionForExclude, setSelectedTransactionForExclude] = useState<BankTransaction | null>(null);
  const [isExcludeModalOpen, setIsExcludeModalOpen] = useState(false);

  const [selectedTransactionForVariance, setSelectedTransactionForVariance] = useState<BankTransaction | null>(null);
  const [isVarianceModalOpen, setIsVarianceModalOpen] = useState(false);

  const [selectedLinkForUnlink, setSelectedLinkForUnlink] = useState<BankMatchLink | null>(null);
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);

  // Row Expansion for Details & Links
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [expandedTxLinks, setExpandedTxLinks] = useState<BankMatchLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accRes, impRes, txRes] = await Promise.all([
        fetch("/api/banking/accounts"),
        fetch("/api/banking/imports"),
        fetch("/api/banking/transactions?limit=1000"),
      ]);

      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData.accounts || []);
      }
      if (impRes.ok) {
        const impData = await impRes.json();
        setImports(impData.imports || []);
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
        if (txData.summary) {
          setSummary(txData.summary);
        }
      }
    } catch (err: any) {
      toast.error(err.message || t("toastErrorGeneric"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle query param `?action=import` or `?tab=`
  useEffect(() => {
    const action = searchParams.get("action");
    const tab = searchParams.get("tab");
    if (action === "import") {
      setIsImportOpen(true);
    }
    if (tab === "accounts" || tab === "imports" || tab === "transactions") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // ─── Account Map for display ────────────────────────────────────
  const accountMap = useMemo(() => {
    const map = new Map<string, BankAccount>();
    accounts.forEach((acc) => map.set(acc.id, acc));
    return map;
  }, [accounts]);

  // ─── Filtered Transactions ──────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Account filter
      if (selectedAccountId !== "all" && tx.bank_account_id !== selectedAccountId) {
        return false;
      }

      // Direction filter
      if (directionFilter === "credit" && tx.credit_paise <= 0) return false;
      if (directionFilter === "debit" && tx.debit_paise <= 0) return false;

      // Match status filter
      if (matchStatusFilter === "NeedsReview") {
        if (!tx.needs_review) return false;
      } else if (matchStatusFilter !== "all") {
        if (tx.match_status !== matchStatusFilter) return false;
      }

      // Month/Year filter
      if (!matchesMonthYear(tx.value_date, monthYear)) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNarr = tx.narration.toLowerCase().includes(q);
        const matchRef = tx.bank_ref?.toLowerCase().includes(q);
        const matchChq = tx.cheque_no?.toLowerCase().includes(q);
        if (!matchNarr && !matchRef && !matchChq) return false;
      }

      return true;
    });
  }, [transactions, selectedAccountId, directionFilter, matchStatusFilter, monthYear, searchQuery]);

  // ─── Unmatched and Needs Review KPI Computation ─────────────────
  const { unmatchedCount, unmatchedAmountRupees, needsReviewCount } = useMemo(() => {
    let unCount = 0;
    let unPaise = 0;
    let revCount = 0;

    for (const tx of transactions) {
      if (tx.needs_review) {
        revCount++;
      }
      if (tx.match_status === "Unmatched") {
        unCount++;
        unPaise += tx.credit_paise > 0 ? tx.credit_paise : tx.debit_paise;
      }
    }

    return {
      unmatchedCount: unCount,
      unmatchedAmountRupees: Math.round(unPaise / 100),
      needsReviewCount: revCount,
    };
  }, [transactions]);

  // Last import date string
  const lastImportDate = useMemo(() => {
    if (imports.length === 0) return t("never");
    const latest = imports[0];
    return new Date(latest.created_at).toLocaleDateString();
  }, [imports, t]);

  // ─── Excel Export with Totals Row & Match Status ─────────────────
  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) return;

    let sumDebit = 0;
    let sumCredit = 0;
    let sumAllocated = 0;

    const dataRows = filteredTransactions.map((tx) => {
      const acc = accountMap.get(tx.bank_account_id);
      const accLabel = acc ? `${acc.bank_name} (${acc.account_last4})` : "";
      const debitRupees = tx.debit_paise / 100;
      const creditRupees = tx.credit_paise / 100;
      const allocatedRupees = (tx.allocated_paise || 0) / 100;
      sumDebit += debitRupees;
      sumCredit += creditRupees;
      sumAllocated += allocatedRupees;

      const statusLabel = tx.needs_review
        ? `${tx.match_status || "Unmatched"} (Needs Review)`
        : (tx.match_status || "Unmatched");

      return {
        date: tx.value_date,
        account: accLabel,
        narration: tx.narration,
        ref: tx.bank_ref || "",
        cheque: tx.cheque_no || "",
        debit: debitRupees > 0 ? debitRupees : "",
        credit: creditRupees > 0 ? creditRupees : "",
        balance: tx.balance_after_paise != null ? tx.balance_after_paise / 100 : "",
        match_status: statusLabel,
        allocated: allocatedRupees > 0 ? allocatedRupees : "",
      };
    });

    // Totals row at the bottom
    dataRows.push({
      date: "TOTAL",
      account: "",
      narration: `Total Transactions: ${filteredTransactions.length}`,
      ref: "",
      cheque: "",
      debit: sumDebit,
      credit: sumCredit,
      balance: "",
      match_status: "",
      allocated: sumAllocated,
    });

    exportWorkbook("Bank_Transactions", [
      {
        sheetName: "Transactions",
        data: dataRows,
        columns: [
          { header: "Date", key: "date" },
          { header: "Account", key: "account" },
          { header: "Narration", key: "narration" },
          { header: "Ref / UTR", key: "ref" },
          { header: "Cheque #", key: "cheque" },
          { header: "Debit (₹)", key: "debit" },
          { header: "Credit (₹)", key: "credit" },
          { header: "Balance (₹)", key: "balance" },
          { header: "Match Status", key: "match_status" },
          { header: "Allocated (₹)", key: "allocated" },
        ],
      },
    ]);
  };

  // ─── Delete Account Action ──────────────────────────────────────
  const handleDeleteAccount = async (account: BankAccount) => {
    if (!window.confirm(`${t("deleteAccountConfirm")}\n${t("deleteAccountWarning")}`)) {
      return;
    }
    try {
      const res = await fetch(`/api/banking/accounts/${account.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");
      toast.success(t("toastAccountDeleted"));
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
    } catch (err: any) {
      toast.error(err.message || t("toastErrorGeneric"));
    }
  };

  // ─── Unexclude Action ───────────────────────────────────────────
  const handleUnexclude = async (tx: BankTransaction) => {
    try {
      const res = await fetch(`/api/banking/transactions/${tx.id}/unexclude`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("toastErrorGeneric"));
      toast.success(t("toastUnexcludeSuccess"));
      loadData();
    } catch (err: any) {
      toast.error(err.message || t("toastErrorGeneric"));
    }
  };

  // ─── Expand Row Handler ─────────────────────────────────────────
  const handleToggleExpand = async (tx: BankTransaction) => {
    if (expandedTxId === tx.id) {
      setExpandedTxId(null);
      setExpandedTxLinks([]);
    } else {
      setExpandedTxId(tx.id);
      setIsLoadingLinks(true);
      try {
        const res = await fetch(`/api/banking/transactions/${tx.id}/links`);
        if (res.ok) {
          const data = await res.json();
          setExpandedTxLinks(data.links || []);
        } else {
          setExpandedTxLinks([]);
        }
      } catch {
        setExpandedTxLinks([]);
      } finally {
        setIsLoadingLinks(false);
      }
    }
  };

  // ─── Render Match Status Badge ──────────────────────────────────
  const renderMatchBadge = (tx: BankTransaction) => {
    const status = tx.match_status || "Unmatched";
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {status === "Matched" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            {t("statusMatched")}
          </span>
        )}
        {status === "Partial" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            {t("statusPartial")}
          </span>
        )}
        {status === "Excluded" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            {t("statusExcluded")}
          </span>
        )}
        {status === "Unmatched" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">
            {t("statusUnmatched")}
          </span>
        )}
        {tx.needs_review && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse"
            title={t("stalePaymentWarning")}
          >
            <AlertTriangle className="w-3 h-3" />
            {t("statusNeedsReview")}
          </span>
        )}
      </div>
    );
  };

  // ─── Mobile Table Card Fields for Transactions ──────────────────
  const mobileFields: MobileField<BankTransaction>[] = useMemo(
    () => [
      {
        key: "narration",
        label: t("thNarration"),
        primary: true,
      },
      {
        key: "match_status",
        label: t("thMatchStatus"),
        render: (_: any, tx: BankTransaction) => renderMatchBadge(tx),
      },
      {
        key: "value_date",
        label: t("thDate"),
      },
      {
        key: "bank_account_id",
        label: t("thAccount"),
        render: (accId: string) => {
          const acc = accountMap.get(accId);
          return acc ? `${acc.bank_name} ••${acc.account_last4}` : "—";
        },
      },
      {
        key: "bank_ref",
        label: t("thRef"),
        render: (v: string | null) => v || "—",
      },
      {
        key: "debit_paise",
        label: t("thDebit"),
        render: (v: number) =>
          v > 0 ? <span className="text-rose-500 font-semibold">₹{(v / 100).toFixed(2)}</span> : "—",
      },
      {
        key: "credit_paise",
        label: t("thCredit"),
        render: (v: number) =>
          v > 0 ? <span className="text-emerald-500 font-semibold">₹{(v / 100).toFixed(2)}</span> : "—",
      },
      {
        key: "balance_after_paise",
        label: t("thBalance"),
        render: (v: number | null) => (v != null ? `₹${(v / 100).toFixed(2)}` : "—"),
      },
    ],
    [accountMap, t]
  );

  return (
    <div className="space-y-6 w-full min-w-0 overflow-x-hidden hero-glow">
      {/* Page Title & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <span>{t("title")}</span>
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Excel */}
          {activeTab === "transactions" && (
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredTransactions.length === 0}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50 text-[var(--foreground)] transition-colors shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>{t("btnExportExcel")}</span>
            </button>
          )}

          {/* Add Bank Account (Owner/Admin only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingAccount(null);
                setIsAddAccountOpen(true);
              }}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50 text-[var(--foreground)] transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t("btnAddAccount")}</span>
            </button>
          )}

          {/* Import Statement */}
          <button
            type="button"
            disabled={accounts.length === 0}
            onClick={() => setIsImportOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-colors shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Landmark className="w-4 h-4" />
            <span>{t("btnImportStatement")}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid: Credits, Debits, Transactions, Last Import, Unmatched, Needs Review */}
      <div className="kpi-panel min-w-0 w-full overflow-hidden">
        <div className="kpi-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 min-w-0 w-full overflow-hidden">
          <div className="min-w-0 w-full overflow-hidden">
            <StatWidget
              label={t("statTotalCredits")}
              value={Math.round(summary.total_credit_paise / 100)}
              displayValue={(summary.total_credit_paise / 100).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              prefix="₹"
              icon={ArrowDownLeft}
              color="green"
            />
          </div>
          <div className="min-w-0 w-full overflow-hidden">
            <StatWidget
              label={t("statTotalDebits")}
              value={Math.round(summary.total_debit_paise / 100)}
              displayValue={(summary.total_debit_paise / 100).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              prefix="₹"
              icon={ArrowUpRight}
              color="red"
            />
          </div>
          <div className="min-w-0 w-full overflow-hidden">
            <StatWidget
              label={t("statTransactions")}
              value={summary.count}
              icon={CreditCard}
              color="blue"
            />
          </div>
          <div className="min-w-0 w-full overflow-hidden">
            <StatWidget
              label={t("statUnmatched")}
              value={unmatchedCount}
              displayValue={unmatchedCount > 0 ? `₹${unmatchedAmountRupees.toLocaleString("en-IN")}` : "0"}
              icon={Link2Off}
              color="orange"
            />
          </div>
          <div className="min-w-0 w-full overflow-hidden">
            <StatWidget
              label={t("statNeedsReview")}
              value={needsReviewCount}
              icon={AlertTriangle}
              color="red"
            />
          </div>
          <div className="min-w-0 w-full overflow-hidden">
            <StatWidget
              label={t("statLastImport")}
              value={0}
              displayValue={lastImportDate}
              icon={Clock}
              color="purple"
            />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-1 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)] shrink-0 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={cn(
            "px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
            activeTab === "transactions"
              ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm font-semibold"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          {t("tabTransactions")}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("accounts")}
          className={cn(
            "px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
            activeTab === "accounts"
              ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm font-semibold"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          {t("tabAccounts")} ({accounts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("imports")}
          className={cn(
            "px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
            activeTab === "imports"
              ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm font-semibold"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          {t("tabImports")} ({imports.length})
        </button>
      </div>

      {/* ─── TAB 1: TRANSACTIONS ─── */}
      {activeTab === "transactions" && (
        <div className="space-y-4 min-w-0 w-full">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Account Filter */}
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm"
              >
                <option value="all">{t("filterAllAccounts")}</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bank_name} (••{acc.account_last4})
                  </option>
                ))}
              </select>

              {/* Direction Filter */}
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm"
              >
                <option value="all">{t("filterAllDirections")}</option>
                <option value="credit">{t("filterCredits")}</option>
                <option value="debit">{t("filterDebits")}</option>
              </select>

              {/* Match Status Filter */}
              <select
                value={matchStatusFilter}
                onChange={(e) => setMatchStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm font-medium"
              >
                <option value="all">{t("filterAllMatchStatuses")}</option>
                <option value="Unmatched">{t("filterUnmatched")}</option>
                <option value="Partial">{t("filterPartial")}</option>
                <option value="Matched">{t("filterMatched")}</option>
                <option value="Excluded">{t("filterExcluded")}</option>
                <option value="NeedsReview">{t("filterNeedsReview")}</option>
              </select>
            </div>

            {/* Month Year Filter */}
            <div className="shrink-0">
              <MonthYearFilter value={monthYear} onChange={setMonthYear} />
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchTransactionsPlaceholder")}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm"
            />
          </div>

          {/* Transactions List */}
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              {tCommon("loading")}
            </div>
          ) : filteredTransactions.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center space-y-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto">
                <Landmark className="w-6 h-6" />
              </div>
              <div className="max-w-xs mx-auto">
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  {t("emptyTransactionsTitle")}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {t("emptyTransactionsDesc")}
                </p>
              </div>
              {accounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsImportOpen(true)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  <Landmark className="w-4 h-4" />
                  <span>{t("btnImportStatement")}</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full table-fixed text-left text-xs">
                    <thead className="bg-[var(--muted)]/50 text-[var(--muted-foreground)] uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                      <tr>
                        <th className="p-3 w-[36px]"></th>
                        <th className="p-3 w-[95px]">{t("thDate")}</th>
                        <th className="p-3 w-[150px]">{t("thAccount")}</th>
                        <th className="p-3 w-[220px]">{t("thNarration")}</th>
                        <th className="p-3 w-[110px]">{t("thRef")}</th>
                        <th className="p-3 w-[100px] text-right">{t("thDebit")}</th>
                        <th className="p-3 w-[100px] text-right">{t("thCredit")}</th>
                        <th className="p-3 w-[150px]">{t("thMatchStatus")}</th>
                        <th className="p-3 w-[110px] text-right">{t("thActions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredTransactions.map((tx) => {
                        const acc = accountMap.get(tx.bank_account_id);
                        const isExpanded = expandedTxId === tx.id;
                        const rowAmountPaise = tx.credit_paise > 0 ? tx.credit_paise : tx.debit_paise;
                        const canMatch = tx.match_status !== "Excluded";

                        return (
                          <React.Fragment key={tx.id}>
                            <tr
                              className={cn(
                                "hover:bg-[var(--muted)]/20 transition-colors cursor-pointer",
                                isExpanded && "bg-[var(--muted)]/15"
                              )}
                              onClick={() => handleToggleExpand(tx)}
                            >
                              <td className="p-3 text-[var(--muted-foreground)] text-center">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-blue-500 inline" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]/60 inline" />
                                )}
                              </td>
                              <td className="p-3 text-[var(--muted-foreground)] whitespace-nowrap">
                                {tx.value_date}
                              </td>
                              <td className="p-3">
                                <div className="font-medium text-[var(--foreground)] min-w-0 truncate">
                                  {acc ? `${acc.bank_name} ••${acc.account_last4}` : "—"}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="font-medium text-[var(--foreground)] min-w-0 truncate">
                                  {tx.narration}
                                </div>
                              </td>
                              <td className="p-3 text-[var(--muted-foreground)] font-mono text-[11px]">
                                <div className="min-w-0 truncate">{tx.bank_ref || "—"}</div>
                              </td>
                              <td className="p-3 text-right font-medium text-rose-500 whitespace-nowrap">
                                {tx.debit_paise > 0 ? `₹${(tx.debit_paise / 100).toFixed(2)}` : "—"}
                              </td>
                              <td className="p-3 text-right font-medium text-emerald-500 whitespace-nowrap">
                                {tx.credit_paise > 0 ? `₹${(tx.credit_paise / 100).toFixed(2)}` : "—"}
                              </td>
                              <td className="p-3">
                                {renderMatchBadge(tx)}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                {canMatch && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTransactionForMatch(tx);
                                      setIsMatchModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors inline-flex items-center gap-1 shadow-sm"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>{t("actionMatch")}</span>
                                  </button>
                                )}
                              </td>
                            </tr>

                            {/* Expanded Details Sub-Row */}
                            {isExpanded && (
                              <tr className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
                                <td colSpan={9} className="p-4 sm:p-5">
                                  <div className="space-y-4 max-w-4xl">
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                                          {t("rowDetailLinkedPayments")}
                                        </h4>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--muted)] text-[var(--foreground)]">
                                          {expandedTxLinks.length}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {/* Exclude / Unexclude */}
                                        {tx.allocated_paise === 0 && !tx.excluded && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedTransactionForExclude(tx);
                                              setIsExcludeModalOpen(true);
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors"
                                          >
                                            {t("actionExclude")}
                                          </button>
                                        )}
                                        {tx.excluded && (
                                          <button
                                            type="button"
                                            onClick={() => handleUnexclude(tx)}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                                          >
                                            {t("actionUnexclude")}
                                          </button>
                                        )}

                                        {/* Accept Difference */}
                                        {tx.allocated_paise > 0 &&
                                          tx.allocated_paise < rowAmountPaise &&
                                          !tx.variance && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedTransactionForVariance(tx);
                                                setIsVarianceModalOpen(true);
                                              }}
                                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors"
                                            >
                                              {t("actionAcceptVariance")} (₹{((rowAmountPaise - tx.allocated_paise) / 100).toFixed(2)})
                                            </button>
                                          )}

                                        {/* Match Button inside expanded view */}
                                        {canMatch && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedTransactionForMatch(tx);
                                              setIsMatchModalOpen(true);
                                            }}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors inline-flex items-center gap-1 shadow-sm"
                                          >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>{t("actionMatch")}</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Linked Payments List */}
                                    {isLoadingLinks ? (
                                      <div className="py-4 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                        <span>Loading links...</span>
                                      </div>
                                    ) : expandedTxLinks.length === 0 ? (
                                      <p className="text-xs text-[var(--muted-foreground)] py-2">
                                        {t("noLinkedPayments")}
                                      </p>
                                    ) : (
                                      <div className="space-y-2">
                                        {expandedTxLinks.map((link) => (
                                          <div
                                            key={link.id}
                                            className={cn(
                                              "p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[var(--card)]",
                                              link.needs_review
                                                ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-500/10"
                                                : "border-[var(--border)]"
                                            )}
                                          >
                                            <div className="space-y-1 min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-sm text-[var(--foreground)]">
                                                  {link.snapshot.party_name}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
                                                  {link.entity_type === "payment"
                                                    ? t("entityPayment")
                                                    : t("entityVendorBillPayment")}
                                                </span>
                                                {link.needs_review && (
                                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                    {t("stalePaymentWarning")}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-3 text-[var(--muted-foreground)] text-[11px]">
                                                <span>Date: {link.snapshot.date}</span>
                                                {link.snapshot.reference && (
                                                  <span>• Ref: {link.snapshot.reference}</span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                              <span className="font-bold text-sm text-[var(--foreground)]">
                                                ₹{(link.allocated_paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                              </span>
                                              {link.status === "Active" && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedLinkForUnlink(link);
                                                    setIsUnlinkModalOpen(true);
                                                  }}
                                                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors border border-rose-500/20"
                                                >
                                                  {t("btnUnlink")}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Variance Details if accepted */}
                                    {tx.variance && (
                                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
                                        <div>
                                          <span className="font-semibold text-amber-700 dark:text-amber-400 block">
                                            Difference Accepted: {tx.variance.reason}
                                          </span>
                                          <span className="text-[var(--muted-foreground)] text-[11px]">
                                            Accepted on {new Date(tx.variance.at).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <span className="font-bold text-sm text-amber-700 dark:text-amber-400">
                                          ₹{(tx.variance.paise / 100).toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden">
                <MobileTableCards
                  data={filteredTransactions}
                  fields={mobileFields}
                  keyExtractor={(tx) => tx.id}
                  emptyMessage={t("emptyTransactionsTitle")}
                  actionsTrigger={(tx) => {
                    if (tx.match_status === "Excluded") return null;
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransactionForMatch(tx);
                          setIsMatchModalOpen(true);
                        }}
                        className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-blue-600 text-white shadow-sm inline-flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{t("actionMatch")}</span>
                      </button>
                    );
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB 2: ACCOUNTS ─── */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="p-12 text-center space-y-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto">
                <Landmark className="w-6 h-6" />
              </div>
              <div className="max-w-xs mx-auto">
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  {t("emptyAccountsTitle")}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {t("emptyAccountsDesc")}
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAccount(null);
                    setIsAddAccountOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t("btnAddAccount")}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] space-y-4 shadow-sm hover:border-sky-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[var(--foreground)]">
                          {acc.name}
                        </h4>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {acc.bank_name}
                        </div>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                        acc.status === "Active"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30"
                      )}
                    >
                      {acc.status === "Active" ? t("statusActive") : t("statusClosed")}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[var(--muted-foreground)] border-t border-b border-[var(--border)] py-3">
                    <div className="flex justify-between">
                      <span>{t("accountLast4")}:</span>
                      <span className="font-mono text-[var(--foreground)]">•••• {acc.account_last4}</span>
                    </div>
                    {acc.ifsc && (
                      <div className="flex justify-between">
                        <span>{t("ifscCode")}:</span>
                        <span className="font-mono text-[var(--foreground)]">{acc.ifsc}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>{t("accountType")}:</span>
                      <span className="text-[var(--foreground)] font-medium">{acc.account_type}</span>
                    </div>
                    {acc.opening_balance_paise != null && (
                      <div className="flex justify-between">
                        <span>{t("openingBalance")}:</span>
                        <span className="font-semibold text-[var(--foreground)]">
                          ₹{(acc.opening_balance_paise / 100).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAccount(acc);
                          setIsAddAccountOpen(true);
                        }}
                        className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-sky-500 hover:bg-sky-500/10 transition-colors"
                        title={t("actionEdit")}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(acc)}
                        className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title={t("actionDelete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: IMPORTS ─── */}
      {activeTab === "imports" && (
        <div className="space-y-4">
          {imports.length === 0 ? (
            <div className="p-12 text-center space-y-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="max-w-xs mx-auto">
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  {t("emptyImportsTitle")}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {t("emptyImportsDesc")}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--muted)]/50 text-[var(--muted-foreground)] uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                    <tr>
                      <th className="p-3">{t("thFileName")}</th>
                      <th className="p-3">{t("thAccount")}</th>
                      <th className="p-3">{t("thImportedBy")}</th>
                      <th className="p-3 text-right">{t("thTotalRows")}</th>
                      <th className="p-3 text-right">{t("thInserted")}</th>
                      <th className="p-3 text-right">{t("thDuplicates")}</th>
                      <th className="p-3 text-right">{t("thErrors")}</th>
                      <th className="p-3">{t("thImportDate")}</th>
                      <th className="p-3">{t("thStatus")}</th>
                      {isAdmin && <th className="p-3 text-right">{t("thActions")}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {imports.map((imp) => {
                      const acc = accountMap.get(imp.bank_account_id);
                      return (
                        <tr key={imp.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                          <td className="p-3 font-medium text-[var(--foreground)]">
                            {imp.file_name}
                          </td>
                          <td className="p-3 text-[var(--muted-foreground)]">
                            {acc ? `${acc.bank_name} ••${acc.account_last4}` : "—"}
                          </td>
                          <td className="p-3 text-[var(--muted-foreground)]">{imp.imported_by}</td>
                          <td className="p-3 text-right font-mono">{imp.rows_total}</td>
                          <td className="p-3 text-right font-mono text-emerald-500 font-semibold">
                            {imp.rows_inserted}
                          </td>
                          <td className="p-3 text-right font-mono text-amber-500 font-semibold">
                            {imp.rows_skipped_duplicate}
                          </td>
                          <td className="p-3 text-right font-mono text-rose-500 font-semibold">
                            {imp.rows_error}
                          </td>
                          <td className="p-3 text-[var(--muted-foreground)] whitespace-nowrap">
                            {new Date(imp.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                imp.status === "Committed"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              )}
                            >
                              {imp.status === "Committed" ? t("statusCommitted") : t("statusReverted")}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="p-3 text-right">
                              {imp.status === "Committed" && (
                                <button
                                  type="button"
                                  onClick={() => setRevertingImport(imp)}
                                  className="px-2.5 py-1 text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20 inline-flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>{t("revertImport")}</span>
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Modals ─── */}
      <AddAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        onAccountCreated={() => loadData()}
        editingAccount={editingAccount}
      />

      <ImportStatementModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={() => { loadData(); }}
        accounts={accounts}
      />

      <RevertImportModal
        isOpen={Boolean(revertingImport)}
        onClose={() => setRevertingImport(null)}
        importDoc={revertingImport}
        onReverted={() => loadData()}
      />

      {/* Phase 7b Matching Modals */}
      <MatchModal
        isOpen={isMatchModalOpen}
        onClose={() => {
          setIsMatchModalOpen(false);
          setSelectedTransactionForMatch(null);
        }}
        transaction={selectedTransactionForMatch}
        onMatched={() => loadData()}
      />

      <ExcludeModal
        isOpen={isExcludeModalOpen}
        onClose={() => {
          setIsExcludeModalOpen(false);
          setSelectedTransactionForExclude(null);
        }}
        transaction={selectedTransactionForExclude}
        onSuccess={() => loadData()}
      />

      <AcceptVarianceModal
        isOpen={isVarianceModalOpen}
        onClose={() => {
          setIsVarianceModalOpen(false);
          setSelectedTransactionForVariance(null);
        }}
        transaction={selectedTransactionForVariance}
        onSuccess={() => loadData()}
      />

      <UnlinkModal
        isOpen={isUnlinkModalOpen}
        onClose={() => {
          setIsUnlinkModalOpen(false);
          setSelectedLinkForUnlink(null);
        }}
        link={selectedLinkForUnlink}
        onSuccess={() => {
          loadData();
          if (expandedTxId) {
            fetch(`/api/banking/transactions/${expandedTxId}/links`)
              .then((res) => res.json())
              .then((d) => setExpandedTxLinks(d.links || []))
              .catch(() => setExpandedTxLinks([]));
          }
        }}
      />
    </div>
  );
}

function BankingLoading() {
  const t = useTranslations("banking");
  return <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">{t("loadingFallback")}</div>;
}

export default function BankingPage() {
  return (
    <Suspense fallback={<BankingLoading />}>
      <BankingContent />
    </Suspense>
  );
}
