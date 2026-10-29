"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  FileText,
  Eye,
  Download,
  Printer,
  Share2,
  Send,
  CheckCircle2,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { IOSBadge } from "@/components/ui/ios";
import { staggerItem } from "@/styles/animations";
import TallyExportButton from "./TallyExportButton";
import type { Bill } from "./types";

interface BillingTableProps {
  bills: Bill[];
  loading: boolean;
  dateLocale: string;
  onPreview: (bill: Bill) => void;
  onDownloadPdf: (bill: Bill) => void;
  onPrint: (bill: Bill) => void;
  onWhatsAppShare: (bill: Bill) => void;
  onUpdateStatus: (id: string, status: Bill["status"]) => void;
  onOpenDelete: (id: string) => void;
  onRefresh: () => void;
}

export function BillingTable({
  bills,
  loading,
  dateLocale,
  onPreview,
  onDownloadPdf,
  onPrint,
  onWhatsAppShare,
  onUpdateStatus,
  onOpenDelete,
  onRefresh,
}: BillingTableProps) {
  const t = useTranslations("billing");

  return (
    <div className="hidden md:block rounded-2xl border bg-[var(--card)] shadow-sm overflow-hidden border-[var(--border)]">
      <Table>
        <TableHeader className="bg-[var(--muted)] border-b border-[var(--border)]">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-medium text-[var(--muted-foreground)] py-4 pl-6">
              {t("thInvoice")}
            </TableHead>
            <TableHead className="font-medium text-[var(--muted-foreground)] py-4">
              {t("thClient")}
            </TableHead>
            <TableHead className="font-medium text-[var(--muted-foreground)] py-4">
              {t("thDate")}
            </TableHead>
            <TableHead className="font-medium text-[var(--muted-foreground)] py-4 text-right">
              {t("thAmount")}
            </TableHead>
            <TableHead className="font-medium text-[var(--muted-foreground)] py-4 text-center">
              {t("thStatus")}
            </TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="pl-6">
                  <Skeleton className="h-10 w-full rounded-lg" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-10 w-full rounded-lg" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-10 w-full rounded-lg" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-10 w-full rounded-lg" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-20 rounded-full mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : bills.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-20 text-[var(--muted-foreground)]">
                <FileText className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)]" />
                <p className="text-[13px]">{t("noInvoicesFound")}</p>
              </TableCell>
            </TableRow>
          ) : (
            bills.map((bill, index) => (
              <motion.tr
                key={bill.id}
                variants={staggerItem}
                initial="hidden"
                animate="show"
                custom={index}
                className="group bg-[var(--card)] hover:bg-[var(--muted)] border-b border-[var(--border)] transition-all shadow-sm hover:shadow-md"
              >
                <TableCell className="pl-6 py-4">
                  <span className="font-semibold text-[15px] text-blue-600 tracking-tight">
                    {bill.billNumber}
                  </span>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-[15px] text-[var(--foreground)]">
                      {bill.clientName}
                    </span>
                    {bill.clientGSTIN && (
                      <span className="text-[12px] text-[var(--muted-foreground)]">
                        {t("gstinLabel", { gstin: bill.clientGSTIN })}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-[14px] text-[var(--foreground)]">
                      {new Date(bill.billDate).toLocaleDateString(dateLocale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-[12px] text-[var(--muted-foreground)]">
                      {t("dueLabel", {
                        date: new Date(bill.dueDate).toLocaleDateString(dateLocale, {
                          day: "numeric",
                          month: "short",
                        }),
                      })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-4 text-right pr-6">
                  <span className="font-semibold text-[17px] tracking-tight">
                    {"\u20B9"}{bill.totalAmount.toLocaleString(dateLocale)}
                  </span>
                </TableCell>
                <TableCell className="py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <IOSBadge
                      variant={
                        bill.status === "paid"
                          ? "filled"
                          : bill.status === "sent"
                            ? "tinted"
                            : bill.status === "draft"
                              ? "outline"
                              : "filled"
                      }
                      color={
                        bill.status === "paid"
                          ? "green"
                          : bill.status === "sent"
                            ? "blue"
                            : bill.status === "draft"
                              ? "gray"
                              : "red"
                      }
                      className="uppercase tracking-widest text-[10px]"
                    >
                      {bill.status}
                    </IOSBadge>
                    <TallyExportButton
                      invoiceId={bill.id}
                      invoiceNumber={bill.billNumber}
                      tallySynced={bill.tallySynced}
                      tallySyncedAt={bill.tallySyncedAt}
                      tallyVoucherNumber={bill.tallyVoucherNumber}
                      onSuccess={onRefresh}
                      compact
                    />
                  </div>
                </TableCell>
                <TableCell className="py-4 pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onPreview(bill)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {t("actionPreview")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDownloadPdf(bill)}>
                        <Download className="mr-2 h-4 w-4" />
                        {t("actionDownloadPdf")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onPrint(bill)}>
                        <Printer className="mr-2 h-4 w-4 text-[var(--erp-success)]" />
                        {t("actionPrint")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onWhatsAppShare(bill)}>
                        <Share2 className="mr-2 h-4 w-4 text-green-500" />
                        {t("actionWhatsApp")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="p-0 focus:bg-transparent"
                      >
                        <div className="px-2 py-1.5">
                          <TallyExportButton
                            invoiceId={bill.id}
                            invoiceNumber={bill.billNumber}
                            tallySynced={bill.tallySynced}
                            tallySyncedAt={bill.tallySyncedAt}
                            tallyVoucherNumber={bill.tallyVoucherNumber}
                            onSuccess={onRefresh}
                          />
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {bill.status === "draft" && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(bill.id, "sent")}>
                          <Send className="mr-2 h-4 w-4" />
                          {t("actionMarkSent")}
                        </DropdownMenuItem>
                      )}
                      {bill.status === "sent" && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(bill.id, "paid")}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {t("actionMarkPaid")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => onOpenDelete(bill.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("actionDelete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

