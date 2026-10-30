"use client";

import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useAppLocale } from "@/components/LocaleProvider";
import { useRole } from "@/lib/hooks/use-role";
import { useTenantCreationDate } from "@/hooks/useTenantCreationDate";
import { staggerContainer } from "@/styles/animations";
import { ConfirmDeleteSheet } from "@/components/ui/ConfirmDeleteSheet";
import { RecordPaymentModal } from "@/components/purchasing/RecordPaymentModal";
import { VendorDetailDrawer } from "@/components/purchasing/VendorDetailDrawer";
import { usePurchasingData } from "@/components/purchasing/usePurchasingData";
import {
  usePurchasingActions,
  emptyVendorForm,
} from "@/components/purchasing/usePurchasingActions";
import { PurchasingStatsCards } from "@/components/purchasing/PurchasingStatsCards";
import { PurchasingToolbar } from "@/components/purchasing/PurchasingToolbar";
import { PurchasingOrdersTable } from "@/components/purchasing/PurchasingOrdersTable";
import { PurchasingVendorsTable } from "@/components/purchasing/PurchasingVendorsTable";
import { AddVendorModal } from "@/components/purchasing/AddVendorModal";
import { CreatePOModal } from "@/components/purchasing/CreatePOModal";
import { PODetailModal } from "@/components/purchasing/PODetailModal";

