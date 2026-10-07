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
import { Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import type {
  BankTransaction,
  BankMatchLink,
  ExcludeReason,
  VarianceReason,
} from "@/modules/banking/domain/types";

// ─── Exclude Modal ────────────────────────────────────────────────

interface ExcludeModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: BankTransaction | null;
  onSuccess: () => void;
}

export function ExcludeModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}: ExcludeModalProps) {
  const t = useTranslations("banking");
  const tCommon = useTranslations("common");

  const [reason, setReason] = useState<ExcludeReason>("Bank charges");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/banking/transactions/${transaction.id}/exclude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note: note.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("toastErrorGeneric"));

      toast.success(t("toastExcludeSuccess"));
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || t("toastErrorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent fullScreenMobile className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("excludeModalTitle")}</DialogTitle>
          <DialogDescription>{t("excludeModalDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">
              {t("excludeReasonLabel")}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ExcludeReason)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Bank charges">{t("excludeReasonBankCharges")}</option>
              <option value="Interest">{t("excludeReasonInterest")}</option>
              <option value="Internal transfer">{t("excludeReasonInternalTransfer")}</option>
              <option value="Other">{t("excludeReasonOther")}</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">
              {t("excludeNoteLabel")}
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("excludeNotePlaceholder")}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              {tCommon("cancel") || "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("btnExcluding")}
                </>
              ) : (
                t("btnExclude")
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Accept Variance Modal ────────────────────────────────────────

interface AcceptVarianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: BankTransaction | null;
  onSuccess: () => void;
}

export function AcceptVarianceModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}: AcceptVarianceModalProps) {
  const t = useTranslations("banking");
  const tCommon = useTranslations("common");

  const [reason, setReason] = useState<VarianceReason>("TDS");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!transaction) return null;

  const rowAmountPaise =
    transaction.credit_paise > 0
      ? transaction.credit_paise
      : transaction.debit_paise;
  const variancePaise = Math.max(0, rowAmountPaise - (transaction.allocated_paise || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/banking/transactions/${transaction.id}/accept-variance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("toastErrorGeneric"));

      toast.success(t("toastVarianceSuccess"));
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || t("toastErrorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent fullScreenMobile className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("varianceModalTitle")}</DialogTitle>
          <DialogDescription>{t("varianceModalDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <span className="text-[var(--muted-foreground)] block">
              {t("varianceAmountLabel")}
            </span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
              ₹{(variancePaise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">
              {t("varianceReasonLabel")}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as VarianceReason)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="TDS">{t("varianceReasonTDS")}</option>
              <option value="Bank charges">{t("varianceReasonBankCharges")}</option>
              <option value="Rounding">{t("varianceReasonRounding")}</option>
              <option value="Other">{t("varianceReasonOther")}</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              {tCommon("cancel") || "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("btnAcceptingVariance")}
                </>
              ) : (
                t("btnAcceptVariance")
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Unlink Confirm Modal ─────────────────────────────────────────

interface UnlinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: BankMatchLink | null;
  onSuccess: () => void;
}

export function UnlinkModal({
  isOpen,
  onClose,
  link,
  onSuccess,
}: UnlinkModalProps) {
  const t = useTranslations("banking");
  const tCommon = useTranslations("common");

  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!link) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/banking/links/${link.id}/unlink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("toastErrorGeneric"));

      toast.success(t("toastUnlinkSuccess"));
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || t("toastErrorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent fullScreenMobile className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            {t("unlinkTitle")}
          </DialogTitle>
          <DialogDescription>{t("unlinkConfirmDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">{t("thParty")}:</span>
              <span className="font-semibold text-[var(--foreground)]">{link.snapshot.party_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">{t("thPaymentAmount")}:</span>
              <span className="font-bold text-[var(--foreground)]">
                ₹{(link.allocated_paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">
              {t("unlinkReasonLabel")}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("unlinkReasonPlaceholder")}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              {tCommon("cancel") || "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("btnUnlinking")}
                </>
              ) : (
                t("btnUnlink")
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
