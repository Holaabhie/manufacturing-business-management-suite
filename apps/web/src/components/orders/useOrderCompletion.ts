import { useState, useCallback } from "react";
import { useUpdateOrderStatus } from "@/lib/hooks/use-orders";
import { apiClient } from "@/lib/api-client";
import type { OrderItem, InvoicePreviewData, InvoiceEditData } from "./types";

interface UseOrderCompletionProps {
  completionOrder: OrderItem | null;
  closeCompletion: () => void;
  showToast: (msg: string) => void;
  invoiceGeneratedText: string;
  failedInvoiceText: string;
}

export function useOrderCompletion({
  completionOrder,
  closeCompletion,
  showToast,
  invoiceGeneratedText,
  failedInvoiceText,
}: UseOrderCompletionProps) {
  const updateOrderStatus = useUpdateOrderStatus();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<{ invoiceData?: InvoicePreviewData } | null>(null);
  const [invoiceEditData, setInvoiceEditData] = useState<InvoiceEditData | null>(null);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);

  const handleCompleteOnly = useCallback(() => {
    if (!completionOrder) return;
    const orderId = completionOrder.id;
    closeCompletion();
    setUpdatingOrderId(orderId);
    updateOrderStatus.mutate(
      { id: orderId, status: "completed" },
      {
        onSettled: () => setUpdatingOrderId(null),
      }
    );
  }, [completionOrder, closeCompletion, updateOrderStatus]);

  const handleCompleteAndInvoice = useCallback(async () => {
    if (!completionOrder) return;
    const orderId = completionOrder.id;
    closeCompletion();
    setUpdatingOrderId(orderId);

    updateOrderStatus.mutate(
      { id: orderId, status: "completed" },
      {
        onSettled: () => setUpdatingOrderId(null),
        onSuccess: async () => {
          setIsGeneratingInvoice(true);
          try {
            const data = await apiClient.post<InvoicePreviewData>("/api/invoices/auto-generate", { orderId });
            setGeneratedInvoice({ invoiceData: data });
            setInvoiceEditData({
              invoiceNumber: data.invoiceNumber,
              issueDate: new Date().toISOString().split("T")[0],
              dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
              notes: data.notes || "",
              gstRate: 18,
            });
            setIsInvoicePreviewOpen(true);
            showToast(invoiceGeneratedText);
          } catch {
            showToast(failedInvoiceText);
          } finally {
            setIsGeneratingInvoice(false);
          }
        },
      }
    );
  }, [
    completionOrder,
    closeCompletion,
    updateOrderStatus,
    showToast,
    invoiceGeneratedText,
    failedInvoiceText,
  ]);

  return {
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
  };
}
