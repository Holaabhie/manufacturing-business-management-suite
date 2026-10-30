import { UserPlus, Plus, ClipboardList, Building2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { staggerItem } from "@/styles/animations";
import {
  MonthYearFilter,
  type MonthYearFilterValue,
} from "@/components/ui/month-year-filter";
import type { TabKey } from "./types";

interface PurchasingToolbarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  orderSearch: string;
  onOrderSearchChange: (val: string) => void;
  vendorSearch: string;
  onVendorSearchChange: (val: string) => void;
  ordersCount: number;
  filteredOrdersCount: number;
  vendorsCount: number;
  filteredVendorsCount: number;
  monthYear: MonthYearFilterValue;
  onMonthYearChange: (val: MonthYearFilterValue) => void;
  earliestDate?: Date | null;
  onOpenVendorDialog: () => void;
  onOpenNewPO: () => void;
}

export function PurchasingToolbar({
  activeTab,
  onTabChange,
  orderSearch,
  onOrderSearchChange,
  vendorSearch,
  onVendorSearchChange,
  ordersCount,
  filteredOrdersCount,
  vendorsCount,
  filteredVendorsCount,
  monthYear,
  onMonthYearChange,
  earliestDate,
  onOpenVendorDialog,
  onOpenNewPO,
}: PurchasingToolbarProps) {
  const t = useTranslations("purchasing.page");

  return (
    <>
      {/* ── Header ── */}
      <motion.div
        variants={staggerItem}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-w-0"
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] sm:text-[28px] md:text-[34px] font-bold text-[var(--foreground)] leading-[1.2] md:leading-[41px] tracking-[0.37px] truncate">
            {t("title")}
          </h1>
          <p className="text-[15px] text-[var(--muted-foreground)] mt-1 leading-[20px] break-words">
            {t("subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full sm:flex sm:w-auto items-center">
          <IOSButton
            variant="gray"
            size="medium"
            onClick={onOpenVendorDialog}
            className="!h-12 !rounded-xl !px-3 !w-full sm:!w-auto justify-center whitespace-nowrap text-[13px] sm:text-sm font-semibold tracking-tight border border-[var(--border)] hover:bg-[var(--muted)]"
            icon={<UserPlus className="h-4 w-4 shrink-0" />}
          >
            {t("btnAddVendor")}
          </IOSButton>
          <IOSButton
            variant="filled"
            size="medium"
            onClick={onOpenNewPO}
            className="!h-12 !rounded-xl !px-3 !w-full sm:!w-auto justify-center whitespace-nowrap text-[13px] sm:text-sm font-semibold tracking-tight shadow-sm"
            icon={<Plus className="h-4 w-4 shrink-0" />}
          >
            {t("btnNewPurchase")}
          </IOSButton>
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div
        variants={staggerItem}
        className="flex items-center gap-1 p-1 rounded-[12px] bg-[var(--muted)] max-w-fit"
      >
        {(["orders", "vendors"] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              "px-4 py-2 rounded-[10px] text-[14px] font-medium transition-all duration-200 cursor-pointer",
              activeTab === tab
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            {tab === "orders" ? (
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> {t("tabOrders")}
                {ordersCount > 0 && (
                  <span className="text-[11px] bg-[var(--primary)] text-white px-1.5 py-0.5 rounded-full font-bold">
                    {ordersCount}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> {t("tabVendors")}
                {vendorsCount > 0 && (
                  <span className="text-[11px] bg-[var(--accent)] text-[var(--muted-foreground)] px-1.5 py-0.5 rounded-full font-bold">
                    {vendorsCount}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* ── Search Bar & Month/Year Filter ── */}
      <motion.div
        variants={staggerItem}
        className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 w-full min-w-0"
      >
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-[var(--muted-foreground)]" />
            <input
              placeholder={
                activeTab === "orders"
                  ? t("searchOrdersPlaceholder")
                  : t("searchVendorsPlaceholder")
              }
              className="w-full h-[36px] rounded-[10px] bg-[var(--muted)] pl-[34px] pr-4 text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none border-none focus:ring-1 focus:ring-[var(--primary)] transition-shadow"
              value={activeTab === "orders" ? orderSearch : vendorSearch}
              onChange={(e) =>
                activeTab === "orders"
                  ? onOrderSearchChange(e.target.value)
                  : onVendorSearchChange(e.target.value)
              }
            />
          </div>
          <span className="text-[13px] text-[var(--muted-foreground)] shrink-0">
            {activeTab === "orders"
              ? t("ordersCount", { count: filteredOrdersCount })
              : t("vendorsCount", { count: filteredVendorsCount })}
          </span>
        </div>

        {activeTab === "orders" && (
          <div className="w-full md:w-auto min-w-0 md:max-w-xl">
            <MonthYearFilter
              earliestDate={earliestDate}
              value={monthYear}
              onChange={onMonthYearChange}
            />
          </div>
        )}
      </motion.div>
    </>
  );
}
