"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MonthYearFilterValue {
  year: number;
  month: number | "all"; // 1-based index: 1 = Jan, 12 = Dec, or 'all'
}

export interface MonthYearFilterProps {
  earliestDate?: Date | string | number | null;
  value: MonthYearFilterValue;
  onChange: (value: MonthYearFilterValue) => void;
  className?: string;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Robust helper function to test if a record's date matches the active MonthYearFilter.
 * Safe against ISO strings, "YYYY-MM-DD", Date objects, and timestamps.
 */
export function matchesMonthYear(
  dateVal: string | Date | number | null | undefined,
  filter: MonthYearFilterValue
): boolean {
  if (!dateVal) return false;

  // Handle "YYYY-MM-DD" or ISO strings by direct numeric substring parsing to avoid TZ shifts
  if (typeof dateVal === "string" && /^\d{4}-\d{2}/.test(dateVal)) {
    const parts = dateVal.slice(0, 7).split("-").map(Number);
    const recYear = parts[0];
    const recMonth = parts[1]; // 1-12

    if (recYear !== filter.year) return false;
    if (filter.month === "all") return true;
    return recMonth === filter.month;
  }

  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return false;

  const recYear = d.getFullYear();
  if (recYear !== filter.year) return false;

  if (filter.month === "all") return true;
  const recMonth = d.getMonth() + 1; // 1-12
  return recMonth === filter.month;
}

export function MonthYearFilter({
  earliestDate,
  value,
  onChange,
  className,
}: MonthYearFilterProps) {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Resolve and sanitize earliest date
  const { startYear, startMonth } = useMemo(() => {
    let earliest = earliestDate ? new Date(earliestDate) : now;
    if (isNaN(earliest.getTime())) {
      earliest = now;
    }
    if (earliest > now) {
      earliest = now;
    }
    return {
      startYear: earliest.getFullYear(),
      startMonth: earliest.getMonth() + 1,
    };
  }, [earliestDate, now]);

  // Year list from currentYear down to startYear (or startYear up to currentYear)
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= startYear; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear, startYear]);

  // Valid months within selected year
  const monthItems = useMemo(() => {
    const items: Array<{ value: number | "all"; label: string }> = [
      { value: "all", label: "All" },
    ];

    const minMonth = value.year === startYear ? startMonth : 1;
    const maxMonth = value.year === currentYear ? currentMonth : 12;

    for (let m = minMonth; m <= maxMonth; m++) {
      items.push({
        value: m,
        label: MONTH_NAMES[m - 1],
      });
    }

    return items;
  }, [value.year, startYear, startMonth, currentYear, currentMonth]);

  const handleYearChange = (yearStr: string) => {
    const newYear = parseInt(yearStr, 10);
    if (isNaN(newYear)) return;

    // Check if the current month is valid for the newly selected year
    const minMonth = newYear === startYear ? startMonth : 1;
    const maxMonth = newYear === currentYear ? currentMonth : 12;

    let newMonth = value.month;
    if (newMonth !== "all") {
      if (newMonth < minMonth || newMonth > maxMonth) {
        newMonth = "all";
      }
    }

    onChange({ year: newYear, month: newMonth });
  };

  return (
    <div
      className={cn(
        "flex flex-wrap sm:flex-nowrap items-center gap-2 w-full min-w-0",
        className
      )}
    >
      {/* Year Dropdown */}
      <div className="shrink-0">
        <Select value={String(value.year)} onValueChange={handleYearChange}>
          <SelectTrigger className="h-8 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/70 dark:bg-[#161B27]/80 backdrop-blur border border-black/[0.06] dark:border-white/[0.06] text-[var(--foreground)] w-[84px] sm:w-[92px] shadow-sm">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)} className="text-xs font-medium">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Month Pills Container */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/70 dark:bg-[#161B27]/80 backdrop-blur border border-black/[0.06] dark:border-white/[0.06] overflow-x-auto scrollbar-hide py-1 px-1.5 min-w-0">
          {monthItems.map((item) => {
            const isActive = value.month === item.value;
            return (
              <button
                key={String(item.value)}
                type="button"
                onClick={() => onChange({ year: value.year, month: item.value })}
                className={cn(
                  "h-8 px-3 rounded-full text-xs font-medium transition-all duration-200 shrink-0 cursor-pointer flex items-center justify-center active:scale-[0.97]",
                  isActive
                    ? "bg-[var(--primary)] text-white shadow-sm font-semibold"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-[var(--foreground)]"
                )}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