export default function PurchasingPage() {
  const tDelete = useTranslations("purchasing.deleteModal");
  const { locale } = useAppLocale();
  const dateLocale =
    locale === "hi"
      ? "hi-IN"
      : locale === "gu"
      ? "gu-IN"
      : locale === "mr"
      ? "mr-IN"
      : "en-IN";
  const { isAdmin } = useRole();
  const { earliestDate } = useTenantCreationDate();

  const data = usePurchasingData();
  const actions = usePurchasingActions({
    vendors: data.vendors,
    inventoryItems: data.inventoryItems,
    fetchOrders: data.fetchOrders,
    fetchVendors: data.fetchVendors,
    fetchInventory: data.fetchInventory,
    fetchStats: data.fetchStats,
  });

  // ─── Loading Skeleton ─────────────────────────────────────────
  if (!data.mounted) {
    return (
      <div className="space-y-6 w-full min-w-0 overflow-x-hidden">
        <div>
          <div className="h-[34px] w-[160px] rounded-[10px] bg-[var(--muted)] shimmer" />
          <div className="h-[20px] w-[280px] rounded-[8px] bg-[var(--muted)] shimmer mt-2" />
        </div>
        <div className="kpi-panel">
          <div className="kpi-panel__glow" />
          <div className="kpi-grid !grid-cols-1 md:!grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="kpi-card flex flex-col justify-center min-h-[140px]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="h-[48px] w-[48px] rounded-[14px] bg-[var(--muted)] shimmer" />
                  <div className="h-[24px] w-[50px] rounded-full bg-[var(--muted)] shimmer" />
                </div>
                <div className="h-[34px] w-[120px] rounded-[8px] bg-[var(--muted)] shimmer mb-2" />
                <div className="h-[16px] w-[90px] rounded-[6px] bg-[var(--muted)] shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6 w-full min-w-0 overflow-x-hidden"
    >
      {/* ── Toolbar & Header ── */}
      <PurchasingToolbar
        activeTab={data.activeTab}
        onTabChange={data.setActiveTab}
        orderSearch={data.orderSearch}
        onOrderSearchChange={data.setOrderSearch}
        vendorSearch={data.vendorSearch}
        onVendorSearchChange={data.setVendorSearch}
        ordersCount={data.orders.length}
        filteredOrdersCount={data.filteredOrders.length}
        vendorsCount={data.vendors.length}
        filteredVendorsCount={data.filteredVendors.length}
        monthYear={data.monthYear}
        onMonthYearChange={data.setMonthYear}
        earliestDate={earliestDate}
        onOpenVendorDialog={() => {
          actions.setVendorForm(emptyVendorForm);
          actions.setVendorErrors({});
          actions.setIsVendorDialogOpen(true);
        }}
        onOpenNewPO={actions.openNewPO}
      />

      {/* ── KPI Stats Cards ── */}
      <PurchasingStatsCards
        totalSpend={data.totalSpend}
        pendingCount={data.pendingCount}
        orderedCount={data.orderedCount}
        receivedCount={data.receivedCount}
      />

      {/* ── Tabs Content ── */}
      <AnimatePresence mode="wait">
        {data.activeTab === "orders" && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <PurchasingOrdersTable
              orders={data.filteredOrders}
              ordersLoading={data.ordersLoading}
              isAdmin={isAdmin}
              dateLocale={dateLocale}
              onOpenNewPO={actions.openNewPO}
              onViewDetails={(order) => {
                actions.setDetailOrder(order);
                actions.setIsDetailDialogOpen(true);
              }}
              onRecordPayment={(order) => {
                actions.setPaymentPO(order);
                actions.setIsPaymentModalOpen(true);
              }}
              onStatusChange={actions.handleStatusChange}
              onDeleteOrder={(order) => {
                actions.setDeleteTarget({ type: "order", id: order.id, name: order.poNumber });
                actions.setIsDeleteDialogOpen(true);
              }}
            />
          </motion.div>
        )}

        {data.activeTab === "vendors" && (
          <motion.div
            key="vendors"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <PurchasingVendorsTable
              vendors={data.filteredVendors}
              vendorsLoading={data.vendorsLoading}
              isAdmin={isAdmin}
              onOpenVendorDialog={() => {
                actions.setVendorForm(emptyVendorForm);
                actions.setIsVendorDialogOpen(true);
              }}
              onSelectVendor={(vendor) => actions.setSelectedVendor(vendor)}
              onDeleteVendor={(vendor) => {
                actions.setDeleteTarget({ type: "vendor", id: vendor.id, name: vendor.name });
                actions.setIsDeleteDialogOpen(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Vendor Dialog ── */}
      <AddVendorModal
        isOpen={actions.isVendorDialogOpen}
        onClose={() => actions.setIsVendorDialogOpen(false)}
        vendorForm={actions.vendorForm}
        setVendorForm={actions.setVendorForm}
        vendorErrors={actions.vendorErrors}
        setVendorErrors={actions.setVendorErrors}
        isSubmitting={actions.isSubmittingVendor}
        onSubmit={actions.handleVendorSubmit}
      />

      {/* ── Create Purchase Order Dialog ── */}
      <CreatePOModal
        isOpen={actions.isPODialogOpen}
        onClose={() => actions.setIsPODialogOpen(false)}
        vendors={data.vendors}
        inventoryItems={data.inventoryItems}
        poVendorId={actions.poVendorId}
        setPoVendorId={actions.setPoVendorId}
        poNotes={actions.poNotes}
        setPoNotes={actions.setPoNotes}
        poTaxPercent={actions.poTaxPercent}
        setPoTaxPercent={actions.setPoTaxPercent}
        poItems={actions.poItems}
        setPoItems={actions.setPoItems}
        addToInventory={actions.addToInventory}
        setAddToInventory={actions.setAddToInventory}
        onAddPOItem={actions.addPOItem}
        onRemovePOItem={actions.removePOItem}
        onUpdatePOItem={actions.updatePOItem}
        onSubmit={actions.handlePOSubmit}
        onRefreshInventory={data.fetchInventory}
      />

      {/* ── Order Detail Dialog ── */}
      <PODetailModal
        isOpen={actions.isDetailDialogOpen}
        onClose={() => actions.setIsDetailDialogOpen(false)}
        order={actions.detailOrder}
        dateLocale={dateLocale}
      />

      {/* ── Delete Confirmation Sheet ── */}
      <ConfirmDeleteSheet
        open={actions.isDeleteDialogOpen}
        onClose={() => actions.setIsDeleteDialogOpen(false)}
        onConfirm={actions.handleDelete}
        entityLabel={
          actions.deleteTarget?.type === "order"
            ? tDelete("entityOrder")
            : tDelete("entityVendor")
        }
        entityName={
          actions.deleteTarget?.type === "order"
            ? data.orders.find((o) => o.id === actions.deleteTarget?.id)?.poNumber
            : data.vendors.find((v) => v.id === actions.deleteTarget?.id)?.name
        }
        consequenceText={
          actions.deleteTarget?.type === "order"
            ? tDelete("consequenceOrder")
            : tDelete("consequenceVendor")
        }
      />

      {/* ── Record Payment Modal ── */}
      <RecordPaymentModal
        isOpen={actions.isPaymentModalOpen}
        onClose={() => {
          actions.setIsPaymentModalOpen(false);
          actions.setPaymentPO(null);
        }}
        purchaseOrder={actions.paymentPO}
        onPaymentRecorded={(updatedPO) => {
          data.setOrders((prev) =>
            prev.map((o) =>
              o.id === updatedPO.id
                ? { ...o, paidAmount: updatedPO.paidAmount }
                : o
            )
          );
        }}
      />

      {/* ── Vendor Detail Drawer ── */}
      <VendorDetailDrawer
        vendor={actions.selectedVendor}
        orders={data.orders}
        onClose={() => actions.setSelectedVendor(null)}
      />
    </motion.div>
  );
}
