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
import { AlertTriangle, Loader2 } from "lucide-react";
import type { BankStatementImport } from "@/modules/banking/domain/types";

interface RevertImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importDoc: BankStatementImport | null;
  onReverted: (reverted: BankStatementImport) => void;
}

export function RevertImportModal({
  isOpen,
  onClose,
  importDoc,
  onReverted,
}: RevertImportModalProps) {
  const t = useTranslations("banking");
  const tCommon = useTranslations("common");

  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen]);

  if (!importDoc) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/banking/imports/${importDoc.id}/revert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revert import");

      toast.success(t("toastImportReverted"));
      onReverted(data);
      onClose();
    } catch (err: any) {
      toast.error(err.message || t("toastErrorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent fullScreenMobile className="sm:max-w-[440px]">
        <DialogHeader className="border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[var(--foreground)]">
                {t("revertConfirmTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--muted-foreground)]">
                {importDoc.file_name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <p className="text-xs text-[var(--muted-foreground)]">
            {t("revertConfirmDesc")}
          </p>

          <div>
            <label className="text-xs font-medium text-[var(--foreground)] block mb-1">
              {t("revertReasonLabel")} *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("revertReasonPlaceholder")}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            />
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
              disabled={isSubmitting || !reason.trim()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("btnReverting")}</span>
                </>
              ) : (
                <span>{t("btnRevert")}</span>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
