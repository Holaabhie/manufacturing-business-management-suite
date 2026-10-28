"use client";

import React from "react";
import { Search, Plus, Download, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface OrdersToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
  onAddNewOrder: () => void;
  onExportExcel: () => void;
  totalFiltered: number;
  isStaff: boolean;
}

export function OrdersToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAddNewOrder,
  onExportExcel,
  totalFiltered,
  isStaff,
}: OrdersToolbarProps) {
  const t = useTranslations("orders");

  return (
    <div
      className={cn(
        "md:sticky md:top-[56px] md:z-30 shrink-0 pb-4 -mx-1 px-1 mb-2",
        "md:bg-[rgba(243,245,249,0.88)] md:backdrop-blur-xl md:dark:bg-[rgba(8,12,24,0.82)]",
        "border-b border-[rgba(15,23,42,0.06)] dark:border-[rgba(255,255,255,0.06)]"
      )}
    >
      <div className="space-y-3">
        {/* ROW 1 -- Search + Primary Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] dark:text-[rgba(148,163,184,0.7)] pointer-events-none"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("searchPlaceholder")}
              id="orders-search"
              className={cn(
                "w-full h-10 pl-10 pr-10 rounded-[12px] text-[14px] transition-all duration-200",
                "bg-[rgba(255,255,255,0.72)] border border-[rgba(15,23,42,0.08)]",
                "text-foreground placeholder:text-[#94A3B8]",
                "shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
                "dark:bg-[rgba(15,23,42,0.50)] dark:border-[rgba(148,163,184,0.12)]",
                "dark:text-[#E2E8F0] dark:placeholder:text-[rgba(148,163,184,0.50)]",
                "dark:shadow-[0_2px_8px_rgba(0,0,0,0.15)]",
                "focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[rgba(37,99,235,0.30)]",
                "dark:focus:border-[rgba(96,165,250,0.50)] dark:focus:ring-1 dark:focus:ring-[rgba(96,165,250,0.25)]",
                "caret-primary"
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-150 cursor-pointer"
                aria-label={t("clearSearch")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          {!isStaff && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onAddNewOrder}
                className="flex items-center gap-2 h-10 px-4 rounded-[12px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.35)] transition-all duration-200 active:scale-[0.98] cursor-pointer"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">{t("addOrder")}</span>
                <span className="sm:hidden">{t("add")}</span>
              </button>

              <button
                type="button"
                onClick={onExportExcel}
                className={cn(
                  "flex items-center gap-2 h-10 px-3.5 rounded-[12px] text-[13px] font-medium transition-all duration-200 active:scale-[0.98] cursor-pointer",
                  "bg-[rgba(255,255,255,0.72)] hover:bg-[rgba(255,255,255,0.95)] border border-[rgba(15,23,42,0.08)] hover:border-[rgba(15,23,42,0.14)]",
                  "text-[#64748B] hover:text-[#0F172A] shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
                  "dark:bg-[rgba(15,23,42,0.50)] dark:hover:bg-[rgba(30,41,59,0.70)]",
                  "dark:border-[rgba(148,163,184,0.12)] dark:hover:border-[rgba(148,163,184,0.20)]",
                  "dark:text-[#94A3B8] dark:hover:text-[#E2E8F0] dark:shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                )}
              >
                <Download size={14} />
                <span className="hidden md:inline">{t("export")}</span>
              </button>
            </div>
          )}
        </div>

        {/* ROW 2 -- Filter Pills + Result Count */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: null, label: t("filterAll") },
              { key: "pending", label: t("filterPending") },
              { key: "processing", label: t("filterProcessing") },
              { key: "active", label: t("filterActive") },
              { key: "completed", label: t("filterCompleted") },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onStatusFilterChange(item.key)}
                className={cn(
                  "h-8 px-3.5 rounded-[10px] text-[12.5px] font-medium border transition-all duration-150 cursor-pointer",
                  statusFilter === item.key
                    ? "bg-[#2563EB] text-white border-transparent shadow-sm shadow-[rgba(37,99,235,0.25)]"
                    : cn(
                        "bg-[rgba(255,255,255,0.60)] hover:bg-[rgba(255,255,255,0.90)] text-[#64748B] hover:text-[#0F172A]",
                        "border-[rgba(15,23,42,0.08)] hover:border-[rgba(15,23,42,0.14)]",
                        "dark:bg-[rgba(15,23,42,0.50)] dark:hover:bg-[rgba(30,41,59,0.70)]",
                        "dark:text-[#94A3B8] dark:hover:text-[#E2E8F0]",
                        "dark:border-[rgba(148,163,184,0.12)] dark:hover:border-[rgba(148,163,184,0.20)]"
                      )
                )}
              >
                {item.label}
              </button>
            ))}

            {(searchQuery || statusFilter) && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  onStatusFilterChange(null);
                }}
                className={cn(
                  "h-8 px-3 rounded-[10px] text-[12.5px] font-medium transition-all duration-150 cursor-pointer",
                  "text-muted-foreground/70 hover:text-muted-foreground border border-dashed",
                  "border-[rgba(15,23,42,0.12)] hover:border-[rgba(15,23,42,0.20)]",
                  "dark:border-[rgba(148,163,184,0.15)] dark:hover:border-[rgba(148,163,184,0.25)]",
                  "bg-transparent hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[rgba(30,41,59,0.50)]"
                )}
              >
                {t("clear")}
              </button>
            )}
          </div>

          <div className="text-[12px] text-muted-foreground self-end sm:self-auto tabular-nums">
            {totalFiltered} {totalFiltered === 1 ? t("table.orderSingle") : t("table.ordersPlural")}
          </div>
        </div>
      </div>
    </div>
  );
}
