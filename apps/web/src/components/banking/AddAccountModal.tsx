"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Landmark, Loader2, X, Building2, CreditCard } from "lucide-react";
import type { BankAccount, BankAccountType } from "@/modules/banking/domain/types";
import { generateId } from "@/lib/uuid";
import { cn } from "@/lib/utils";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated: (account: BankAccount) => void;
  editingAccount?: BankAccount | null;
}

const getTodayDateString = () => new Date().toISOString().split("T")[0];

export function AddAccountModal({
  isOpen,
  onClose,
  onAccountCreated,
  editingAccount,
}: AddAccountModalProps) {
  const t = useTranslations("banking");
  const tCommon = useTranslations("common");

  const [name, setName] = useState(editingAccount?.name || "");
  const [bankName, setBankName] = useState(editingAccount?.bank_name || "");
  const [accountLast4, setAccountLast4] = useState(editingAccount?.account_last4 || "");
  const [ifsc, setIfsc] = useState(editingAccount?.ifsc || "");
  const [accountType, setAccountType] = useState<BankAccountType>(
    editingAccount?.account_type || "Current"
  );
  const [openingBalance, setOpeningBalance] = useState(
    editingAccount?.opening_balance_paise != null
      ? (editingAccount.opening_balance_paise / 100).toFixed(2)
      : ""
  );
  const [openingBalanceDate, setOpeningBalanceDate] = useState(
    editingAccount?.opening_balance_date || getTodayDateString()
  );
  const [errors, setErrors] = useState<{
    name?: string;
    bankName?: string;
    accountLast4?: string;
    ifsc?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset or initialize state when modal opens or editingAccount changes
  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setBankName(editingAccount.bank_name);
      setAccountLast4(editingAccount.account_last4);
      setIfsc(editingAccount.ifsc || "");
      setAccountType(editingAccount.account_type);
      setOpeningBalance(
        editingAccount.opening_balance_paise != null
          ? (editingAccount.opening_balance_paise / 100).toFixed(2)
          : ""
      );
      setOpeningBalanceDate(editingAccount.opening_balance_date || getTodayDateString());
      setErrors({});
    } else {
      setName("");
      setBankName("");
      setAccountLast4("");
      setIfsc("");
      setAccountType("Current");
      setOpeningBalance("");
      setOpeningBalanceDate(getTodayDateString());
      setErrors({});
    }
  }, [editingAccount, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: {
      name?: string;
      bankName?: string;
      accountLast4?: string;
      ifsc?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = t("errNicknameRequired");
    }

    if (!bankName.trim()) {
      newErrors.bankName = t("errBankNameRequired");
    }

    if (!accountLast4.trim()) {
      newErrors.accountLast4 = t("errAccountLast4Required");
    } else if (!/^\d{4}$/.test(accountLast4.trim())) {
      newErrors.accountLast4 = t("errAccountLast4Invalid");
    }

    if (ifsc.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase())) {
      newErrors.ifsc = t("errIfscInvalid");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      let openingBalancePaise: number | null = null;
      if (openingBalance.trim()) {
        const floatVal = parseFloat(openingBalance.replace(/,/g, ""));
        if (!isNaN(floatVal)) {
          openingBalancePaise = Math.round(floatVal * 100);
        }
      }

      if (editingAccount) {
        const res = await fetch(`/api/banking/accounts/${editingAccount.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            ifsc: ifsc.trim().toUpperCase() || null,
            account_type: accountType,
            opening_balance_paise: openingBalancePaise,
            opening_balance_date: openingBalanceDate || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update account");
        toast.success(t("toastAccountUpdated"));
        onAccountCreated(data);
        onClose();
      } else {
        const idempotencyKey = generateId();
        const res = await fetch("/api/banking/accounts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            name: name.trim(),
            bank_name: bankName.trim(),
            account_last4: accountLast4.trim(),
            ifsc: ifsc.trim().toUpperCase() || null,
            account_type: accountType,
            opening_balance_paise: openingBalancePaise,
            opening_balance_date: openingBalanceDate || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create account");
        toast.success(t("toastAccountCreated"));
        onAccountCreated(data);
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || t("toastErrorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBaseClass = cn(
    "w-full h-12 px-3.5 text-sm rounded-xl",
    "bg-[var(--card)] text-[var(--foreground)]",
    "border border-[var(--border)]",
    "placeholder:text-[var(--muted-foreground)]/50",
    "outline-none ring-0",
    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20",
    "transition-all duration-150",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90dvh] md:max-h-[85dvh] flex flex-col overflow-hidden p-0">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Header */}
          <div className="shrink-0 px-5 pt-2 pb-3.5 sm:pt-4 border-b border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--card)]/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center shrink-0 shadow-sm">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-[var(--foreground)] truncate">
                  {editingAccount ? t("modalEditAccountTitle") : t("modalAddAccountTitle")}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                  {t("subtitle")}
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/60 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-6">
            {/* Section 1: Account Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1.5 border-b border-[var(--border)]/60">
                <Building2 className="w-3.5 h-3.5 text-sky-500" />
                <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                  {t("sectionAccountDetails")}
                </h3>
              </div>

              {/* Nickname */}
              <div>
                <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                  {t("accountName")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder={t("accountNamePlaceholder")}
                  className={cn(
                    inputBaseClass,
                    errors.name && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                />
                {errors.name ? (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.name}</p>
                ) : (
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                    Display name for transactions and reports
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bank Name */}
                <div>
                  <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                    {t("bankName")} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="text"
                    disabled={Boolean(editingAccount)}
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      if (errors.bankName) setErrors((prev) => ({ ...prev, bankName: undefined }));
                    }}
                    placeholder={t("bankNamePlaceholder")}
                    className={cn(
                      inputBaseClass,
                      errors.bankName && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                  />
                  {errors.bankName ? (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.bankName}</p>
                  ) : null}
                </div>

                {/* Account Last 4 */}
                <div>
                  <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                    {t("accountLast4")} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    disabled={Boolean(editingAccount)}
                    value={accountLast4}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setAccountLast4(digits);
                      if (errors.accountLast4) setErrors((prev) => ({ ...prev, accountLast4: undefined }));
                    }}
                    placeholder={t("accountLast4Placeholder")}
                    className={cn(
                      inputBaseClass,
                      "font-mono tracking-wider",
                      errors.accountLast4 && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                  />
                  {errors.accountLast4 ? (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.accountLast4}</p>
                  ) : (
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                      Only last 4 digits (e.g. 5678)
                    </p>
                  )}
                </div>
              </div>

              {/* Account Type */}
              <div>
                <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                  {t("accountType")} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as BankAccountType)}
                  className={cn(inputBaseClass, "cursor-pointer")}
                >
                  <option value="Current">{t("typeCurrent")}</option>
                  <option value="Savings">{t("typeSavings")}</option>
                  <option value="OD">{t("typeOD")}</option>
                  <option value="CC">{t("typeCC")}</option>
                  <option value="Other">{t("typeOther")}</option>
                </select>
              </div>
            </div>

            {/* Section 2: Balance & IFSC */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1.5 border-b border-[var(--border)]/60">
                <CreditCard className="w-3.5 h-3.5 text-sky-500" />
                <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                  {t("sectionBalanceIfsc")}
                </h3>
              </div>

              {/* IFSC */}
              <div>
                <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                  {t("ifscCode")}
                </label>
                <input
                  type="text"
                  inputMode="text"
                  maxLength={11}
                  value={ifsc}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().slice(0, 11);
                    setIfsc(val);
                    if (errors.ifsc) setErrors((prev) => ({ ...prev, ifsc: undefined }));
                  }}
                  placeholder="e.g. HDFC0001234"
                  className={cn(
                    inputBaseClass,
                    "font-mono uppercase",
                    errors.ifsc && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                />
                {errors.ifsc ? (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.ifsc}</p>
                ) : (
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                    11 characters, 5th character is 0 (e.g. HDFC0001234)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opening Balance */}
                <div>
                  <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                    {t("openingBalance")}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0.00"
                    className={inputBaseClass}
                  />
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                    Initial book balance in Rupees
                  </p>
                </div>

                {/* Opening Balance Date */}
                <div>
                  <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                    {t("openingBalanceDate")}
                  </label>
                  <input
                    type="date"
                    value={openingBalanceDate}
                    onChange={(e) => setOpeningBalanceDate(e.target.value)}
                    className={inputBaseClass}
                  />
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                    Defaults to today
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer: Cancel and Save, equal height, 2 columns on mobile */}
          <div className="shrink-0 px-5 py-3 border-t border-[var(--border)] bg-[var(--card)]/90 backdrop-blur pb-[max(env(safe-area-inset-bottom),14px)]">
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-12 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 font-medium text-sm transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{tCommon("loading")}</span>
                  </>
                ) : (
                  <span>{editingAccount ? tCommon("update") : tCommon("save")}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
