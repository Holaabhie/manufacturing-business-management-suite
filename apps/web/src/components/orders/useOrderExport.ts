import { useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { OrderItem } from "./types";

interface UseOrderExportProps {
  orders: OrderItem[];
  pdfFailedText: string;
  excelDownloadedText: string;
  excelFailedText: string;
}

export function useOrderExport({
  orders,
  pdfFailedText,
  excelDownloadedText,
  excelFailedText,
}: UseOrderExportProps) {
  const exportToPDF = useCallback(
    async (order: OrderItem) => {
      try {
        const { generatePurchaseOrderPDF } = await import("@/lib/pdf-generator");
        let companyData = null;
        try {
          const data = await apiClient.get<{ company?: any }>("/api/profile/company");
          if (data.company) companyData = data.company;
        } catch {
          // Fallback gracefully
        }
        const client = order.client as { name?: string; address?: string } | undefined;
        await generatePurchaseOrderPDF(
          {
            orderId: order.id,
            orderDate: order.createdAt || new Date().toISOString(),
            clientName: client?.name || "N/A",
            clientAddress: client?.address,
            productName: order.productName || order.product_name || "Order",
            quantity: Number(order.quantity),
            rate: Number(order.rate),
            totalAmount: Number(order.totalAmount || order.total_amount || 0),
            status: order.status,
            deliveryDate: order.deliveryDate ? String(order.deliveryDate) : undefined,
          },
          companyData
        );
      } catch {
        toast.error(pdfFailedText);
      }
    },
    [pdfFailedText]
  );

  const exportToXLSX = useCallback(async () => {
    try {
      const { exportToExcel } = await import("@/lib/excel-export");
      const columns = [
        { header: "Order ID", key: "order_id" },
        { header: "Client", key: "client_name" },
        { header: "Status", key: "status" },
        { header: "Amount", key: "total_amount" },
        { header: "Date", key: "date_formatted" },
      ];
      const dataToExport = orders.map((order) => {
        const client = order.client as { name?: string } | undefined;
        return {
          order_id: order.id ?? "",
          client_name: client?.name || "—",
          status: order.status ?? "",
          total_amount: order.totalAmount ?? order.total_amount ?? 0,
          date_formatted: order.createdAt
            ? new Date(order.createdAt).toLocaleDateString("en-IN")
            : "—",
        };
      });
      exportToExcel(`orders_${new Date().toISOString().split("T")[0]}.xlsx`, "Orders", dataToExport, columns);
      toast.success(excelDownloadedText);
    } catch {
      toast.error(excelFailedText);
    }
  }, [orders, excelDownloadedText, excelFailedText]);

  return {
    exportToPDF,
    exportToXLSX,
    handleDownloadInvoice: exportToPDF,
    handleExportExcel: exportToXLSX,
  };
}
