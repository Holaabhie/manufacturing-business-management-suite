"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────

interface TablePaginationProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items after filtering */
  totalItems: number;
  /** Items per page */
  pageSize: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Optional callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Available page size options. Default: [25, 50, 100] */
  pageSizeOptions?: number[];
  /** Optional "Showing X–Y of Z results" text override */
  showingText?: string;
  /** Hide the "Showing X–Y of Z" label */
  hideShowingText?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─── Component ───────────────────────────────────────────

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  showingText,
  hideShowingText = false,
  className,
}: TablePaginationProps) {
  const t = useTranslations("common");

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  // ── Generate page numbers with ellipsis ──
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1 && totalItems <= pageSize) return [];
    const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];
    const SIBLINGS = 1; // Number of pages to show around current

    if (totalPages <= 7) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);

      const leftBound = Math.max(2, currentPage - SIBLINGS);
      const rightBound = Math.min(totalPages - 1, currentPage + SIBLINGS);

      // Left ellipsis
      if (leftBound > 2) {
        pages.push("ellipsis-start");
      }

      // Pages around current
      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }

      // Right ellipsis
      if (rightBound < totalPages - 1) {
        pages.push("ellipsis-end");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages, totalItems, pageSize]);

  // Don't render if there's only 1 page or no items
  if (totalPages <= 1 && totalItems <= pageSize) return null;

  // ── Shared button class ──
  const pageButtonBase = cn(
    "h-9 w-9 rounded-[10px] text-[13px] font-medium",
    "flex items-center justify-center",
    "transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95",
    "border",
    "cursor-pointer",
    "select-none"
  );

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 pt-4",
        className
      )}
    >
      {/* Showing text & Page Size Selector */}
      <div className="hidden sm:flex items-center gap-3">
        {!hideShowingText && (
          <p className="text-[13px] text-[var(--muted-foreground)] tabular-nums">
            {showingText ||
              t("showingResults", { start: startItem, end: endItem, total: totalItems })}
          </p>
        )}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
            <span>Rows:</span>
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 px-2 py-0 rounded-[8px] bg-[rgba(255,255,255,0.72)] dark:bg-[rgba(255,255,255,0.06)] border border-[rgba(15,23,42,0.08)] dark:border-[rgba(255,255,255,0.08)] text-[var(--foreground)] text-[12px] font-medium outline-none cursor-pointer focus:border-[#2563EB]"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Desktop pagination ── */}
      <nav
        className="hidden sm:flex items-center gap-1"
        role="navigation"
        aria-label={t("pagination")}
      >
        {/* Previous */}
        <button
          type="button"
          onClick={() => !isFirstPage && onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          aria-label={t("goToPreviousPage")}
          className={cn(
            pageButtonBase,
            "bg-[rgba(255,255,255,0.72)] dark:bg-[rgba(255,255,255,0.06)]",
            "border-[rgba(15,23,42,0.08)] dark:border-[rgba(255,255,255,0.08)]",
            isFirstPage && "opacity-40 cursor-not-allowed",
            !isFirstPage &&
              "hover:bg-[rgba(37,99,235,0.08)] hover:text-[#2563EB] hover:border-[rgba(37,99,235,0.15)]"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, idx) => {
          if (page === "ellipsis-start" || page === "ellipsis-end") {
            return (
              <span
                key={page}
                className="h-9 w-9 flex items-center justify-center text-[13px] text-[var(--muted-foreground)] select-none"
                aria-hidden="true"
              >
                ···
              </span>
            );
          }

          const isActive = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              aria-current={isActive ? "page" : undefined}
              aria-label={t("goToPage", { page })}
              className={cn(
                pageButtonBase,
                isActive
                  ? "bg-[#2563EB] text-white border-[#2563EB] shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
                  : cn(
                      "bg-[rgba(255,255,255,0.72)] dark:bg-[rgba(255,255,255,0.06)]",
                      "border-[rgba(15,23,42,0.08)] dark:border-[rgba(255,255,255,0.08)]",
                      "text-[var(--foreground)]",
                      "hover:bg-[rgba(37,99,235,0.08)] hover:text-[#2563EB] hover:border-[rgba(37,99,235,0.15)]"
                    )
              )}
            >
              {page}
            </button>
          );
        })}

        {/* Next */}
        <button
          type="button"
          onClick={() => !isLastPage && onPageChange(currentPage + 1)}
          disabled={isLastPage}
          aria-label={t("goToNextPage")}
          className={cn(
            pageButtonBase,
            "bg-[rgba(255,255,255,0.72)] dark:bg-[rgba(255,255,255,0.06)]",
            "border-[rgba(15,23,42,0.08)] dark:border-[rgba(255,255,255,0.08)]",
            isLastPage && "opacity-40 cursor-not-allowed",
            !isLastPage &&
              "hover:bg-[rgba(37,99,235,0.08)] hover:text-[#2563EB] hover:border-[rgba(37,99,235,0.15)]"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>

      {/* ── Mobile pagination ── */}
      <div className="flex sm:hidden flex-col items-center gap-2 w-full">
        <nav
          className="flex items-center justify-between w-full"
          role="navigation"
          aria-label={t("pagination")}
        >
          <button
            type="button"
            onClick={() => !isFirstPage && onPageChange(currentPage - 1)}
            disabled={isFirstPage}
            className={cn(
              "h-9 px-3 rounded-[10px] text-[13px] font-medium",
              "flex items-center gap-1",
              "bg-[rgba(255,255,255,0.72)] dark:bg-[rgba(255,255,255,0.06)]",
              "border border-[rgba(15,23,42,0.08)] dark:border-[rgba(255,255,255,0.08)]",
              "transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95 cursor-pointer",
              isFirstPage && "opacity-40 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("prev")}
          </button>

          <span className="text-[13px] font-semibold text-[var(--foreground)] tabular-nums">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => !isLastPage && onPageChange(currentPage + 1)}
            disabled={isLastPage}
            className={cn(
              "h-9 px-3 rounded-[10px] text-[13px] font-medium",
              "flex items-center gap-1",
              "bg-[rgba(255,255,255,0.72)] dark:bg-[rgba(255,255,255,0.06)]",
              "border border-[rgba(15,23,42,0.08)] dark:border-[rgba(255,255,255,0.08)]",
              "transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95 cursor-pointer",
              isLastPage && "opacity-40 cursor-not-allowed"
            )}
          >
            {t("next")}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </nav>
        {onPageSizeChange && (
          <div className="flex items-center justify-between w-full text-[12px] text-[var(--muted-foreground)] px-1">
            <span>
              {showingText || t("showingResults", { start: startItem, end: endItem, total: totalItems })}
            </span>
            <div className="flex items-center gap-1.5">
              <span>Rows:</span>
              <select
                aria-label="Rows per page (mobile)"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-7 px-1.5 py-0 rounded-[6px] bg-[rgba(255,255,255,0.72)] dark:bg-[rgba(255,255,255,0.06)] border border-[rgba(15,23,42,0.08)] dark:border-[rgba(255,255,255,0.08)] text-[var(--foreground)] text-[12px] font-medium outline-none cursor-pointer"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
