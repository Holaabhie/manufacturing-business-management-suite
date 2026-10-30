"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { InvoicePayload } from "@/lib/invoice/types";
import type { Bill, CompanyInfo } from "./types";

interface UseBillingActionsProps {
  companyInfo: CompanyInfo | null;
  dateLocale: string;
  onRefresh: () => void;
}

export function useBillingActions({ companyInfo, dateLocale, onRefresh }: UseBillingActionsProps) {
  const t = useTranslations("billing");
  const queryClient = useQueryClient();
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Long-press and mobile sheet state
  const [longPressedBill, setLongPressedBill] = useState<Bill | null>(null);
  const [isBillSheetOpen, setIsBillSheetOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const longPressTriggered = useRef(false);

  const handleBillLongPressStart = useCallback((bill: Bill, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    longPressTriggered.current = false;
    longPressTimerRef.current = setTimeout(() => {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
      longPressTriggered.current = true;
      setLongPressedBill(bill);
      setIsBillSheetOpen(true);
    }, 500);
  }, []);

  const handleBillLongPressMove = useCallback((e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handleBillLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const closeBillSheet = useCallback(() => {
    setIsBillSheetOpen(false);
    setTimeout(() => setLongPressedBill(null), 350);
  }, []);

  const handleWhatsAppShare = useCallback(
    async (bill: Bill) => {
      const message = `Invoice ${bill.billNumber}\nClient: ${bill.clientName}\nAmount: \u20B9${bill.totalAmount.toLocaleString(dateLocale)}\nDue: ${new Date(bill.dueDate).toLocaleDateString("en-IN")}`;

      const phoneNumber = bill.clientPhone?.replace(/[^0-9]/g, "") || "";
      const waUrl = phoneNumber
        ? `https://wa.me/${phoneNumber.startsWith("91") ? phoneNumber : "91" + phoneNumber}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;

      window.open(waUrl, "_blank");
      toast.success(t("toasts.openingWhatsApp"));

      try {
        await apiClient.post("/api/billing/share-log", {
          billId: bill.id,
          billNumber: bill.billNumber,
          clientName: bill.clientName,
          totalAmount: bill.totalAmount,
          channel: "whatsapp",
        });
      } catch {
        /* non-critical */
      }
    },
    [dateLocale, t]
  );

  const updateStatus = useCallback(
    async (id: string, status: Bill["status"]) => {
      try {
        await apiClient.put(`/api/v1/billing/${id}`, { status });
        queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
        queryClient.invalidateQueries({ queryKey: queryKeys.billing });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats });
        toast.success(t("toasts.statusUpdated", { status }));
        onRefresh();
      } catch (error: any) {
        toast.error(error?.message || t("toasts.statusFailed"));
      }
    },
    [onRefresh, queryClient, t]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/api/v1/billing/${id}`);
        queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
        queryClient.invalidateQueries({ queryKey: queryKeys.billing });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats });
        toast.success(t("toasts.billDeleted"));
        onRefresh();
      } catch (error: any) {
        toast.error(error?.message || t("toasts.billDeleteFailed"));
      } finally {
        setIsDeleteDialogOpen(false);
        setBillToDelete(null);
      }
    },
    [onRefresh, queryClient, t]
  );

  const generatePDF = useCallback(
    async (bill: Bill, action: "download" | "print" = "download") => {
      setPdfGenerating(true);
      try {
        const invoicePayload: InvoicePayload = {
          invoiceNumber: bill.billNumber,
          issueDate: bill.billDate,
          dueDate: bill.dueDate,
          status: bill.status,
          taxType: bill.igstAmount > 0 ? "IGST" : "CGST_SGST",
          company: {
            companyName: companyInfo?.companyName || "Your Company",
            address: companyInfo?.address || "",
            phone: companyInfo?.phone || "",
            email: companyInfo?.email || "",
            logoUrl: companyInfo?.logoUrl,
            gstin: companyInfo?.gstin,
            pan: companyInfo?.pan,
            bankName: companyInfo?.bankName,
            accountNo: companyInfo?.accountNo,
            ifsc: companyInfo?.ifsc,
            upiId: companyInfo?.upiId,
          },
          client: {
            name: bill.clientName,
            address: bill.clientAddress,
            gstin: bill.clientGSTIN,
            phone: bill.clientPhone,
            email: bill.clientEmail,
          },
          items: bill.items.map((item) => ({
            description: item.description,
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount: item.amount,
            gstRate: item.gstRate,
          })),
          subtotal: bill.subtotal,
          cgstAmount: bill.cgstAmount,
          sgstAmount: bill.sgstAmount,
          igstAmount: bill.igstAmount,
          totalAmount: bill.totalAmount,
          amountInWords: bill.amountInWords,
          notes: bill.notes,
          terms: bill.terms,
        };

        const res = await fetch("/api/invoice/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoicePayload),
        });

        const contentType = res.headers.get("Content-Type") || "";
        const isFallbackHtml = res.headers.get("X-Fallback") === "html";

        if (contentType.includes("application/pdf")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);

          if (action === "download") {
            const a = document.createElement("a");
            a.href = url;
            a.download = `Invoice_${bill.billNumber.replace(/[^a-zA-Z0-9\-_]/g, "_")}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success(t("toasts.pdfDownloaded"));
          } else {
            const printWindow = window.open(url);
            if (printWindow) {
              printWindow.onload = () => printWindow.print();
              toast.success(t("toasts.printDialog"));
            } else {
              toast.error(t("toasts.popupBlocked"));
            }
          }
        } else if (isFallbackHtml || contentType.includes("text/html")) {
          const html = await res.text();
          const blob = new Blob([html], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          const w = window.open(url);
          if (w) {
            w.onload = () => {
              if (action === "print") w.print();
            };
            toast.info(action === "print" ? t("toasts.printDialog") : t("toasts.htmlFallback"));
          }
        } else {
          const err = await res.json().catch(() => ({ message: "Unknown error" }));
          toast.error(err.message || t("toasts.pdfActionFailed", { action }));
        }
      } catch (error) {
        console.error("PDF generation error:", error);
        toast.error(t("toasts.pdfActionFailed", { action }));
      } finally {
        setPdfGenerating(false);
      }
    },
    [companyInfo, t]
  );

  return {
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
    setLongPressedBill,
    isBillSheetOpen,
    setIsBillSheetOpen,
    longPressTriggered,
    handleBillLongPressStart,
    handleBillLongPressMove,
    handleBillLongPressEnd,
    closeBillSheet,
    handleWhatsAppShare,
    updateStatus,
    handleDelete,
    generatePDF,
  };
}

