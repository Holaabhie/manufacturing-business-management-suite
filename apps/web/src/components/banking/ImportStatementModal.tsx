"use client";

import React, { useState, useRef, useEffect } from "react";
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
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Landmark,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  BankAccount,
  BankStatementImport,
  CsvMapping,
  PreviewResult,
  AmountMode,
  DateFormat,
} from "@/modules/banking/domain/types";

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  initialAccountId?: string | null;
  onImportComplete: (importDoc: BankStatementImport) => void;
}

type WizardStep = "account" | "upload" | "preview" | "summary";

export function ImportStatementModal({
  isOpen,
  onClose,
  accounts,
  initialAccountId,
  onImportComplete,
}: ImportStatementModalProps) {
  const t = useTranslations("banking");
  const tCommon = useTranslations("common");

  const [step, setStep] = useState<WizardStep>("account");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Preview & Mapping State
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [showErrorsList, setShowErrorsList] = useState(false);

  // Commit State
  const [isCommitting, setIsCommitting] = useState(false);
  const [committedImport, setCommittedImport] = useState<BankStatementImport | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset or initialize only when modal transitions from closed to open
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setStep(initialAccountId ? "upload" : "account");
      setSelectedAccountId(initialAccountId || (accounts[0]?.id || ""));
      setSelectedFile(null);
      setPreviewResult(null);
      setMapping(null);
      setCommittedImport(null);
      setShowErrorsList(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialAccountId, accounts]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // ─── Step 1: Account Selection ──────────────────────────────────
  const handleAccountNext = () => {
    if (!selectedAccountId) {
      toast.error(t("selectAccountPrompt"));
      return;
    }
    setStep("upload");
  };

  // ─── Step 2: File Handling ──────────────────────────────────────
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error(t("errInvalidCsv"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("supportedCsvNote"));
      return;
    }
    setSelectedFile(file);
    fetchPreview(file, selectedAccountId);
  };

  // ─── Step 3: Fetch Preview ──────────────────────────────────────
  const fetchPreview = async (
    file: File,
    accountId: string,
    mappingOverride?: CsvMapping | null
  ) => {
    setIsLoadingPreview(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bank_account_id", accountId);
      if (mappingOverride) {
        formData.append("mapping", JSON.stringify(mappingOverride));
      }

      const res = await fetch("/api/banking/imports/preview", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse preview");

      setPreviewResult(data);
      const activeMapping = mappingOverride || data.suggested_mapping;
      setMapping(activeMapping);

      // Extract unique column names from suggested mapping
      const cols = new Set<string>();
      if (activeMapping.date_column) cols.add(activeMapping.date_column);
      if (activeMapping.narration_column) cols.add(activeMapping.narration_column);
      if (activeMapping.bank_ref_column) cols.add(activeMapping.bank_ref_column);
      if (activeMapping.cheque_no_column) cols.add(activeMapping.cheque_no_column);
      if (activeMapping.balance_column) cols.add(activeMapping.balance_column);
      if (activeMapping.debit_column) cols.add(activeMapping.debit_column);
      if (activeMapping.credit_column) cols.add(activeMapping.credit_column);
      if (activeMapping.amount_column) cols.add(activeMapping.amount_column);
      if (activeMapping.indicator_column) cols.add(activeMapping.indicator_column);

      // Add detected columns from first preview row
      if (data.preview_rows?.[0]) {
        // columns from headers
      }

      setDetectedColumns(Array.from(cols));
      setStep("preview");
    } catch (err: any) {
      toast.error(err.message || t("errInvalidCsv"));
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleUpdateMappingField = (field: keyof CsvMapping, value: any) => {
    if (!mapping || !selectedFile || !selectedAccountId) return;
    const updated: CsvMapping = { ...mapping, [field]: value };
    setMapping(updated);
    fetchPreview(selectedFile, selectedAccountId, updated);
  };

  // ─── Step 4: Commit Import ──────────────────────────────────────
  const handleCommit = async () => {
    if (!selectedFile || !selectedAccountId || !mapping) return;

    setIsCommitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("bank_account_id", selectedAccountId);
      formData.append("mapping", JSON.stringify(mapping));

      const res = await fetch("/api/banking/imports/commit", {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(data.error || t("alreadyImportedWarning"));
        }
        throw new Error(data.error || "Failed to commit import");
      }

      setCommittedImport(data);
      toast.success(t("toastImportSuccess"));
      onImportComplete(data);
      setStep("summary");
    } catch (err: any) {
      toast.error(err.message || t("toastErrorGeneric"));
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent fullScreenMobile className="sm:max-w-[720px] max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-[var(--foreground)]">
                  {t("importWizardTitle")}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--muted-foreground)]">
                  {selectedAccount ? `${selectedAccount.bank_name} (${selectedAccount.account_last4})` : t("subtitle")}
                </DialogDescription>
              </div>
            </div>

            {/* Stepper Indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              {(["account", "upload", "preview", "summary"] as WizardStep[]).map((s, idx) => (
                <div
                  key={s}
                  className={cn(
                    "px-2 py-0.5 rounded-full font-medium text-[11px]",
                    step === s
                      ? "bg-sky-500 text-white font-semibold"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  )}
                >
                  {idx + 1}. {t(`step${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 space-y-4">
          {/* STEP 1: SELECT ACCOUNT */}
          {step === "account" && (
            <div className="space-y-4 max-w-md mx-auto py-6">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  {t("selectAccountPrompt")}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("subtitle")}
                </p>
              </div>

              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={cn(
                      "p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                      selectedAccountId === acc.id
                        ? "border-sky-500 bg-sky-500/5 shadow-sm"
                        : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--muted)] text-[var(--foreground)] flex items-center justify-center">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--foreground)]">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-[var(--muted-foreground)]">
                          {acc.bank_name} •••• {acc.account_last4} ({acc.account_type})
                        </div>
                      </div>
                    </div>
                    {selectedAccountId === acc.id && (
                      <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={!selectedAccountId}
                  onClick={handleAccountNext}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-colors shadow-sm inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span>{t("btnNext")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: UPLOAD CSV */}
          {step === "upload" && (
            <div className="space-y-4 max-w-md mx-auto py-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3",
                  isDragOver
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-[var(--border)] hover:border-sky-500/50 bg-[var(--card)]"
                )}
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--foreground)]">
                    {t("dragDropText")}
                  </h4>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                    {t("supportedCsvNote")}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {isLoadingPreview && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-[var(--muted-foreground)]">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                  <span>{tCommon("loading")}</span>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("account")}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t("btnBack")}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: MAPPING & PREVIEW */}
          {step === "preview" && previewResult && mapping && (
            <div className="space-y-5">
              {/* Warnings if any */}
              {previewResult.already_imported && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{t("alreadyImportedWarning")}</span>
                </div>
              )}

              {previewResult.balance_check?.warning && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {t("balanceMismatchWarning", {
                      mismatches: previewResult.balance_check.mismatches,
                    })}
                  </span>
                </div>
              )}

              {/* Mapping Config Controls */}
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                    {t("stepPreview")}
                  </h4>
                  <span className="text-[11px] text-[var(--muted-foreground)] font-mono">
                    {previewResult.file_name} ({previewResult.encoding_detected})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">
                      {t("colDate")} *
                    </label>
                    <input
                      type="text"
                      value={mapping.date_column}
                      onChange={(e) => handleUpdateMappingField("date_column", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] text-[var(--foreground)]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">
                      {t("dateFormat")} *
                    </label>
                    <select
                      value={mapping.date_format}
                      onChange={(e) => handleUpdateMappingField("date_format", e.target.value as DateFormat)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] text-[var(--foreground)]"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="DD/MM/YY">DD/MM/YY</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                      <option value="DD-MMM-YYYY">DD-MMM-YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">
                      {t("colNarration")} *
                    </label>
                    <input
                      type="text"
                      value={mapping.narration_column}
                      onChange={(e) => handleUpdateMappingField("narration_column", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] text-[var(--foreground)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">
                      {t("amountMode")} *
                    </label>
                    <select
                      value={mapping.amount_mode}
                      onChange={(e) => handleUpdateMappingField("amount_mode", e.target.value as AmountMode)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] text-[var(--foreground)]"
                    >
                      <option value="separate">{t("modeSeparate")}</option>
                      <option value="signed">{t("modeSigned")}</option>
                      <option value="indicator">{t("modeIndicator")}</option>
                    </select>
                  </div>

                  {mapping.amount_mode === "separate" ? (
                    <>
                      <div>
                        <label className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">
                          {t("colDebit")}
                        </label>
                        <input
                          type="text"
                          value={mapping.debit_column || ""}
                          onChange={(e) => handleUpdateMappingField("debit_column", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] text-[var(--foreground)]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">
                          {t("colCredit")}
                        </label>
                        <input
                          type="text"
                          value={mapping.credit_column || ""}
                          onChange={(e) => handleUpdateMappingField("credit_column", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] text-[var(--foreground)]"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">
                          {t("colAmount")}
                        </label>
                        <input
                          type="text"
                          value={mapping.amount_column || ""}
                          onChange={(e) => handleUpdateMappingField("amount_column", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] text-[var(--foreground)]"
                        />
                      </div>
                      {mapping.amount_mode === "indicator" && (
                        <div>
                          <label className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">
                            {t("colIndicator")}
                          </label>
                          <input
                            type="text"
                            value={mapping.indicator_column || ""}
                            onChange={(e) => handleUpdateMappingField("indicator_column", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] text-[var(--foreground)]"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">
                      {t("colRef")}
                    </label>
                    <input
                      type="text"
                      value={mapping.bank_ref_column || ""}
                      onChange={(e) => handleUpdateMappingField("bank_ref_column", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] text-[var(--foreground)]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">
                      {t("colCheque")}
                    </label>
                    <input
                      type="text"
                      value={mapping.cheque_no_column || ""}
                      onChange={(e) => handleUpdateMappingField("cheque_no_column", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] text-[var(--foreground)]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">
                      {t("colBalance")}
                    </label>
                    <input
                      type="text"
                      value={mapping.balance_column || ""}
                      onChange={(e) => handleUpdateMappingField("balance_column", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] text-[var(--foreground)]"
                    />
                  </div>
                </div>
              </div>

              {/* Preview Stats & Error Count */}
              <div className="flex items-center justify-between text-xs">
                <div className="text-[var(--muted-foreground)]">
                  {t("previewSummary", {
                    valid: previewResult.rows_valid,
                    errors: previewResult.rows_error,
                  })}
                </div>
                {previewResult.rows_error > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowErrorsList(!showErrorsList)}
                    className="text-rose-500 font-medium underline text-xs cursor-pointer"
                  >
                    {showErrorsList ? "Hide Error Details" : `View ${previewResult.rows_error} Errors`}
                  </button>
                )}
              </div>

              {/* Optional Error List toggle */}
              {showErrorsList && previewResult.errors.length > 0 && (
                <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 max-h-36 overflow-y-auto space-y-1 text-xs text-rose-600 dark:text-rose-400 font-mono">
                  {previewResult.errors.map((err, i) => (
                    <div key={i}>
                      Line {err.row_no}: {err.message}
                    </div>
                  ))}
                </div>
              )}

              {/* 10-Row Preview Table */}
              <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--card)]">
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full table-fixed text-left text-xs">
                    <thead className="bg-[var(--muted)]/50 text-[var(--muted-foreground)] uppercase text-[10px] border-b border-[var(--border)]">
                      <tr>
                        <th className="p-2.5 w-[90px]">{t("thDate")}</th>
                        <th className="p-2.5 w-[220px]">{t("thNarration")}</th>
                        <th className="p-2.5 w-[100px]">{t("thRef")}</th>
                        <th className="p-2.5 w-[90px] text-right">{t("thDebit")}</th>
                        <th className="p-2.5 w-[90px] text-right">{t("thCredit")}</th>
                        <th className="p-2.5 w-[95px] text-right">{t("thBalance")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {previewResult.preview_rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[var(--muted)]/20">
                          <td className="p-2.5 text-[var(--muted-foreground)] whitespace-nowrap">
                            {row.value_date}
                          </td>
                          <td className="p-2.5 font-medium text-[var(--foreground)] truncate">
                            {row.narration}
                          </td>
                          <td className="p-2.5 text-[var(--muted-foreground)] font-mono truncate">
                            {row.bank_ref || "—"}
                          </td>
                          <td className="p-2.5 text-right font-medium text-rose-500">
                            {row.debit_paise > 0 ? `₹${(row.debit_paise / 100).toFixed(2)}` : "—"}
                          </td>
                          <td className="p-2.5 text-right font-medium text-emerald-500">
                            {row.credit_paise > 0 ? `₹${(row.credit_paise / 100).toFixed(2)}` : "—"}
                          </td>
                          <td className="p-2.5 text-right text-[var(--foreground)] font-mono">
                            {row.balance_after_paise != null
                              ? `₹${(row.balance_after_paise / 100).toFixed(2)}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t("btnBack")}</span>
                </button>

                <button
                  type="button"
                  disabled={isCommitting || previewResult.rows_valid === 0}
                  onClick={handleCommit}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-colors shadow-sm inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isCommitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t("btnCommitting")}</span>
                    </>
                  ) : (
                    <span>{t("btnCommitImport")}</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUMMARY */}
          {step === "summary" && committedImport && (
            <div className="space-y-6 max-w-md mx-auto py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  {t("importSuccessTitle")}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {committedImport.file_name}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[var(--muted-foreground)]">
                    {t("rowsInserted")}
                  </div>
                  <div className="text-base font-bold text-emerald-500 mt-0.5">
                    {committedImport.rows_inserted}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-[var(--muted-foreground)]">
                    {t("rowsSkippedDuplicates")}
                  </div>
                  <div className="text-base font-bold text-amber-500 mt-0.5">
                    {committedImport.rows_skipped_duplicate}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-[var(--muted-foreground)]">
                    {t("rowsError")}
                  </div>
                  <div className="text-base font-bold text-rose-500 mt-0.5">
                    {committedImport.rows_error}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-colors shadow-sm"
              >
                {t("btnDone")}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
