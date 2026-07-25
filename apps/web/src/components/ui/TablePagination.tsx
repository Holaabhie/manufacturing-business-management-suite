"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  showingText,
  hideShowingText = false,
  className,
}: TablePaginationProps) {
  // Don't render if there's only 1 page or no items
  if (totalPages <= 1 && totalItems <= pageSize) return null;

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  // ── Generate page numbers with ellipsis ──
  const pageNumbers = useMemo(() => {
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
  }, [currentPage, totalPages]);

  // ── Shared button class ──
  const pageButtonBase = cn(
    "h-9 w-9 rounded-[10px] text-[13px] font-medium",
    "flex items-center justify-center",
    "transition-all duration-150",
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
      {/* Showing text — hidden on mobile */}
      {!hideShowingText && (
        <p className="hidden sm:block text-[13px] text-[var(--muted-foreground)] tabular-nums">
          {showingText ||
            `Showing ${startItem}–${endItem} of ${totalItems} results`}
        </p>
      )}

      {/* ── Desktop pagination ── */}
      <nav
        className="hidden sm:flex items-center gap-1"
        role="navigation"
        aria-label="Pagination"
      >
        {/* Previous */}
        <button
          type="button"
          onClick={() => !isFirstPage && onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          aria-label="Go to previous page"
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
              aria-label={`Go to page ${page}`}
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
          aria-label="Go to next page"
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
      <nav
        className="flex sm:hidden items-center justify-center gap-3 w-full"
        role="navigation"
        aria-label="Pagination"
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
            "transition-all duration-150 cursor-pointer",
            isFirstPage && "opacity-40 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
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
            "transition-all duration-150 cursor-pointer",
            isLastPage && "opacity-40 cursor-not-allowed"
          )}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </nav>
    </div>
  );
}
