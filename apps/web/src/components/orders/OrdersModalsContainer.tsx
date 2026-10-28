"use client";

import React from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { OrderItem, OrderModalsState, InvoicePreviewData, InvoiceEditData } from "./types";

// Lazy-loaded Dialogs & Sheets (SSR: false for code splitting)
const RecordPaymentDialog = dynamic(
  () => import("./RecordPaymentDialog").then((m) => m.RecordPaymentDialog),
  { ssr: false }
);
const OrderActionSheet = dynamic(
  () => import("./OrderActionSheet").then((m) => m.OrderActionSheet),
  { ssr: false }
);
const CompletionConfirmationModal = dynamic(
  () => import("./CompletionModals").then((m) => m.CompletionConfirmationModal),
  { ssr: false }
);
const InvoicePreviewModal = dynamic(
  () => import("./InvoicePreviewModal").then((m) => m.InvoicePreviewModal),
  { ssr: false }
);
const ConfirmDeleteSheet = dynamic(
  () => import("@/components/ui/ConfirmDeleteSheet").then((m) => m.ConfirmDeleteSheet),
  { ssr: false }
);
const StaffOrderDetailSheet = dynamic(
  () => import("@/components/staff/StaffOrderDetailSheet").then((m) => m.StaffOrderDetailSheet),
  { ssr: false }
);

interface OrdersModalsContainerProps {
  modals: OrderModalsState;
  isAdmin: boolean;
  orderToDelete?: OrderItem;
  isDeleting: boolean;
  isGeneratingInvoice: boolean;
  generatedInvoice: { invoiceData?: InvoicePreviewData } | null;
  invoiceEditData: InvoiceEditData | null;
  isInvoicePreviewOpen: boolean;
  toastMessage: string | null;
  closePayment: () => void;
  closeActionSheet: () => void;
  closeCompletion: () => void;
  closeDelete: () => void;
  closeStaffDetail: () => void;
  handleEditOrder: (order: OrderItem) => void;
  handleDownloadInvoice: (order: OrderItem) => void;
  openDelete: (orderId: string) => void;
  handleDeleteConfirm: () => void;
  handleCompleteOnly: () => void;
  handleCompleteAndInvoice: () => void;
  setInvoiceEditData: (data: InvoiceEditData) => void;
  setIsInvoicePreviewOpen: (open: boolean) => void;
  setGeneratedInvoice: (data: { invoiceData?: InvoicePreviewData } | null) => void;
  showToast: (msg: string) => void;
}

export function OrdersModalsContainer({
  modals,
  isAdmin,
  orderToDelete,
  isDeleting,
  isGeneratingInvoice,
  generatedInvoice,
  invoiceEditData,
  isInvoicePreviewOpen,
  toastMessage,
  closePayment,
  closeActionSheet,
  closeCompletion,
  closeDelete,
  closeStaffDetail,
  handleEditOrder,
  handleDownloadInvoice,
  openDelete,
  handleDeleteConfirm,
  handleCompleteOnly,
  handleCompleteAndInvoice,
  setInvoiceEditData,
  setIsInvoicePreviewOpen,
  setGeneratedInvoice,
  showToast,
}: OrdersModalsContainerProps) {
  const t = useTranslations("orders");

  return (
    <>
      <RecordPaymentDialog
        open={modals.isPaymentOpen}
        order={modals.paymentOrder}
        onClose={closePayment}
      />

      <OrderActionSheet
        open={modals.isActionSheetOpen}
        order={modals.longPressedOrder}
        isAdmin={isAdmin}
        onClose={closeActionSheet}
        onEdit={handleEditOrder}
        onGenerateInvoice={handleDownloadInvoice}
        onDelete={openDelete}
        showToast={showToast}
      />

      <CompletionConfirmationModal
        open={modals.isCompletionOpen}
        order={modals.completionOrder}
        onCompleteOnly={handleCompleteOnly}
        onCompleteAndInvoice={handleCompleteAndInvoice}
        onCancel={closeCompletion}
        isLoading={isGeneratingInvoice}
      />

      <InvoicePreviewModal
        open={isInvoicePreviewOpen}
        invoiceData={generatedInvoice}
        editData={invoiceEditData}
        onEditChange={setInvoiceEditData}
        onClose={() => {
          setIsInvoicePreviewOpen(false);
          setGeneratedInvoice(null);
        }}
      />

      <ConfirmDeleteSheet
        open={modals.isDeleteOpen}
        onClose={closeDelete}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        entityLabel={t("deleteConfirm.entityLabel")}
        entityName={orderToDelete?.productName || orderToDelete?.product_name}
        consequenceText={t("deleteConfirm.consequenceText")}
      />

      <StaffOrderDetailSheet
        open={modals.isStaffDetailOpen}
        onClose={closeStaffDetail}
        order={
          modals.staffSelectedOrder
            ? {
                ...modals.staffSelectedOrder,
                client: modals.staffSelectedOrder.client ?? undefined,
                clients: modals.staffSelectedOrder.clients ?? undefined,
              }
            : null
        }
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(15,23,42,0.92)",
            backdropFilter: "blur(8px)",
            color: "#F8FAFC",
            padding: "10px 20px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 8px 32px rgba(0,0,0,0.24)",
            whiteSpace: "nowrap",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Generating Invoice Overlay */}
      <AnimatePresence>
        {isGeneratingInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9997,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Loader2 size={32} style={{ color: "#10b981", animation: "spin 1s linear infinite" }} />
            <p
              style={{
                color: "#e2e8f0",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "-apple-system, 'SF Pro Display', sans-serif",
              }}
            >
              {t("completion.generatingInvoice")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
