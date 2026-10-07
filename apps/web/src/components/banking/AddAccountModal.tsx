"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Landmark, Loader2 } from "lucide-react";
import type { BankAccount, BankAccountType } from "@/modules/banking/domain/types";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated: (account: BankAccount) => void;
  editingAccount?: BankAccount | null;
}

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
    editingAccount?.opening_balance_date || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset or initialize state when modal opens or editingAccount changes
  React.useEffect(() => {
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
      setOpeningBalanceDate(editingAccount.opening_balance_date || "");
    } else {
      setName("");
      setBankName("");
      setAccountLast4("");
      setIfsc("");
      setAccountType("Current");
      setOpeningBalance("");
      setOpeningBalanceDate("");
    }
  }, [editingAccount, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !bankName.trim() || !accountLast4.trim()) {
      return;
    }

    if (!/^\d{4}$/.test(accountLast4.trim())) {
      toast.error(t("accountLast4Placeholder"));
      return;
    }

    if (ifsc.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase())) {
      toast.error(t("ifscPlaceholder"));
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
        const idempotencyKey = crypto.randomUUID();
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent fullScreenMobile className="sm:max-w-[480px]">
        <DialogHeader className="border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[var(--foreground)]">
                {editingAccount ? t("modalEditAccountTitle") : t("modalAddAccountTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--muted-foreground)]">
                {t("subtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-medium text-[var(--foreground)] block mb-1">
              {t("accountName")} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("accountNamePlaceholder")}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--foreground)] block mb-1">
                {t("bankName")} *
              </label>
              <input
                type="text"
                required
                disabled={Boolean(editingAccount)}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder={t("bankNamePlaceholder")}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--foreground)] block mb-1">
                {t("accountLast4")} *
              </label>
              <input
                type="text"
                required
                maxLength={4}
                pattern="\d{4}"
                disabled={Boolean(editingAccount)}
                value={accountLast4}
                onChange={(e) => setAccountLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder={t("accountLast4Placeholder")}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--foreground)] block mb-1">
                {t("ifscCode")}
              </label>
              <input
                type="text"
                maxLength={11}
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder={t("ifscPlaceholder")}
                className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--foreground)] block mb-1">
                {t("accountType")} *
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as BankAccountType)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="Current">{t("typeCurrent")}</option>
                <option value="Savings">{t("typeSavings")}</option>
                <option value="OD">{t("typeOD")}</option>
                <option value="CC">{t("typeCC")}</option>
                <option value="Other">{t("typeOther")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--foreground)] block mb-1">
                {t("openingBalance")}
              </label>
              <input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--foreground)] block mb-1">
                {t("openingBalanceDate")}
              </label>
              <input
                type="date"
                value={openingBalanceDate}
                onChange={(e) => setOpeningBalanceDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50 transition-colors"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-colors shadow-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{tCommon("loading")}</span>
                </>
              ) : (
                <span>{editingAccount ? tCommon("update") : tCommon("save")}</span>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
