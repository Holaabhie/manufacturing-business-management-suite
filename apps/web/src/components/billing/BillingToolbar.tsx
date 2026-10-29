"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Download, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { IOSButton, IOSSearchBar } from "@/components/ui/ios";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MonthYearFilter, type MonthYearFilterValue } from "@/components/ui/month-year-filter";
import { exportToTally } from "@/lib/tallyExport";
import type { Bill, CompanyInfo } from "./types";

interface BillingToolbarProps {
  companyInfo: CompanyInfo | null;
  companyLoading: boolean;
  filteredBills: Bill[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  monthYear: MonthYearFilterValue;
  onMonthYearChange: (value: MonthYearFilterValue) => void;
  earliestDate: Date | null;
  onOpenCreateDialog: () => void;
}

export function BillingToolbar({
  companyInfo,
  companyLoading,
  filteredBills,
  searchTerm,
  onSearchChange,
  monthYear,
  onMonthYearChange,
  earliestDate,
  onOpenCreateDialog,
}: BillingToolbarProps) {
  const t = useTranslations("billing");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Company Details Warning */}
        {!companyLoading && !companyInfo?.companyName && (
          <Alert
            variant="default"
            className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              {t("companyWarningTitle")}
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {t("companyWarningDesc")}
              <Link
                href="/dashboard/settings/company-info"
                className="ml-1 underline font-medium hover:text-amber-900"
              >
                {t("companyWarningLink")}
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <IOSButton
            variant="filled"
            onClick={() => {
              if (filteredBills.length === 0) {
                toast.error(t("toasts.noInvoicesToExport"));
                return;
              }
              exportToTally(filteredBills);
              toast.success(t("toasts.tallyExportGenerated"));
            }}
            style={{ backgroundColor: "#16a34a", borderColor: "#15803d" }}
            className="shadow-sm hover:opacity-90"
          >
            <Download className="min-w-4 h-4 w-4 mr-1.5" />
            {t("btnTallyExport")}
          </IOSButton>

          <IOSButton variant="filled" onClick={onOpenCreateDialog}>
            <Plus className="min-w-4 h-5 w-5 mr-1.5" />
            {t("btnCreateInvoice")}
          </IOSButton>
        </div>
      </div>

      {/* Search & Month/Year Filter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <IOSSearchBar
          value={searchTerm}
          onValueChange={onSearchChange}
          placeholder={t("searchPlaceholder")}
          className="w-full md:max-w-xs shrink-0"
        />
        <div className="w-full md:w-auto min-w-0 md:max-w-xl">
          <MonthYearFilter
            earliestDate={earliestDate}
            value={monthYear}
            onChange={onMonthYearChange}
          />
        </div>
      </div>
    </div>
  );
}

