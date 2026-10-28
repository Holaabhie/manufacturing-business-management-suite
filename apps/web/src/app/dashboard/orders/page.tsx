"use client";

import React, { useState, useMemo, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CollapsingTitle } from "@/components/ui/CollapsingTitle";
import { useCollapseProgress } from "@/hooks/useCollapseProgress";
import { useRole } from "@/lib/hooks/use-role";
import { useAppLocale } from "@/components/LocaleProvider";
import { useOrders, useDeleteOrder, type OrderItem } from "@/lib/hooks/use-orders";

// Modular components & hooks
import { useOrderFilters } from "@/components/orders/useOrderFilters";
import { useOrderModals } from "@/components/orders/useOrderModals";
import { useOrderCompletion } from "@/components/orders/useOrderCompletion";
import { useOrderExport } from "@/components/orders/useOrderExport";
import {
  computeOrderStats,
  groupOrdersByMonth,
  deriveOrderStatusFromOrder,
} from "@/components/orders/order-utils";
import { OrdersKpiPanel } from "@/components/orders/OrdersKpiPanel";
import { OrdersToolbar } from "@/components/orders/OrdersToolbar";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrdersMobileList } from "@/components/orders/OrdersMobileList";
import { OrdersSkeleton } from "@/components/orders/OrdersSkeleton";
import { OrdersModalsContainer } from "@/components/orders/OrdersModalsContainer";

