"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, X, Loader2, Send } from "lucide-react";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { Z } from "@/lib/z-index";
import {
  generateInvoicePDF,
  type InvoiceData,
  type CompanyInfo,
} from "@/lib/pdf-generator";

// ═══════════════════════════════════════════════════════════════
//  COMPLETION CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════

interface CompletionModalProps {
  open: boolean;
  order: any;
  onCompleteOnly: () => void;
  onCompleteAndInvoice: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CompletionConfirmationModal({
  open,
  order,
  onCompleteOnly,
  onCompleteAndInvoice,
  onCancel,
  isLoading,
}: CompletionModalProps) {
  // MobileSheet handles scroll lock, backdrop, animation, focus trap
  return (
    <MobileSheet
      open={open && !!order}
      onClose={onCancel}
      maxWidth="480px"
      zIndex={Z.MODAL}
    >
      {order && (
        <>
          {/* Header */}
          <div style={{
            padding: "20px 24px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderBottom: "1px solid var(--overlay-border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "rgba(16,185,129,0.08)",
                border: "1px solid var(--overlay-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CheckCircle2 size={18} style={{ color: "#16a34a" }} />
              </div>
              <h3 style={{
                fontSize: 18, fontWeight: 600,
                color: "var(--overlay-text-primary)", margin: 0,
              }}>
                Complete this order?
              </h3>
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onCancel}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "transparent",
                border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--overlay-text-muted)",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--overlay-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <X size={16} />
            </motion.button>
          </div>

          {/* Order Summary */}
          <div style={{ padding: "16px 24px 0" }}>
            <div style={{
              background: "var(--overlay-card-bg)",
              border: "1px solid var(--overlay-border)",
              borderRadius: 14, padding: "12px 16px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500, color: "var(--overlay-text-primary)", margin: 0 }}>
                  {order.productName ?? order.product_name ?? "—"}
                </p>
                <p style={{ fontSize: 12, color: "var(--overlay-text-secondary)", margin: "2px 0 0" }}>
                  {order.client?.name ?? "Client"} · {order.quantity ?? 0} {order.unit ?? "kg"}
                </p>
              </div>
              {/* Financial total — KEEP strong weight per audit rules */}
              <span style={{
                fontSize: 18, fontWeight: 600, color: "var(--overlay-accent)",
              }}>
                {"\u20B9"}{Number(order.totalAmount ?? 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Option Cards */}
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Option A: Complete & Generate Invoice */}
            <button
              onClick={onCompleteAndInvoice}
              disabled={isLoading}
              style={{
                width: "100%", textAlign: "left",
                padding: "18px 20px", borderRadius: 16,
                background: "rgba(16,185,129,0.06)",
                border: "1.5px solid rgba(16,185,129,0.2)",
                cursor: isLoading ? "wait" : "pointer",
                opacity: isLoading ? 0.6 : 1,
                transition: "all 0.2s ease",
                display: "flex", alignItems: "center", gap: 14,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(16,185,129,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <FileText size={20} style={{ color: "#16a34a" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: 15, fontWeight: 600, color: "#16a34a",
                  margin: 0,
                }}>
                  Complete & Generate Invoice
                </p>
                <p style={{ fontSize: 12, color: "var(--overlay-text-secondary)", margin: "3px 0 0" }}>
                  Mark complete and auto-create a professional invoice
                </p>
              </div>
              {isLoading && <Loader2 size={18} style={{ color: "#16a34a", animation: "spin 1s linear infinite" }} />}
            </button>

            {/* Option B: Complete Only */}
            <button
              onClick={onCompleteOnly}
              disabled={isLoading}
              style={{
                width: "100%", textAlign: "left",
                padding: "18px 20px", borderRadius: 16,
                background: "var(--overlay-card-bg)",
                border: "1px solid var(--overlay-border)",
                cursor: isLoading ? "wait" : "pointer",
                opacity: isLoading ? 0.6 : 1,
                transition: "all 0.2s ease",
                display: "flex", alignItems: "center", gap: 14,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "var(--overlay-hover)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <CheckCircle2 size={20} style={{ color: "var(--overlay-text-muted)" }} />
              </div>
              <div>
                <p style={{
                  fontSize: 15, fontWeight: 500, color: "var(--overlay-text-primary)",
                  margin: 0,
                }}>
                  Complete Only
                </p>
                <p style={{ fontSize: 12, color: "var(--overlay-text-secondary)", margin: "3px 0 0" }}>
                  Just mark this order as completed
                </p>
              </div>
            </button>
          </div>

          {/* Cancel */}
          <div style={{ padding: "0 24px 20px" }}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onCancel}
              style={{
                width: "100%", height: 44, borderRadius: 12,
                background: "transparent",
                border: "1px solid rgba(15, 23, 42, 0.12)",
                color: "var(--overlay-text-secondary)", fontSize: 14, fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Cancel
            </motion.button>
          </div>

          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </>
      )}
    </MobileSheet>
  );
}

// ═══════════════════════════════════════════════════════════════
//  INVOICE PREVIEW MODAL
// ═══════════════════════════════════════════════════════════════

interface InvoicePreviewProps {
  open: boolean;
  invoiceData: any;
  editData: any;
  onEditChange: (data: any) => void;
  onClose: () => void;
  onDownloadPDF: () => void;
  onSendWhatsApp: () => void;
}

export function InvoicePreviewModal({
  open,
  invoiceData,
  editData,
  onEditChange,
  onClose,
  onDownloadPDF,
  onSendWhatsApp,
}: InvoicePreviewProps) {
  const [sending, setSending] = useState(false);

  const inv = invoiceData?.invoiceData;

  const handleDownload = async () => {
    if (!inv) return;
    try {
      const pdfInvoice: InvoiceData = {
        billNumber: editData?.invoiceNumber || inv.invoiceNumber,
        billDate: editData?.issueDate || inv.issueDate,
        dueDate: editData?.dueDate || inv.dueDate,
        clientName: inv.client?.name || "Client",
        clientAddress: inv.client?.address,
        clientGSTIN: inv.client?.gstin,
        clientPhone: inv.client?.phone,
        clientEmail: inv.client?.email,
        items: (inv.items || []).map((item: any) => ({
          description: item.description,
          hsnCode: item.hsnCode || "",
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          gstRate: editData?.gstRate ?? item.gstRate ?? 18,
        })),
        subtotal: inv.subtotal,
        cgstAmount: inv.cgstAmount,
        sgstAmount: inv.sgstAmount,
        igstAmount: inv.igstAmount || 0,
        totalAmount: inv.totalAmount,
        amountInWords: "",
        notes: editData?.notes || inv.notes,
        terms: inv.terms,
        status: "draft",
      };
      const company: CompanyInfo | null = inv.company ? {
        companyName: inv.company.companyName,
        address: inv.company.address,
        phone: inv.company.phone,
        email: inv.company.email,
        logoUrl: inv.company.logoUrl,
        gstin: inv.company.gstin,
        pan: inv.company.pan,
        bankName: inv.company.bankName,
        accountNo: inv.company.accountNo,
        ifsc: inv.company.ifsc,
        upiId: inv.company.upiId,
      } : null;
      await generateInvoicePDF(pdfInvoice, company, { download: true });
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  const handleWhatsApp = () => {
    if (!inv) return;
    const clientPhone = inv.client?.phone || "";
    const msg = encodeURIComponent(
      `Hi ${inv.client?.name || ""},\n\nYour invoice ${editData?.invoiceNumber || inv.invoiceNumber} for \u20B9${Number(inv.totalAmount).toLocaleString("en-IN")} has been generated.\n\nThank you for your business!\n- ${inv.company?.companyName || ""}`,
    );
    const phoneClean = clientPhone.replace(/\D/g, "");
    const whatsappUrl = phoneClean
      ? `https://wa.me/${phoneClean.startsWith("91") ? phoneClean : "91" + phoneClean}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(whatsappUrl, "_blank");
  };

  // MobileSheet handles scroll lock, backdrop, animation, focus trap
  return (
    <MobileSheet
      open={open && !!invoiceData && !!inv}
      onClose={onClose}
      maxWidth="640px"
      zIndex={Z.MODAL}
    >
      {inv && (
        <>
          {/* Header */}
          <div style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--overlay-border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "rgba(16,185,129,0.08)",
                border: "1px solid var(--overlay-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <FileText size={18} style={{ color: "#16a34a" }} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--overlay-text-primary)", margin: 0 }}>
                  Invoice Preview
                </h3>
                <p style={{ fontSize: 13, color: "var(--overlay-text-secondary)", margin: "2px 0 0" }}>
                  {editData?.invoiceNumber || inv.invoiceNumber}
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "transparent",
                border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--overlay-text-muted)",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--overlay-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <X size={16} />
            </motion.button>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {/* Invoice Summary Card */}
            <div style={{
              background: "var(--overlay-card-bg)",
              border: "1px solid var(--overlay-border)",
              borderRadius: 16, padding: 20, marginBottom: 20,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 500, color: "var(--overlay-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Bill To</p>
                  {/* Client name — financial context, KEEP semibold */}
                  <p style={{ fontSize: 16, fontWeight: 600, color: "var(--overlay-text-primary)", margin: "4px 0 0" }}>{inv.client?.name || "Client"}</p>
                  {inv.client?.address && <p style={{ fontSize: 12, color: "var(--overlay-text-secondary)", margin: "2px 0 0" }}>{inv.client.address}</p>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 11, fontWeight: 500, color: "var(--overlay-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Total</p>
                  {/* Invoice total — financial KPI, KEEP strong */}
                  <p style={{ fontSize: 22, fontWeight: 600, color: "#16a34a", margin: "4px 0 0" }}>{"\u20B9"}{Number(inv.totalAmount).toLocaleString("en-IN")}</p>
                </div>
              </div>
              {/* Items */}
              <div style={{
                background: "var(--overlay-card-bg)",
                borderRadius: 10, overflow: "hidden",
                border: "1px solid var(--overlay-border)",
              }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 60px 80px 90px",
                  padding: "8px 12px",
                  background: "var(--overlay-hover)",
                  fontSize: 10, fontWeight: 600, color: "var(--overlay-text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  <span>Item</span>
                  <span style={{ textAlign: "right" }}>Qty</span>
                  <span style={{ textAlign: "right" }}>Rate</span>
                  <span style={{ textAlign: "right" }}>Amount</span>
                </div>
                {(inv.items || []).map((item: any, i: number) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1fr 60px 80px 90px",
                    padding: "10px 12px",
                    borderTop: "1px solid var(--overlay-border)",
                    fontSize: 13, color: "var(--overlay-text-primary)",
                  }}>
                    <span style={{ fontWeight: 500 }}>{item.description}</span>
                    <span style={{ textAlign: "right", color: "var(--overlay-text-muted)" }}>{item.quantity} {item.unit}</span>
                    <span style={{ textAlign: "right", color: "var(--overlay-text-muted)" }}>{"\u20B9"}{Number(item.rate).toLocaleString("en-IN")}</span>
                    {/* Line amount — numeric hierarchy, KEEP semibold */}
                    <span style={{ textAlign: "right", fontWeight: 600 }}>{"\u20B9"}{Number(item.amount).toLocaleString("en-IN")}</span>
                  </div>
                ))}
                {/* Totals */}
                <div style={{ borderTop: "1px solid var(--overlay-border)", padding: "8px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--overlay-text-muted)", marginBottom: 4 }}>
                    <span>Subtotal</span><span>{"\u20B9"}{Number(inv.subtotal).toLocaleString("en-IN")}</span>
                  </div>
                  {inv.cgstAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--overlay-text-muted)", marginBottom: 4 }}>
                      <span>CGST (9%)</span><span>{"\u20B9"}{Number(inv.cgstAmount).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {inv.sgstAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--overlay-text-muted)", marginBottom: 4 }}>
                      <span>SGST (9%)</span><span>{"\u20B9"}{Number(inv.sgstAmount).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {/* Grand total — financial KPI, KEEP strong */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, color: "#16a34a", paddingTop: 6, borderTop: "1px solid var(--overlay-border)" }}>
                    <span>Total</span><span>{"\u20B9"}{Number(inv.totalAmount).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--overlay-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Edit Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "var(--overlay-text-muted)", display: "block", marginBottom: 6 }}>Invoice Date</label>
                  <input
                    type="date"
                    value={editData?.issueDate || ""}
                    onChange={(e) => onEditChange({ ...editData, issueDate: e.target.value })}
                    style={{
                      width: "100%", height: 40, borderRadius: 12,
                      background: "var(--overlay-card-bg)",
                      border: "1px solid var(--overlay-border)",
                      color: "var(--overlay-text-primary)", fontSize: 13, padding: "0 12px",
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "var(--overlay-text-muted)", display: "block", marginBottom: 6 }}>Due Date</label>
                  <input
                    type="date"
                    value={editData?.dueDate || ""}
                    onChange={(e) => onEditChange({ ...editData, dueDate: e.target.value })}
                    style={{
                      width: "100%", height: 40, borderRadius: 12,
                      background: "var(--overlay-card-bg)",
                      border: "1px solid var(--overlay-border)",
                      color: "var(--overlay-text-primary)", fontSize: 13, padding: "0 12px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: "var(--overlay-text-muted)", display: "block", marginBottom: 6 }}>Notes</label>
                <textarea
                  value={editData?.notes || ""}
                  onChange={(e) => onEditChange({ ...editData, notes: e.target.value })}
                  placeholder="Add a note to the invoice..."
                  rows={2}
                  style={{
                    width: "100%", borderRadius: 12,
                    background: "var(--overlay-card-bg)",
                    border: "1px solid var(--overlay-border)",
                    color: "var(--overlay-text-primary)", fontSize: 13, padding: "10px 12px",
                    outline: "none", resize: "vertical",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{
            padding: "12px 24px 20px",
            borderTop: "1px solid var(--overlay-border)",
            display: "flex", gap: 8, flexShrink: 0,
          }}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleDownload}
              style={{
                flex: 1, height: 44, borderRadius: 12,
                background: "#2563EB",
                border: "none",
                color: "#fff",
                fontSize: 14, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.15s ease",
              }}
            >
              <FileText size={16} />
              Download PDF
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleWhatsApp}
              style={{
                flex: 1, height: 44, borderRadius: 12,
                background: "#16a34a",
                border: "none",
                color: "#fff",
                fontSize: 14, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.15s ease",
              }}
            >
              <Send size={16} />
              Send WhatsApp
            </motion.button>
          </div>
        </>
      )}
    </MobileSheet>
  );
}
