"use client";

import React, { useState, useCallback } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { toast } from "sonner";
import "./ConfirmDeleteSheet.css";

export interface ConfirmDeleteSheetProps {
  /** Controls visibility of the sheet/modal */
  open: boolean;
  /** Called when the modal should close (cancel button, backdrop, ESC, swipe) */
  onClose: () => void;
  /** Async callback executed when user clicks Delete */
  onConfirm: () => void | Promise<void>;
  /** Label for entity type (e.g. "vendor", "client", "order", "payment", "item", "machine", "employee") */
  entityLabel: string;
  /** Name/identifier of entity being deleted (e.g. "Acme Supplies") */
  entityName?: string;
  /** Custom modal title. Defaults to "Delete this {entityLabel}?" */
  title?: string;
  /** Domain-specific consequence text. Defaults to "This action cannot be undone." */
  consequenceText?: string;
  /** Text for primary destructive button. Defaults to "Delete {entityLabel}" */
  confirmText?: string;
  /** Text for secondary cancel button. Defaults to "Cancel" */
  cancelText?: string;
  /** External loading indicator state */
  isDeleting?: boolean;
  /** Accessibility label for dialog container */
  ariaLabel?: string;
}

// ─── Pure Helper Formatters (Tested & Safe) ───────────────────

export function getDeleteTitle(entityLabel: string, title?: string): string {
  return title || `Delete this ${entityLabel.toLowerCase()}?`;
}

export function getDeleteConfirmText(entityLabel: string, confirmText?: string): string {
  return confirmText || `Delete ${entityLabel.toLowerCase()}`;
}

export function getDeleteAriaLabel(entityLabel: string, ariaLabel?: string): string {
  return ariaLabel || `Delete ${entityLabel.toLowerCase()} confirmation`;
}

export function getDeleteBodyCopyInfo(
  entityLabel: string,
  entityName?: string,
  consequenceText = "This action cannot be undone."
): { name?: string; text: string; isFallback: boolean } {
  const trimmedName = entityName?.trim();
  if (trimmedName) {
    return { name: trimmedName, text: consequenceText, isFallback: false };
  }
  return { text: `This ${entityLabel.toLowerCase()} ${consequenceText}`, isFallback: true };
}

export function ConfirmDeleteSheet({
  open,
  onClose,
  onConfirm,
  entityLabel,
  entityName,
  title,
  consequenceText = "This action cannot be undone.",
  confirmText,
  cancelText = "Cancel",
  isDeleting = false,
  ariaLabel,
}: ConfirmDeleteSheetProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const loading = isDeleting || internalLoading;

  const handleConfirm = useCallback(async () => {
    if (loading) return;
    setInternalLoading(true);
    try {
      await onConfirm();
    } catch (err: any) {
      toast.error(err?.message || `Failed to delete ${entityLabel.toLowerCase()}`);
    } finally {
      setInternalLoading(false);
    }
  }, [loading, onConfirm, entityLabel]);

  // Formatted title, text, aria-label, and copy using exported helpers
  const displayTitle = getDeleteTitle(entityLabel, title);
  const displayConfirmText = getDeleteConfirmText(entityLabel, confirmText);
  const dialogAriaLabel = getDeleteAriaLabel(entityLabel, ariaLabel);
  const copyInfo = getDeleteBodyCopyInfo(entityLabel, entityName, consequenceText);

  // Safe body copy formatting (prevents "undefined will be permanently removed...")
  const renderBodyCopy = () => {
    if (copyInfo.name) {
      return (
        <>
          <b className="font-semibold text-slate-900 dark:text-white">{copyInfo.name}</b>{" "}
          {copyInfo.text}
        </>
      );
    }
    return <>{copyInfo.text}</>;
  };

  return (
    <div className="confirm-delete-sheet-root">
      <MobileSheet
        open={open}
        onClose={loading ? () => {} : onClose}
        maxWidth="420px"
        showHandle={true}
        dragToClose={!loading}
        className="confirm-delete-sheet__container"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={dialogAriaLabel}
          className="w-full text-slate-900 dark:text-white"
        >
          {/* ════════════ DESKTOP LAYOUT (≥1024px) ════════════ */}
          <div className="hidden lg:block p-6">
            {/* Top-left icon tile */}
            <div className="w-10 h-10 rounded-[14px] bg-red-500/10 dark:bg-red-500/20 text-[#F04438] flex items-center justify-center mb-3">
              <Trash2 className="h-5 w-5" />
            </div>

            {/* Title */}
            <h3 className="text-[18px] font-bold text-slate-900 dark:text-white leading-tight mb-2 text-left">
              {displayTitle}
            </h3>

            {/* Body copy */}
            <p className="text-[14px] text-slate-600 dark:text-slate-300 text-left mb-6 leading-normal">
              {renderBodyCopy()}
            </p>

            {/* Actions right-aligned */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                autoFocus
                onClick={onClose}
                disabled={loading}
                className="h-10 px-4 rounded-[12px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-[14px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-slate-400"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="h-10 px-4 rounded-[12px] bg-[#F04438] hover:bg-[#D92D20] text-white font-medium text-[14px] transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>{displayConfirmText}</span>
                )}
              </button>
            </div>
          </div>

          {/* ════════════ MOBILE LAYOUT (<1024px) ════════════ */}
          <div className="block lg:hidden px-6 pt-1 pb-6">
            {/* Large centered 64px circle icon */}
            <div className="w-16 h-16 rounded-full bg-red-500/10 dark:bg-red-500/20 text-[#F04438] flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-8 w-8" />
            </div>

            {/* Centered title */}
            <h3 className="text-[20px] font-bold text-center text-slate-900 dark:text-white mb-2 leading-tight">
              {displayTitle}
            </h3>

            {/* Centered body copy */}
            <p className="text-[14px] text-center text-slate-600 dark:text-slate-300 mb-6 px-1 leading-normal">
              {renderBodyCopy()}
            </p>

            {/* Stacked full-width buttons */}
            <div className="flex flex-col gap-2.5 w-full">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="w-full h-12 rounded-[14px] bg-[#F04438] hover:bg-[#D92D20] active:bg-[#C0261D] text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>{displayConfirmText}</span>
                )}
              </button>
              <button
                type="button"
                autoFocus
                onClick={onClose}
                disabled={loading}
                className="w-full h-12 rounded-[14px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[15px] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-slate-400"
              >
                {cancelText}
              </button>
            </div>

            {/* Bottom microcopy */}
            <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center mt-3.5 mb-0 font-medium select-none">
              Tap outside or swipe down to cancel
            </p>
          </div>
        </div>
      </MobileSheet>
    </div>
  );
}
