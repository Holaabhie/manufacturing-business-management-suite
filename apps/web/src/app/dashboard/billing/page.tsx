"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { AccessDenied } from "@/components/AccessDenied";
import { TruncatedDataBanner } from "@/components/ui/TruncatedDataBanner";
import { CollapsingTitle } from "@/components/ui/CollapsingTitle";
import { useCollapseProgress } from "@/hooks/useCollapseProgress";
import { useTenantCreationDate } from "@/hooks/useTenantCreationDate";
import { useAppLocale } from "@/components/LocaleProvider";
import CreateInvoiceModal from "@/components/billing/CreateInvoiceModal";
import { useBillingData } from "@/components/billing/useBillingData";
import { useBillingActions } from "@/components/billing/useBillingActions";
import { BillingStatsCards } from "@/components/billing/BillingStatsCards";
import { BillingToolbar } from "@/components/billing/BillingToolbar";
import { BillingTable } from "@/components/billing/BillingTable";
import { BillingMobileCards } from "@/components/billing/BillingMobileCards";
import { InvoicePreviewModal } from "@/components/billing/InvoicePreviewModal";
import { DeleteInvoiceDialog } from "@/components/billing/DeleteInvoiceDialog";

export default function BillingPage() {
  const t = useTranslations("billing");
  const tCommon = useTranslations("common");
  const { locale } = useAppLocale();
  const dateLocale =
    locale === "hi"
      ? "hi-IN"
      : locale === "gu"
        ? "gu-IN"
        : locale === "mr"
          ? "mr-IN"
          : "en-IN";
  const { progress: collapseProgress } = useCollapseProgress();
  const { earliestDate } = useTenantCreationDate();
  const [mounted, setMounted] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    bills,
    filteredBills,
    clients,
    orders,
    loading,
    isTruncated,
    searchTerm,
    setSearchTerm,
    monthYear,
    setMonthYear,
    userRole,
    roleLoading,
    canViewInvoices,
    companyInfo,
    companyLoading,
    stats,
    fetchData,
  } = useBillingData();

  const {
    selectedBill,
    setSelectedBill,
    isPreviewOpen,
    setIsPreviewOpen,
    billToDelete,
    setBillToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    pdfGenerating,
    longPressedBill,
    isBillSheetOpen,
    longPressTriggered,
    handleBillLongPressStart,
    handleBillLongPressMove,
    handleBillLongPressEnd,
    closeBillSheet,
    handleWhatsAppShare,
    updateStatus,
    handleDelete,
    generatePDF,
  } = useBillingActions({
    companyInfo,
    dateLocale,
    onRefresh: fetchData,
  });

  // Prevent hydration mismatch by showing loading during SSR
  if (!mounted) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FileText className="h-8 w-8 text-emerald-600" />
              {t("title")}
            </h1>
            <p className="text-zinc-500 mt-1">{t("ssrSubtitle")}</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  // Access denied if user cannot view invoices (e.g. Staff preset without override)
  if (!roleLoading && !canViewInvoices) {
    return (
      <AccessDenied
        title={tCommon("billingAccessRestricted")}
        description={tCommon("billingAccessRestrictedDesc")}
      />
    );
  }

  return (
    <div className="space-y-8 bg-[var(--background)] p-6 rounded-3xl overflow-x-hidden">
      <CollapsingTitle
        title={t("title")}
        subtitle={t("subtitleStats", {
          total: bills.length,
          totalLakhs: (stats.totalValue / 100000).toFixed(1),
          paid: stats.paid,
        })}
        subtitleLoading={loading}
        collapseProgress={collapseProgress}
      />

      <TruncatedDataBanner
        truncated={isTruncated}
        count={bills.length}
        entityName="invoices"
      />

      <BillingToolbar
        companyInfo={companyInfo}
        companyLoading={companyLoading}
        filteredBills={filteredBills}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        monthYear={monthYear}
        onMonthYearChange={setMonthYear}
        earliestDate={earliestDate}
        onOpenCreateDialog={() => setIsCreateDialogOpen(true)}
      />

      <BillingStatsCards stats={stats} dateLocale={dateLocale} />

      <BillingTable
        bills={filteredBills}
        loading={loading}
        dateLocale={dateLocale}
        onPreview={(bill) => {
          setSelectedBill(bill);
          setIsPreviewOpen(true);
        }}
        onDownloadPdf={(bill) => generatePDF(bill, "download")}
        onPrint={(bill) => generatePDF(bill, "print")}
        onWhatsAppShare={handleWhatsAppShare}
        onUpdateStatus={updateStatus}
        onOpenDelete={(id) => {
          setBillToDelete(id);
          setIsDeleteDialogOpen(true);
        }}
        onRefresh={fetchData}
      />

      <BillingMobileCards
        bills={filteredBills}
        loading={loading}
        dateLocale={dateLocale}
        onPreview={(bill) => {
          setSelectedBill(bill);
          setIsPreviewOpen(true);
        }}
        onDownloadPdf={(bill) => generatePDF(bill, "download")}
        onPrint={(bill) => generatePDF(bill, "print")}
        onWhatsAppShare={handleWhatsAppShare}
        onUpdateStatus={updateStatus}
        onOpenDelete={(id) => {
          setBillToDelete(id);
          setIsDeleteDialogOpen(true);
        }}
        longPressedBill={longPressedBill}
        isBillSheetOpen={isBillSheetOpen}
        onCloseBillSheet={closeBillSheet}
        longPressTriggeredRef={longPressTriggered}
        onLongPressStart={handleBillLongPressStart}
        onLongPressMove={handleBillLongPressMove}
        onLongPressEnd={handleBillLongPressEnd}
      />

      <CreateInvoiceModal
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={fetchData}
        clients={clients}
        orders={orders}
        companyInfo={companyInfo}
      />

      <InvoicePreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        bill={selectedBill}
        companyInfo={companyInfo}
        pdfGenerating={pdfGenerating}
        dateLocale={dateLocale}
        onGeneratePdf={generatePDF}
        onRefresh={fetchData}
      />

      <DeleteInvoiceDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        billId={billToDelete}
        onConfirmDelete={handleDelete}
      />
    </div>
  );
}
