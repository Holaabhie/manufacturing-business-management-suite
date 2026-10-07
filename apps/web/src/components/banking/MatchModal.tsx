"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Sparkles,
  Search,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  BankTransaction,
  CandidatePayment,
} from "@/modules/banking/domain/types";

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: BankTransaction | null;
  onMatched: () => void;
}

export function MatchModal({
  isOpen,
  onClose,
  transaction,
  onMatched,
}: MatchModalProps) {
  const t = useTranslations("banking");
  const tCommon = useTranslations("common");

  const [activeTab, setActiveTab] = useState<"suggestions" | "search">("suggestions");
  const [suggestions, setSuggestions] = useState<CandidatePayment[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Manual Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CandidatePayment[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterMin, setFilterMin] = useState("");
  const [filterMax, setFilterMax] = useState("");

  // Selected candidates for linking
  const [selectedCandidates, setSelectedCandidates] = useState<CandidatePayment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when opening modal with new transaction
  useEffect(() => {
    if (isOpen && transaction) {
      setSelectedCandidates([]);
      setActiveTab("suggestions");
      setSearchQuery("");
      setSearchResults([]);
      setFilterFrom("");
      setFilterTo("");
      setFilterMin("");
      setFilterMax("");
      loadSuggestions(transaction.id);
    }
  }, [isOpen, transaction]);

  const loadSuggestions = async (txId: string) => {
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/banking/transactions/${txId}/suggestions`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!transaction) return;
    setIsSearching(true);
    try {
      const direction = transaction.credit_paise > 0 ? "credit" : "debit";
      const params = new URLSearchParams({ direction });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      if (filterMin) params.set("min", filterMin);
      if (filterMax) params.set("max", filterMax);

      const res = await fetch(`/api/banking/candidates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.candidates || []);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [transaction, searchQuery, filterFrom, filterTo, filterMin, filterMax]);

  // Load manual search results when switching to search tab if empty
  useEffect(() => {
    if (isOpen && transaction && activeTab === "search" && searchResults.length === 0 && !isSearching) {
      handleSearch();
    }
  }, [activeTab, isOpen, transaction, searchResults.length, isSearching, handleSearch]);

  const rowAmountPaise = useMemo(() => {
    if (!transaction) return 0;
    return transaction.credit_paise > 0
      ? transaction.credit_paise
      : transaction.debit_paise;
  }, [transaction]);

  const alreadyAllocatedPaise = useMemo(() => {
    return transaction?.allocated_paise || 0;
  }, [transaction]);

  const remainingAvailablePaise = Math.max(0, rowAmountPaise - alreadyAllocatedPaise);

  const selectedAllocatingPaise = useMemo(() => {
    return selectedCandidates.reduce((acc, c) => acc + c.amount_paise, 0);
  }, [selectedCandidates]);

  const isOverAllocated = selectedAllocatingPaise > remainingAvailablePaise;
  const isExactMatch =
    selectedAllocatingPaise > 0 &&
    selectedAllocatingPaise === remainingAvailablePaise;

  const toggleSelectCandidate = (candidate: CandidatePayment) => {
    setSelectedCandidates((prev) => {
      const exists = prev.some(
        (c) =>
          c.entity_type === candidate.entity_type &&
          c.entity_id === candidate.entity_id
      );
      if (exists) {
        return prev.filter(
          (c) =>
            !(
              c.entity_type === candidate.entity_type &&
              c.entity_id === candidate.entity_id
            )
        );
      } else {
        return [...prev, candidate];
      }
    });
  };

  const handleConfirmMatch = async () => {
    if (!transaction || selectedCandidates.length === 0 || isOverAllocated) return;
    setIsSubmitting(true);
    try {
      const payload = {
        links: selectedCandidates.map((c) => ({
          entity_type: c.entity_type,
          entity_id: c.entity_id,
        })),
      };

      const res = await fetch(`/api/banking/transactions/${transaction.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("toastErrorGeneric"));
      }

      toast.success(t("toastMatchSuccess"));
      onMatched();
      onClose();
    } catch (err: any) {
      toast.error(err.message || t("toastErrorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transaction) return null;

  const isCredit = transaction.credit_paise > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent fullScreenMobile className="sm:max-w-2xl md:max-w-3xl max-h-[92dvh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--border)] shrink-0 bg-[var(--background)]">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              {t("matchModalTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-[var(--muted-foreground)]">
              {transaction.narration}
            </DialogDescription>
          </DialogHeader>

          {/* Transaction Metadata Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] text-xs">
            <div>
              <span className="text-[var(--muted-foreground)] block">{t("thDate")}</span>
              <span className="font-medium text-[var(--foreground)]">{transaction.value_date}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">{t("thRef")}</span>
              <span className="font-mono text-[var(--foreground)] truncate block">
                {transaction.bank_ref || "—"}
              </span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">{t("thEntity")}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold",
                  isCredit ? "text-emerald-500" : "text-rose-500"
                )}
              >
                {isCredit ? (
                  <>
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    {t("filterCredits")}
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {t("filterDebits")}
                  </>
                )}
              </span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">{t("totalRowAmount")}</span>
              <span className="font-bold text-sm text-[var(--foreground)]">
                ₹{(rowAmountPaise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Allocation Progress Bar */}
          <div className="mt-4 p-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-[var(--foreground)]">
                {t("allocationBarLabel")}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[var(--muted-foreground)]">
                  {t("allocatedAmount")}:{" "}
                  <strong className="text-[var(--foreground)]">
                    ₹{((alreadyAllocatedPaise + selectedAllocatingPaise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    isOverAllocated
                      ? "text-rose-500"
                      : isExactMatch
                      ? "text-emerald-500"
                      : "text-amber-500"
                  )}
                >
                  {t("remainingAmount")}: ₹{(Math.max(0, remainingAvailablePaise - selectedAllocatingPaise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-2 rounded-full bg-[var(--muted)] overflow-hidden flex">
              {alreadyAllocatedPaise > 0 && (
                <div
                  style={{
                    width: `${Math.min(100, (alreadyAllocatedPaise / rowAmountPaise) * 100)}%`,
                  }}
                  className="bg-blue-500 h-full"
                  title={t("alreadyAllocated")}
                />
              )}
              {selectedAllocatingPaise > 0 && (
                <div
                  style={{
                    width: `${Math.min(
                      100 - (alreadyAllocatedPaise / rowAmountPaise) * 100,
                      (selectedAllocatingPaise / rowAmountPaise) * 100
                    )}%`,
                  }}
                  className={cn(
                    "h-full transition-all duration-300",
                    isOverAllocated
                      ? "bg-rose-500"
                      : isExactMatch
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  )}
                  title={t("selectedToAllocate")}
                />
              )}
            </div>

            {isOverAllocated && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Selected payments exceed the remaining transaction amount.
              </p>
            )}
          </div>

          {/* Tabs Navigation */}
          <div className="flex border-b border-[var(--border)] mt-4 -mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("suggestions")}
              className={cn(
                "px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
                activeTab === "suggestions"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t("tabSuggestions")}
              {suggestions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {suggestions.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={cn(
                "px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
                activeTab === "search"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <Search className="w-3.5 h-3.5" />
              {t("tabSearch")}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === "suggestions" ? (
            /* Suggestions Tab */
            isLoadingSuggestions ? (
              <div className="py-12 flex flex-col items-center justify-center text-[var(--muted-foreground)]">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                <p className="text-sm">{tCommon("loading") || "Loading suggestions..."}</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-12 text-center text-[var(--muted-foreground)]">
                <Sparkles className="w-10 h-10 mx-auto text-amber-500 mb-2 opacity-80" />
                <h4 className="font-semibold text-[var(--foreground)]">{t("noSuggestionsTitle")}</h4>
                <p className="text-xs sm:text-sm max-w-md mx-auto mt-1">
                  {t("noSuggestionsDesc")}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("search")}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  {t("tabSearch")}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {suggestions.map((candidate) => {
                  const isSelected = selectedCandidates.some(
                    (c) =>
                      c.entity_type === candidate.entity_type &&
                      c.entity_id === candidate.entity_id
                  );
                  return (
                    <div
                      key={`${candidate.entity_type}-${candidate.entity_id}`}
                      onClick={() => toggleSelectCandidate(candidate)}
                      className={cn(
                        "p-3 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3",
                        isSelected
                          ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 shadow-sm"
                          : "border-[var(--border)] hover:border-[var(--muted-foreground)]/30 bg-[var(--card)]"
                      )}
                    >
                      {/* Checkbox circle */}
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-blue-500 border-blue-500 text-white"
                            : "border-[var(--muted-foreground)]/40 bg-[var(--background)]"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      {/* Candidate info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-[var(--foreground)] truncate">
                            {candidate.party_name}
                          </h4>
                          <span className="font-bold text-sm text-[var(--foreground)] shrink-0">
                            ₹{candidate.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)] mt-1">
                          <span>{candidate.date}</span>
                          <span>•</span>
                          <span>{candidate.payment_method}</span>
                          {candidate.reference && (
                            <>
                              <span>•</span>
                              <span className="font-mono truncate max-w-[200px]">
                                {candidate.reference}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Reason Chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {candidate.reasons?.amount_exact && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {t("reasonExactAmount")}
                            </span>
                          )}
                          {candidate.reasons?.date_diff_n === 0 ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              {t("reasonDateSameDay")}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              {t("reasonDateDiff", { days: candidate.reasons?.date_diff_n ?? 0 })}
                            </span>
                          )}
                          {candidate.reasons?.reference_in_narration && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
                              {t("reasonRefInNarration")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Manual Search Tab */
            <div className="space-y-4">
              {/* Search input & filters */}
              <div className="space-y-2.5 p-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder={t("searchPaymentsPlaceholder")}
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="text-[var(--muted-foreground)] block mb-0.5">From</label>
                    <input
                      type="date"
                      value={filterFrom}
                      onChange={(e) => setFilterFrom(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--muted-foreground)] block mb-0.5">To</label>
                    <input
                      type="date"
                      value={filterTo}
                      onChange={(e) => setFilterTo(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--muted-foreground)] block mb-0.5">Min ₹</label>
                    <input
                      type="number"
                      value={filterMin}
                      onChange={(e) => setFilterMin(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--muted-foreground)] block mb-0.5">Max ₹</label>
                    <input
                      type="number"
                      value={filterMax}
                      onChange={(e) => setFilterMax(e.target.value)}
                      placeholder="999999"
                      className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    {isSearching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Filter className="w-3.5 h-3.5" />
                    )}
                    {tCommon("search") || "Search"}
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {isSearching ? (
                <div className="py-8 flex flex-col items-center justify-center text-[var(--muted-foreground)]">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                  <p className="text-sm">Searching unlinked payments...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-[var(--muted-foreground)] text-xs sm:text-sm">
                  No matching unlinked payments found for this criteria.
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((candidate) => {
                    const isSelected = selectedCandidates.some(
                      (c) =>
                        c.entity_type === candidate.entity_type &&
                        c.entity_id === candidate.entity_id
                    );
                    return (
                      <div
                        key={`${candidate.entity_type}-${candidate.entity_id}`}
                        onClick={() => toggleSelectCandidate(candidate)}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3",
                          isSelected
                            ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 shadow-sm"
                            : "border-[var(--border)] hover:border-[var(--muted-foreground)]/30 bg-[var(--card)]"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-colors",
                            isSelected
                              ? "bg-blue-500 border-blue-500 text-white"
                              : "border-[var(--muted-foreground)]/40 bg-[var(--background)]"
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm text-[var(--foreground)] truncate">
                              {candidate.party_name}
                            </h4>
                            <span className="font-bold text-sm text-[var(--foreground)] shrink-0">
                              ₹{candidate.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)] mt-1">
                            <span>{candidate.date}</span>
                            <span>•</span>
                            <span>{candidate.payment_method}</span>
                            {candidate.is_cash && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                                {t("badgeCash")}
                              </span>
                            )}
                            {candidate.reference && (
                              <>
                                <span>•</span>
                                <span className="font-mono truncate max-w-[200px]">
                                  {candidate.reference}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] shrink-0 bg-[var(--background)] flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--muted-foreground)]">
            {selectedCandidates.length} payment(s) selected
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors"
            >
              {tCommon("cancel") || "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleConfirmMatch}
              disabled={isSubmitting || selectedCandidates.length === 0 || isOverAllocated}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors text-white",
                selectedCandidates.length === 0 || isOverAllocated
                  ? "bg-blue-600/50 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("btnMatching")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {t("btnConfirmMatch")}
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