function OrdersContent() {
  const t = useTranslations("orders");
  const { progress: collapseProgress } = useCollapseProgress();
  const router = useRouter();
  const { role, isAdmin, isStaff } = useRole();
  const canRecordPayment = isAdmin || (role as string | null) !== "Staff";
  const { locale } = useAppLocale();
  const dateLocale =
    locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";

  // URL-synced search, filter, and pagination
  const {
    currentPage,
    pageSize,
    searchQuery,
    debouncedQuery,
    statusFilter,
    handleSearch,
    handleStatusFilter,
    handlePageChange,
    handlePageSizeChange,
  } = useOrderFilters();

  // Unified modals state (useReducer)
  const {
    state: modals,
    openPayment,
    closePayment,
    openDelete,
    closeDelete,
    openCompletion,
    closeCompletion,
    openActionSheet,
    closeActionSheet,
    openStaffDetail,
    closeStaffDetail,
  } = useOrderModals();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Completion & Invoicing Hook
  const {
    updatingOrderId,
    isGeneratingInvoice,
    generatedInvoice,
    setGeneratedInvoice,
    invoiceEditData,
    setInvoiceEditData,
    isInvoicePreviewOpen,
    setIsInvoicePreviewOpen,
    handleCompleteOnly,
    handleCompleteAndInvoice,
  } = useOrderCompletion({
    completionOrder: modals.completionOrder,
    closeCompletion,
    showToast,
    invoiceGeneratedText: t("toasts.invoiceGenerated"),
    failedInvoiceText: t("toasts.failedInvoice"),
  });

  // Orders Query
  const { data: ordersResponse, isLoading: ordersLoading } = useOrders({
    page: currentPage,
    limit: pageSize,
    q: debouncedQuery ? debouncedQuery.slice(0, 100) : undefined,
  });

  const orders: OrderItem[] = ordersResponse?.data ?? (Array.isArray(ordersResponse) ? ordersResponse : []);
  const pagination = ordersResponse?.pagination;
  const totalOrders = pagination?.total ?? (ordersResponse?.total ?? orders.length);
  const totalPages = pagination?.totalPages ?? 1;

  // Dynamic PDF and Excel export handlers
  const { handleDownloadInvoice, handleExportExcel } = useOrderExport({
    orders,
    pdfFailedText: t("toasts.pdfFailed"),
    excelDownloadedText: t("toasts.excelDownloaded"),
    excelFailedText: t("toasts.excelFailed"),
  });

  // Delete Mutation
  const deleteOrder = useDeleteOrder();

  // Filtered orders & stats
  const searchFilteredOrders = useMemo(() => {
    if (!statusFilter || statusFilter === "ALL") return orders;
    return orders.filter(
      (order) => deriveOrderStatusFromOrder(order).toLowerCase() === statusFilter.toLowerCase()
    );
  }, [orders, statusFilter]);

  const orderStats = useMemo(() => computeOrderStats(orders), [orders]);
  const monthGroupedOrders = useMemo(
    () => groupOrdersByMonth(searchFilteredOrders, dateLocale),
    [searchFilteredOrders, dateLocale]
  );

  const handleAddNewOrder = useCallback(() => {
    router.push("/dashboard/orders/create");
  }, [router]);

  const handleEditOrder = useCallback(
    (order: OrderItem) => {
      router.push(`/dashboard/orders/${order.id}/edit`);
    },
    [router]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!modals.deleteOrderId) return;
    deleteOrder.mutate(modals.deleteOrderId, {
      onSettled: () => closeDelete(),
    });
  }, [modals.deleteOrderId, deleteOrder, closeDelete]);

  const orderToDelete = useMemo(
    () => orders.find((o) => o.id === modals.deleteOrderId),
    [orders, modals.deleteOrderId]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 w-full min-w-0 overflow-x-hidden"
    >
      <CollapsingTitle
        title={t("title")}
        subtitle={t("subtitle")}
        collapseProgress={collapseProgress}
      />

      <OrdersKpiPanel stats={orderStats} />

      <OrdersToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilter}
        onAddNewOrder={handleAddNewOrder}
        onExportExcel={handleExportExcel}
        totalFiltered={searchFilteredOrders.length}
        isStaff={isStaff}
      />

      <OrdersTable
        orders={searchFilteredOrders}
        monthGroupedOrders={monthGroupedOrders}
        ordersLoading={ordersLoading}
        searchQuery={debouncedQuery}
        isStaff={isStaff}
        isAdmin={isAdmin}
        canRecordPayment={canRecordPayment}
        updatingOrderId={updatingOrderId}
        onAddNewOrder={handleAddNewOrder}
        onEditOrder={handleEditOrder}
        onRecordPayment={openPayment}
        onDeleteOrder={openDelete}
        onDownloadInvoice={handleDownloadInvoice}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalOrders}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <OrdersMobileList
        orders={searchFilteredOrders}
        monthGroupedOrders={monthGroupedOrders}
        ordersLoading={ordersLoading}
        isStaff={isStaff}
        dateLocale={dateLocale}
        onSelectOrder={isStaff ? openStaffDetail : handleEditOrder}
        onLongPressOrder={openActionSheet}
        isActionSheetOpen={modals.isActionSheetOpen}
      />

      <OrdersModalsContainer
        modals={modals}
        isAdmin={isAdmin}
        orderToDelete={orderToDelete}
        isDeleting={deleteOrder.isPending}
        isGeneratingInvoice={isGeneratingInvoice}
        generatedInvoice={generatedInvoice}
        invoiceEditData={invoiceEditData}
        isInvoicePreviewOpen={isInvoicePreviewOpen}
        toastMessage={toastMessage}
        closePayment={closePayment}
        closeActionSheet={closeActionSheet}
        closeCompletion={closeCompletion}
        closeDelete={closeDelete}
        closeStaffDetail={closeStaffDetail}
        handleEditOrder={handleEditOrder}
        handleDownloadInvoice={handleDownloadInvoice}
        openDelete={openDelete}
        handleDeleteConfirm={handleDeleteConfirm}
        handleCompleteOnly={handleCompleteOnly}
        handleCompleteAndInvoice={handleCompleteAndInvoice}
        setInvoiceEditData={setInvoiceEditData}
        setIsInvoicePreviewOpen={setIsInvoicePreviewOpen}
        setGeneratedInvoice={setGeneratedInvoice}
        showToast={showToast}
      />
    </motion.div>
  );
}

export default function OrdersPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersContent />
      </Suspense>
    </ErrorBoundary>
  );
}
