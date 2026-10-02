"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ShoppingCart, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { useFormatters } from "@/hooks/useFormatters";
import type { Quotation } from "@/modules/quotes/domain/types";
import { cn } from "@/lib/utils";

interface ConvertLinePickerModalProps {
  open: boolean;
  onClose: () => void;
  quote: Quotation | null;
  onSelectLine: (lineIndex: number) => void;
}

export function ConvertLinePickerModal({
  open,
  onClose,
  quote,
  onSelectLine,
}: ConvertLinePickerModalProps) {
  const t = useTranslations("quotes");
  const { formatINR: formatCurrency } = useFormatters();
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  // Determine which lines are converted
  const convertedIndices = useMemo(() => {
    if (!quote?.converted_lines) return new Set<number>();
    return new Set(
      quote.converted_lines
        .filter((cl) => cl.order_id !== null)
        .map((cl) => cl.line_index)
    );
  }, [quote]);

  // Determine which lines are eligible (unconverted and discount < qty * rate)
  const eligibleIndices = useMemo(() => {
    if (!quote?.items) return new Set<number>();
    const indices = new Set<number>();
    quote.items.forEach((item, idx) => {
      const isConverted = convertedIndices.has(idx);
      const isDiscountTooHigh = (item.discount || 0) >= item.qty * item.rate;
      if (!isConverted && !isDiscountTooHigh) {
        indices.add(idx);
      }
    });
    return indices;
  }, [quote, convertedIndices]);

  // Pre-select first eligible line when opened
  useEffect(() => {
    if (open && quote?.items) {
      const firstEligible = quote.items.findIndex(
        (_, idx) => eligibleIndices.has(idx)
      );
      setSelectedLine(firstEligible !== -1 ? firstEligible : null);
    } else {
      setSelectedLine(null);
    }
  }, [open, quote, eligibleIndices]);

  if (!quote) return null;

  const eligibleCount = eligibleIndices.size;

  const handleConfirm = () => {
    if (selectedLine === null || !eligibleIndices.has(selectedLine)) return;
    onSelectLine(selectedLine);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent fullScreenMobile className="sm:max-w-lg flex flex-col max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold text-[var(--foreground)] truncate">
                  {t("linePickerTitle")}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
                  {quote.quotation_number} · {quote.clientName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Line Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 min-h-0 bg-[var(--background)]">
          {quote.items.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--muted-foreground)] flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-amber-500/80" />
              <p>{t("linePickerAllConverted")}</p>
            </div>
          ) : (
            quote.items.map((item, index) => {
              const isConverted = convertedIndices.has(index);
              const isDiscountTooHigh = (item.discount || 0) >= item.qty * item.rate;
              const isDisabled = isConverted || isDiscountTooHigh;
              const isSelected = selectedLine === index;

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (!isDisabled) {
                      setSelectedLine(index);
                    }
                  }}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-left",
                    isDisabled
                      ? "opacity-50 cursor-not-allowed bg-[var(--muted)]/20 border-[var(--border)]"
                      : isSelected
                      ? "cursor-pointer bg-blue-500/10 border-blue-500/40 shadow-sm"
                      : "cursor-pointer bg-[var(--card)] hover:bg-[var(--muted)]/40 border-[var(--border)]"
                  )}
                >
                  {/* Left radio / status */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                        isDisabled
                          ? "border-[var(--muted-foreground)]/30 bg-[var(--muted)]/40"
                          : isSelected
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-[var(--border)] bg-transparent"
                      )}
                    >
                      {isSelected && !isDisabled && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[var(--muted-foreground)]">
                          #{index + 1}
                        </span>
                        <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--muted-foreground)]">
                        <span>
                          {item.qty} {item.unit || "pcs"} × {formatCurrency(item.rate)}
                        </span>
                        {item.gst_rate > 0 && (
                          <>
                            <span>·</span>
                            <span>GST {item.gst_rate}%</span>
                          </>
                        )}
                        {(item.discount || 0) > 0 && (
                          <>
                            <span>·</span>
                            <span>Disc: {formatCurrency(item.discount)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Amount and Badges */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="font-mono text-sm font-bold text-[var(--foreground)]">
                      {formatCurrency(item.line_total || item.qty * item.rate)}
                    </span>
                    {isConverted ? (
                      <IOSBadge color="gray" variant="tinted" size="small">
                        {t("alreadyConverted")}
                      </IOSBadge>
                    ) : isDiscountTooHigh ? (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium max-w-[130px] text-right leading-tight">
                        {t("linePickerDiscountTooHigh")}
                      </span>
                    ) : isSelected ? (
                      <span className="text-[10px] font-bold text-blue-500 flex items-center gap-0.5">
                        Selected <ChevronRight className="w-3 h-3" />
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--border)] bg-[var(--card)] flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-[var(--muted-foreground)]">
            {eligibleCount} {eligibleCount === 1 ? "line" : "lines"} eligible
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors"
            >
              Cancel
            </button>
            <IOSButton
              variant="filled"
              disabled={selectedLine === null || !eligibleIndices.has(selectedLine)}
              onClick={handleConfirm}
              className="text-xs h-8 px-4"
            >
              {t("linePickerConvertBtn")}
            </IOSButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
