"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { FileText, Download, Printer, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import TallyExportButton from "./TallyExportButton";
import type { Bill, CompanyInfo } from "./types";

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | null;
  companyInfo: CompanyInfo | null;
  pdfGenerating: boolean;
  dateLocale: string;
  onGeneratePdf: (bill: Bill, action: "download" | "print") => void;
  onRefresh: () => void;
}

export function InvoicePreviewModal({
  open,
  onOpenChange,
  bill,
  companyInfo,
  pdfGenerating,
  dateLocale,
  onGeneratePdf,
  onRefresh,
}: InvoicePreviewModalProps) {
  const t = useTranslations("billing");
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreen className="!bg-transparent" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{t("previewTitle")}</DialogTitle>
        <div
          className="fixed inset-0 z-[1] flex items-end lg:items-center lg:justify-center"
          onClick={() => onOpenChange(false)}
        >
          <div
            className="w-full lg:w-[min(1200px,92vw)] max-h-[88dvh] lg:h-[min(92vh,980px)] flex flex-col overflow-hidden rounded-t-[32px] lg:rounded-2xl shadow-2xl"
            style={{ background: "var(--overlay-sheet-bg, #0D1421)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Top Toolbar (desktop only) */}
            <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-[var(--erp-success)]" />
                <span className="text-[15px] font-semibold text-[var(--foreground)]">
                  {t("previewTitle")}
                </span>
                {bill && (
                  <span className="text-[13px] text-[var(--muted-foreground)] font-mono ml-1">
                    {bill.billNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {bill && (
                  <>
                    <button
                      onClick={() => onGeneratePdf(bill, "print")}
                      disabled={pdfGenerating}
                      className="h-9 px-4 rounded-lg border border-[rgba(255,255,255,0.10)] bg-transparent text-[var(--muted-foreground)] text-[13px] font-medium flex items-center gap-2 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Printer size={14} />
                      {t("btnPrint")}
                    </button>
                    <button
                      onClick={() => onGeneratePdf(bill, "download")}
                      disabled={pdfGenerating}
                      className="h-9 px-4 rounded-lg border-none bg-[#2563EB] text-white text-[13px] font-semibold flex items-center gap-2 hover:bg-[#1d4ed8] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {pdfGenerating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                      {pdfGenerating ? t("generatingPdf") : t("btnDownloadPdf")}
                    </button>
                    <TallyExportButton
                      invoiceId={bill.id}
                      invoiceNumber={bill.billNumber}
                      tallySynced={bill.tallySynced}
                      tallySyncedAt={bill.tallySyncedAt}
                      tallyVoucherNumber={bill.tallyVoucherNumber}
                      onSuccess={onRefresh}
                    />
                  </>
                )}
                <button
                  onClick={() => onOpenChange(false)}
                  className="h-9 w-9 rounded-lg border border-[rgba(255,255,255,0.10)] bg-transparent text-[var(--muted-foreground)] flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer ml-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Mobile drag handle (visible below lg) */}
            <div className="flex lg:hidden justify-center pt-3 pb-2 shrink-0">
              <div
                className="w-12 h-[5px] rounded-full"
                style={{ background: "var(--overlay-handle, rgba(255,255,255,0.2))" }}
              />
            </div>

            {/* Scrollable Document Area */}
            <div className="flex-1 overflow-y-auto min-h-0 lg:bg-[rgba(0,0,0,0.15)]">
              {bill && (
                <div className="lg:flex lg:justify-center lg:py-8 lg:px-4">
                  <div
                    className="w-full lg:max-w-[900px] lg:rounded-xl lg:shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
                    style={{ background: "var(--overlay-sheet-bg, #0D1421)" }}
                  >
                    <div
                      className="p-4 md:p-6 lg:p-10 pb-[120px] lg:pb-10 overflow-x-hidden"
                      ref={printRef}
                    >
                      {/* Invoice Header */}
                      <div className="text-center border-b border-[var(--border)] pb-4 md:pb-6 mb-4 md:mb-6">
                        <h1 className="text-lg md:text-[24px] font-bold tracking-tight text-[var(--erp-success)] break-words">
                          {companyInfo?.companyName || t("defaultCompanyName")}
                        </h1>
                        <p className="text-[12px] md:text-[13px] text-[var(--muted-foreground)] mt-1 break-words">
                          {companyInfo?.address?.replace("\n", ", ") || t("defaultCompanyAddress")}
                        </p>
                        <p className="text-[11px] md:text-[12px] text-[var(--muted-foreground)] mt-1 break-words">
                          {t("defaultPhone", {
                            phone: companyInfo?.phone || "N/A",
                            email: companyInfo?.email || "N/A",
                          })}
                        </p>
                        <p className="text-[11px] md:text-[12px] text-[var(--muted-foreground)] break-words">
                          {t("defaultGstinPan", {
                            gstin: companyInfo?.gstin || "N/A",
                            pan: companyInfo?.pan || "N/A",
                          })}
                        </p>
                      </div>

                      <div className="bg-[var(--erp-success)] w-full text-center py-3 text-white font-bold text-lg tracking-widest rounded mb-4 md:mb-6">
                        {t("taxInvoiceBadge")}
                      </div>

                      {/* Bill To + Invoice Info */}
                      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-6">
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-[var(--muted-foreground)] mb-2">
                            {t("billTo")}
                          </h3>
                          <p className="font-bold text-base md:text-lg text-[var(--foreground)] break-words">
                            {bill.clientName}
                          </p>
                          {bill.clientAddress && (
                            <p className="text-sm text-[var(--muted-foreground)] break-words">
                              {bill.clientAddress}
                            </p>
                          )}
                          {bill.clientGSTIN && (
                            <p className="text-sm text-[var(--muted-foreground)] break-words">
                              {t("gstinLabel", { gstin: bill.clientGSTIN })}
                            </p>
                          )}
                          {bill.clientPhone && (
                            <p className="text-sm text-[var(--muted-foreground)]">
                              {t("phoneLabel")}: {bill.clientPhone}
                            </p>
                          )}
                        </div>
                        <div className="min-w-0 md:text-right">
                          <p className="text-sm break-words">
                            <span className="text-[var(--muted-foreground)]">{t("invoiceNo")}</span>{" "}
                            <span className="font-bold">{bill.billNumber}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-[var(--muted-foreground)]">{t("date")}</span>{" "}
                            {new Date(bill.billDate).toLocaleDateString(dateLocale)}
                          </p>
                          <p className="text-sm">
                            <span className="text-[var(--muted-foreground)]">{t("dueDate")}</span>{" "}
                            {new Date(bill.dueDate).toLocaleDateString(dateLocale)}
                          </p>
                        </div>
                      </div>

                      {/* Items Table — Desktop */}
                      <table className="hidden md:table w-full mb-6">
                        <thead>
                          <tr className="bg-[var(--muted)]">
                            <th className="text-left p-2 text-xs font-bold">{t("colSNo")}</th>
                            <th className="text-left p-2 text-xs font-bold">
                              {t("colDescription")}
                            </th>
                            <th className="text-left p-2 text-xs font-bold">{t("colHsn")}</th>
                            <th className="text-right p-2 text-xs font-bold">{t("colQty")}</th>
                            <th className="text-right p-2 text-xs font-bold">{t("colRate")}</th>
                            <th className="text-right p-2 text-xs font-bold">{t("colGst")}</th>
                            <th className="text-right p-2 text-xs font-bold">{t("colAmount")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bill.items.map((item, idx) => (
                            <tr key={`${item.id}-${idx}`} className="border-b">
                              <td className="p-2 text-sm">{idx + 1}</td>
                              <td className="p-2 text-sm font-medium">{item.description}</td>
                              <td className="p-2 text-sm">{item.hsnCode || "-"}</td>
                              <td className="p-2 text-sm text-right">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="p-2 text-sm text-right">
                                {"\u20B9"}{item.rate.toLocaleString(dateLocale)}
                              </td>
                              <td className="p-2 text-sm text-right">{item.gstRate}%</td>
                              <td className="p-2 text-sm text-right font-bold">
                                {"\u20B9"}{item.amount.toLocaleString(dateLocale)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Items Cards — Mobile */}
                      <div className="block md:hidden mb-4 space-y-2">
                        {bill.items.map((item, idx) => (
                          <div key={`${item.id}-${idx}`} className="bg-white/5 rounded-lg px-3 py-2">
                            <div className="flex justify-between items-start">
                              <span className="text-sm font-bold text-[var(--foreground)] break-words min-w-0 flex-1 mr-2">
                                {item.description}
                              </span>
                              <span className="text-sm font-bold text-[var(--foreground)] whitespace-nowrap">
                                {"\u20B9"}{item.amount.toLocaleString(dateLocale)}
                              </span>
                            </div>
                            {item.hsnCode && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t("itemHsn", { hsn: item.hsnCode })}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground">
                                {item.quantity} {item.unit} × {"\u20B9"}
                                {item.rate.toLocaleString(dateLocale)}
                              </span>
                              <span className="text-xs text-gray-400 bg-white/10 rounded px-1.5 py-0.5">
                                {t("taxBadge", { rate: item.gstRate })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Totals */}
                      <div className="flex justify-end mb-4 md:mb-6">
                        <div className="w-full md:w-64 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted-foreground)]">{t("subtotal")}</span>
                            <span className="font-bold">
                              {"\u20B9"}{bill.subtotal.toLocaleString(dateLocale)}
                            </span>
                          </div>
                          {bill.igstAmount > 0 ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--muted-foreground)]">{t("igst")}</span>
                              <span>{"\u20B9"}{bill.igstAmount.toLocaleString(dateLocale)}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted-foreground)]">{t("cgst")}</span>
                                <span>
                                  {"\u20B9"}{bill.cgstAmount.toLocaleString(dateLocale)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted-foreground)]">{t("sgst")}</span>
                                <span>
                                  {"\u20B9"}{bill.sgstAmount.toLocaleString(dateLocale)}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between text-base md:text-lg font-bold text-green-400 border-t border-white/20 pt-2 mt-1">
                            <span>{t("total")}</span>
                            <span className="font-black text-[var(--erp-success)]">
                              {"\u20B9"}{bill.totalAmount.toLocaleString(dateLocale)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs md:text-sm italic text-[var(--muted-foreground)] mb-4 md:mb-6 break-words">
                        {t("amountInWords")}{" "}
                        <span className="font-medium">{bill.amountInWords}</span>
                      </p>

                      {/* Bank Details + Terms */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 text-xs text-[var(--muted-foreground)] border-t border-[var(--border)] pt-4">
                        <div className="min-w-0">
                          <h4 className="font-bold text-[var(--foreground)] mb-1">
                            {t("bankDetailsTitle")}
                          </h4>
                          <p className="break-words">
                            {t("bankName", { bank: companyInfo?.bankName || "N/A" })}
                          </p>
                          <p className="break-words">
                            {t("accountNo", { acc: companyInfo?.accountNo || "N/A" })}
                          </p>
                          <p>{t("ifsc", { ifsc: companyInfo?.ifsc || "N/A" })}</p>
                          <p className="break-words">
                            {t("upi", { upi: companyInfo?.upiId || "N/A" })}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-[var(--foreground)] mb-1">
                            {t("termsTitle")}
                          </h4>
                          <pre className="whitespace-pre-wrap font-sans break-words">
                            {bill.terms}
                          </pre>
                        </div>
                      </div>

                      <div className="text-right mt-6 md:mt-8 pt-6 md:pt-8">
                        <div className="inline-block text-center">
                          <div className="border-t border-zinc-300 pt-2 px-8">
                            <p className="text-xs text-zinc-500">{t("authSignatory")}</p>
                          </div>
                        </div>
                      </div>

                      <p className="text-center text-xs text-[var(--muted-foreground)] mt-6 md:mt-8">
                        {t("computerGenerated")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Bottom Dock (hidden on desktop) */}
            <div
              className="flex lg:hidden shrink-0"
              style={{
                background: "var(--overlay-sheet-bg, #0D1421)",
                borderTop: "1px solid var(--overlay-border, rgba(255,255,255,0.08))",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                padding: "12px 16px",
                paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
              }}
            >
              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <button
                  onClick={() => onOpenChange(false)}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 14,
                    border: "1px solid var(--overlay-border, rgba(255,255,255,0.10))",
                    background: "transparent",
                    color: "var(--overlay-text-secondary, #94a3b8)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {t("btnClose")}
                </button>
                {bill && (
                  <button
                    onClick={() => onGeneratePdf(bill, "download")}
                    disabled={pdfGenerating}
                    style={{
                      flex: 1.4,
                      height: 48,
                      borderRadius: 14,
                      border: "none",
                      background: "#2563EB",
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {pdfGenerating ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Download size={15} />
                    )}
                    {pdfGenerating ? t("generatingPdf") : t("btnDownloadPdf")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

